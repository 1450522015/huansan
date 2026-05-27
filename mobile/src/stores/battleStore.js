import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSocket } from '@/shared/socket/socketClient.js'
import { useSocketClient } from '@/shared/socket/socketClient.js'

export const useBattleStore = defineStore('battle', () => {
  const battleSnapshot = ref(null)
  const pkInvitation = ref(null)
  const sentPkRequest = ref(null)
  const battleLoading = ref(false)
  const battleLoadingReason = ref('')

  const myUsername = computed(() => localStorage.getItem('huansan_用户名') || '')

  const 我是红方 = computed(() => {
    if (!battleSnapshot.value) return true
    return battleSnapshot.value.战局描述?.红方用户名 === myUsername.value
  })

  const 我方已出招 = computed(() => {
    if (!battleSnapshot.value) return false
    if (我是红方.value) return battleSnapshot.value._红方已出招 ?? false
    return battleSnapshot.value._黑方已出招 ?? false
  })

  const 战局描述 = computed(() => battleSnapshot.value?.战局描述)
  const 战局已结束 = computed(() => battleSnapshot.value?.战局描述?.状态 === '已结束')

  let navigateToBattleFn = null
  let isInBattlePageFn = null

  function doEmit(event, data) {
    const sock = getSocket()
    console.log('[battleStore.doEmit]', event, 'socket=', !!sock, 'connected=', sock?.connected)
    if (sock && sock.connected) {
      sock.emit(event, data)
    } else {
      console.error('[battleStore.doEmit] socket not connected!')
    }
  }

  function handlePkPush(data) {
    if (!data?.success) {
      if (battleLoading.value) {
        battleLoadingReason.value = data?.原因 || 'PK失败'
        battleLoading.value = false
      }
      if (data?.原因 === '不在战局中') {
        battleSnapshot.value = null
        sentPkRequest.value = null
      }
      return
    }

    battleLoading.value = false
    battleLoadingReason.value = ''

    const snapshot = data.战局
    const 已出招 = data.已出招 ?? false
    const 红方用户名 = snapshot.战局描述?.红方用户名
    const isRed = 红方用户名 === myUsername.value

    const newSnapshot = {
      ...snapshot,
      是红方: isRed,
      _红方已出招: false,
      _黑方已出招: false,
    }

    battleSnapshot.value = newSnapshot
  }

  function handlePkInvite(data) {
    console.log('[battleStore] handlePkInvite:', data)
    if (battleLoading.value) return
    if (isInBattlePageFn && isInBattlePageFn()) return
    if (Array.isArray(data) && data.length > 0) {
      pkInvitation.value = data[0]
    } else if (data && typeof data === 'object') {
      pkInvitation.value = data
    } else {
      pkInvitation.value = null
    }
  }

  function setNavigateFunctions(navigateFn, isInBattleFn) {
    navigateToBattleFn = navigateFn
    isInBattlePageFn = isInBattleFn
  }

  function challenge(目标用户名) {
    console.log('[battleStore] challenge:', 目标用户名)
    if (目标用户名 === myUsername.value) return
    doEmit('pk-request', { 目标用户名 })
    sentPkRequest.value = { 目标用户名 }
    setTimeout(() => {
      if (sentPkRequest.value?.目标用户名 === 目标用户名) {
        sentPkRequest.value = null
      }
    }, 3000)
  }

  function acceptPk(邀请者用户名) {
    doEmit('pk-agree', { 邀请者用户名 })
    battleLoading.value = true
    battleLoadingReason.value = ''
    pkInvitation.value = null
  }

  function rejectPk(邀请者用户名) {
    doEmit('pk-reject', { 邀请者用户名 })
    pkInvitation.value = null
  }

  function dismissPkInvitation() {
    pkInvitation.value = null
  }

  function submitPlan(出招数据) {
    doEmit('pk-plan', 出招数据)
    battleSnapshot.value = {
      ...battleSnapshot.value,
      _红方已出招: 我是红方.value ? true : battleSnapshot.value._红方已出招,
      _黑方已出招: 我是红方.value ? battleSnapshot.value._黑方已出招 : true,
    }
  }

  function fleeBattle() {
    doEmit('pk-plan', { type: 'flee' })
  }

  function clearBattle() {
    battleSnapshot.value = null
    battleLoading.value = false
    battleLoadingReason.value = ''
    sentPkRequest.value = null
  }

  function init() {
    const { onPkPush, offPkPush, onPkInvite, offPkInvite } = useSocketClient()
    onPkPush(handlePkPush)
    onPkInvite(handlePkInvite)
  }

  function destroy() {
    const { offPkPush, offPkInvite } = useSocketClient()
    offPkPush(handlePkPush)
    offPkInvite(handlePkInvite)
  }

  return {
    battleSnapshot,
    pkInvitation,
    sentPkRequest,
    battleLoading,
    battleLoadingReason,
    myUsername,
    我是红方,
    我方已出招,
    战局描述,
    战局已结束,
    challenge,
    acceptPk,
    rejectPk,
    dismissPkInvitation,
    submitPlan,
    fleeBattle,
    clearBattle,
    setNavigateFunctions,
    init,
    destroy,
  }
})
