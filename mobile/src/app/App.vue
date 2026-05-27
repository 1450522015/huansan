<template>
  <div class="app-root">
    <div class="page">
      <router-view />
    </div>
    <PkDialog />
    <div v-if="store.battleLoading" class="battle-loading-mask">
      <div class="battle-loading-content">
        <div class="spinner"></div>
        <div class="loading-text">{{ store.battleLoadingReason || '正在开启战局...' }}</div>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="showPkErrorDialog" class="pk-error-mask" @click.self="closePkErrorDialog">
        <div class="pk-error-dialog">
          <h3>开启战局失败</h3>
          <p class="pk-error-text">{{ pkErrorMessage }}</p>
          <button class="btn btn-ok" type="button" @click="closePkErrorDialog">确认</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSocketClient } from '@/shared/socket/socketClient.js'
import { useBattleStore } from '@/stores/battleStore.js'
import PkDialog from '@/components/PkDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useBattleStore()
const showPkErrorDialog = ref(false)
const pkErrorMessage = ref('')

const { connect, disconnect, onPkPush: onPkPushEvent, offPkPush: offPkPushEvent } = useSocketClient()

const publicRoutes = new Set([
  'AuthPage',
  'LoginPage',
  'RegisterPage',
  'ResetPasswordPage',
])

function getToken() {
  try { return localStorage.getItem('huansan_token') || '' } catch { return '' }
}

function checkTokenAndConnect() {
  const token = getToken()
  if (!token) {
    disconnect()
    if (!publicRoutes.has(String(route.name || ''))) {
      window.location.hash = '#/login'
    }
    return false
  }
  connect()
  return true
}

function navigateToBattle() {
  router.push({ name: 'battle' })
}

function isInBattlePage() {
  return route.name === 'battle'
}

function handlePkPush(data) {
  if (!data?.success) {
    if (data?.原因 === '不在战局中') {
      store.clearBattle()
      if (isInBattlePage()) {
        router.push('/hall')
      }
      return
    }
    pkErrorMessage.value = data?.原因 || 'PK失败'
    showPkErrorDialog.value = true
    return
  }
  const 不在战局页面 = !isInBattlePage()
  const 已结束 = data.战局?.战局描述?.状态 === '已结束'
  if (不在战局页面) {
    if (已结束) {
      pkErrorMessage.value = data.战局?.战局描述?.战胜方玩家名称
        ? `战局已结束，${data.战局.战局描述.战胜方玩家名称}获胜`
        : '战局已结束'
      showPkErrorDialog.value = true
    } else {
      navigateToBattle()
    }
  }
}

watch(() => store.pkInvitation, (val) => {
  if (val) {
    showPkErrorDialog.value = false
  }
})

function closePkErrorDialog() {
  const 需要跳转 = isBattleExpired.value
  showPkErrorDialog.value = false
  pkErrorMessage.value = ''
  isBattleExpired.value = false
  if (需要跳转) {
    router.push('/hall')
  }
}

function onTokenChange() {
  const token = getToken()
  if (token) {
    connect()
    store.init()
  }
}

let tokenChangeHandler = null

onMounted(() => {
  tokenChangeHandler = onTokenChange
  window.addEventListener('huansan:token-change', tokenChangeHandler)
  store.setNavigateFunctions(navigateToBattle, isInBattlePage)
  onPkPushEvent(handlePkPush)
  checkTokenAndConnect()
  store.init()
})

onUnmounted(() => {
  if (tokenChangeHandler) {
    window.removeEventListener('huansan:token-change', tokenChangeHandler)
  }
  offPkPushEvent(handlePkPush)
  store.destroy()
})
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg, #0f1419);
  color: var(--text, #e8eef5);
}
.page {
  flex: 1;
  padding: 20px 16px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.battle-loading-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.battle-loading-content {
  text-align: center;
  color: #fff;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--accent, #5b9fd4);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}
.pk-error-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3001;
}
.pk-error-dialog {
  background: var(--surface, #1a2030);
  border: 1px solid var(--border, #304455);
  border-radius: 12px;
  padding: 24px;
  min-width: 280px;
  max-width: 80vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.pk-error-dialog h3 {
  margin: 0 0 12px;
  font-size: 18px;
  color: var(--danger, #f07178);
}
.pk-error-text {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--text, #e8eef5);
}
.btn-ok {
  width: 100%;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--accent, #5b9fd4);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>