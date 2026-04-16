<template>
  <div class="shell">
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component v-if="route.name === 'battle'" :is="Component" key="battle-cache" />
      </keep-alive>
      <component v-if="route.name !== 'battle'" :is="Component" :key="route.fullPath" />
    </router-view>
    <nav class="tabs">
      <router-link to="/">主页</router-link>
      <router-link to="/hall">大厅</router-link>
      <router-link to="/battle">战局</router-link>
      <router-link to="/channel">频道</router-link>
      <router-link to="/more">更多</router-link>
    </nav>

    <PkDialog
      :visible="pkDialogVisible"
      :mode="pkDialogMode"
      :发起用户名="pkData.发起用户名"
      :发起转数="pkData.发起转数"
      :发起等级="pkData.发起等级"
      :发起职业串="pkData.发起职业串"
      :目标用户名="pkData.目标用户名"
      :目标转数="pkData.目标转数"
      :目标等级="pkData.目标等级"
      :目标职业串="pkData.目标职业串"
      @update:visible="pkDialogVisible = $event"
      @accepted="onPkAccepted"
      @rejected="onPkRejected"
      @cancel="onPkCancel"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getToken } from '@/shared/auth/storage.js'
import { loadPlayerConfig } from '@/shared/config/usePlayerConfig.js'
import {
  connect,
  disconnect,
  useSocketClient,
  emitPkCancel,
  emitPkResponse,
  setCurrentOpponent,
  clearPendingPkTarget,
} from '@/shared/socket/socketClient.js'
import PkDialog from '@/components/PkDialog.vue'

const router = useRouter()
const {
  onPkResult,
  offPkResult,
  onPkRequest,
  offPkRequest,
  onPkSent,
  offPkSent,
  onPkCancel: onSocketPkCancel,
  offPkCancel: offSocketPkCancel,
  currentOpponent,
} = useSocketClient()

const pkDialogVisible = ref(false)
const pkDialogMode = ref('')
const pkSending = ref('')
const pkData = ref({
  发起用户名: '',
  发起转数: 0,
  发起等级: 1,
  发起职业串: '',
  目标用户名: '',
  目标转数: 0,
  目标等级: 1,
  目标职业串: '',
})

function handlePkResult(data) {
  pkSending.value = ''
  clearPendingPkTarget()
  pkDialogVisible.value = false
  pkDialogMode.value = ''
  if (!data) return
  if (data.同意) {
    const opponent = data.目标用户名 || ''
    setCurrentOpponent(opponent)
    router.push({ name: 'battle', query: { opponent } })
  }
}

function handlePkRequest(data) {
  if (!data) return
  if (pkDialogMode.value === 'waiting') {
    pkDialogVisible.value = false
    pkDialogMode.value = ''
    pkSending.value = ''
  }
  pkData.value = {
    发起用户名: data.发起用户名 || '',
    发起转数: data.发起转数 ?? 0,
    发起等级: data.发起等级 ?? 1,
    发起职业串: data.发起职业串 ?? '',
    目标用户名: '',
    目标转数: 0,
    目标等级: 1,
    目标职业串: '',
  }
  pkDialogMode.value = 'receiving'
  pkDialogVisible.value = true
}

function handlePkSent(data) {
  if (!data) return
  let 我 = ''
  try {
    我 = localStorage.getItem('huansan_用户名') || ''
  } catch {
    /* ignore */
  }
  pkData.value = {
    ...pkData.value,
    发起用户名: 我,
    目标用户名: data.目标用户名 ?? '',
    目标转数: data.目标转数 ?? 0,
    目标等级: data.目标等级 ?? 1,
    目标职业串: data.目标职业串 ?? '',
    发起转数: data.发起转数 ?? pkData.value.发起转数,
    发起等级: data.发起等级 ?? pkData.value.发起等级,
    发起职业串: data.发起职业串 ?? pkData.value.发起职业串,
  }
  pkDialogMode.value = 'waiting'
  pkDialogVisible.value = true
}

function handlePkCancel(data) {
  const 发起方 = data?.发起用户名
  if (pkDialogMode.value === 'receiving' && 发起方 === pkData.value.发起用户名) {
    pkDialogVisible.value = false
    pkDialogMode.value = ''
  }
}

function onPkAccepted() {
  emitPkResponse(pkData.value.发起用户名, true)
  pkDialogVisible.value = false
  pkDialogMode.value = ''
  setCurrentOpponent(pkData.value.发起用户名)
  router.push({ name: 'battle', query: { opponent: pkData.value.发起用户名 } })
}

function onPkRejected() {
  emitPkResponse(pkData.value.发起用户名, false)
  pkDialogVisible.value = false
  pkDialogMode.value = ''
}

function onPkCancel() {
  if (pkData.value.目标用户名) {
    emitPkCancel(pkData.value.目标用户名)
  }
  pkDialogVisible.value = false
  pkDialogMode.value = ''
  pkSending.value = ''
}

onMounted(() => {
  if (!getToken()) return
  loadPlayerConfig()
  connect()
  onPkResult(handlePkResult)
  onPkRequest(handlePkRequest)
  onPkSent(handlePkSent)
  onSocketPkCancel(handlePkCancel)
})

onUnmounted(() => {
  offPkResult(handlePkResult)
  offPkRequest(handlePkRequest)
  offPkSent(handlePkSent)
  offSocketPkCancel(handlePkCancel)
  disconnect()
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  padding-bottom: 4px;
}
</style>
