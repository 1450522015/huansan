import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router/index.js'
import {
  connect as socketConnect,
  disconnect as socketDisconnect,
  useSocketClient,
  emitPkChallenge,
  emitPkResponse,
  emitPkCancel,
  emitPkCheckPending,
  setCurrentOpponent,
  clearPendingPkTarget,
} from '@/shared/socket/socketClient.js'

const PHASES = ['idle', 'waiting', 'challenged', 'rejected', 'battling']

function isValidPhase(p) {
  return PHASES.includes(p)
}

export const useBattleStore = defineStore('battle', () => {
  const phase = ref('idle')
  const opponent = ref('')
  const opponentInfo = ref({ 转数: 0, 等级: 1, 职业串: '' })
  const starterInfo = ref({ 转数: 0, 等级: 1, 职业串: '' })
  const starterName = ref('')
  const rejectReason = ref('')

  const isDialogVisible = computed(() =>
    ['waiting', 'challenged', 'rejected'].includes(phase.value)
  )

  const dialogMode = computed(() => {
    switch (phase.value) {
      case 'waiting': return 'waiting'
      case 'challenged': return 'receiving'
      case 'rejected': return 'rejected'
      default: return ''
    }
  })

  const canPk = computed(() => phase.value === 'idle')

  const inBattle = computed(() => phase.value === 'battling')

  function transition(newPhase) {
    if (!isValidPhase(newPhase)) return
    phase.value = newPhase
  }

  function resetPkState() {
    phase.value = 'idle'
    opponent.value = ''
    opponentInfo.value = { 转数: 0, 等级: 1, 职业串: '' }
    starterInfo.value = { 转数: 0, 等级: 1, 职业串: '' }
    starterName.value = ''
    rejectReason.value = ''
    clearPendingPkTarget()
  }

  function challenge(target, info = {}) {
    if (phase.value !== 'idle') return
    opponent.value = target
    opponentInfo.value = {
      转数: info.目标转数 ?? 0,
      等级: info.目标等级 ?? 1,
      职业串: info.目标职业串 ?? '',
    }
    starterInfo.value = {
      转数: info.发起转数 ?? 0,
      等级: info.发起等级 ?? 1,
      职业串: info.发起职业串 ?? '',
    }
    const sent = emitPkChallenge(target)
    if (!sent) {
      resetPkState()
      return
    }
    transition('waiting')
  }

  function challengedBy(starter, info = {}) {
    if (phase.value === 'waiting') {
      if (opponent.value) {
        emitPkCancel(opponent.value)
      }
      resetPkState()
    }
    if (phase.value === 'rejected') {
      resetPkState()
    }
    if (phase.value !== 'idle') return
    starterName.value = starter
    starterInfo.value = {
      转数: info.发起转数 ?? 0,
      等级: info.发起等级 ?? 1,
      职业串: info.发起职业串 ?? '',
    }
    transition('challenged')
  }

  function acceptChallenge() {
    if (phase.value !== 'challenged') return
    const target = starterName.value
    emitPkResponse(target, true)
    setCurrentOpponent(target)
    resetPkState()
    transition('battling')
    router.push({ name: 'battle', query: { opponent: target } })
  }

  function rejectChallenge() {
    if (phase.value !== 'challenged') return
    emitPkResponse(starterName.value, false)
    resetPkState()
  }

  function onOpponentAccepted(data) {
    if (phase.value !== 'waiting') return
    const target = opponent.value
    setCurrentOpponent(target)
    resetPkState()
    transition('battling')
    router.push({ name: 'battle', query: { opponent: target } })
  }

  function onOpponentRejected(reason) {
    if (phase.value !== 'waiting') return
    rejectReason.value = reason || '对方拒绝了挑战'
    transition('rejected')
    clearPendingPkTarget()
  }

  function cancelChallenge() {
    if (phase.value !== 'waiting') return
    if (opponent.value) {
      emitPkCancel(opponent.value)
    }
    resetPkState()
  }

  function confirmRejected() {
    if (phase.value !== 'rejected') return
    resetPkState()
  }

  function onOpponentCancelled() {
    if (phase.value === 'challenged') {
      resetPkState()
    }
  }

  function onBattleEnd() {
    resetPkState()
    checkPendingPk()
  }

  function onSocketDisconnect() {
    if (phase.value === 'waiting') {
      resetPkState()
    }
  }

  function onPkResultFromServer(data) {
    if (!data) return
    if (data.同意) {
      onOpponentAccepted(data)
    } else {
      onOpponentRejected(data.原因)
    }
  }

  function onPkRequestFromServer(data) {
    if (!data) return
    challengedBy(data.发起用户名, {
      发起转数: data.发起转数,
      发起等级: data.发起等级,
      发起职业串: data.发起职业串,
    })
  }

  function onPkSentFromServer(data) {
    if (!data) return
    if (phase.value !== 'waiting') return
    opponentInfo.value = {
      转数: data.目标转数 ?? opponentInfo.value.转数,
      等级: data.目标等级 ?? opponentInfo.value.等级,
      职业串: data.目标职业串 ?? opponentInfo.value.职业串,
    }
    starterInfo.value = {
      转数: data.发起转数 ?? starterInfo.value.转数,
      等级: data.发起等级 ?? starterInfo.value.等级,
      职业串: data.发起职业串 ?? starterInfo.value.职业串,
    }
  }

  function onPkCancelFromServer(data) {
    if (!data) return
    if (phase.value === 'challenged' && data.发起用户名 === starterName.value) {
      resetPkState()
    }
  }

  let socketsBound = false
  let pendingCheckTimer = null

  function checkPendingPk() {
    if (phase.value === 'idle') {
      emitPkCheckPending()
    }
  }

  function startPendingCheck() {
    stopPendingCheck()
    checkPendingPk()
    pendingCheckTimer = setInterval(checkPendingPk, 5000)
  }

  function stopPendingCheck() {
    if (pendingCheckTimer) {
      clearInterval(pendingCheckTimer)
      pendingCheckTimer = null
    }
  }

  function bindSocketListeners() {
    if (socketsBound) return
    const {
      onPkResult,
      onPkRequest,
      onPkSent,
      onPkCancel,
    } = useSocketClient()

    onPkResult(onPkResultFromServer)
    onPkRequest(onPkRequestFromServer)
    onPkSent(onPkSentFromServer)
    onPkCancel(onPkCancelFromServer)
    socketsBound = true
  }

  function init() {
    socketConnect()
    bindSocketListeners()
    startPendingCheck()
  }

  function destroy() {
    socketDisconnect()
    stopPendingCheck()
    socketsBound = false
  }

  return {
    phase,
    opponent,
    opponentInfo,
    starterInfo,
    starterName,
    rejectReason,
    isDialogVisible,
    dialogMode,
    canPk,
    inBattle,
    challenge,
    acceptChallenge,
    rejectChallenge,
    cancelChallenge,
    confirmRejected,
    onBattleEnd,
    onSocketDisconnect,
    init,
    destroy,
  }
})
