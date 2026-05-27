<template>
  <div class="page">
    <h2>更多</h2>
    <div class="card">
      <button class="btn" type="button" @click="goToBattle">战局调试</button>
    </div>
    <div class="card">
      <button class="btn danger" type="button" @click="logout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { clearTokenOnly } from '@/shared/auth/storage.js'
import { resetLocalConfigStore } from '@/shared/config/usePlayerConfig.js'
import { useSocketClient } from '@/shared/socket/socketClient.js'

const router = useRouter()

function goToBattle() {
  router.push('/battle')
}

function logout() {
  const { 发退出登录, setManualOffline } = useSocketClient()
  发退出登录()
  setTimeout(() => {
    setManualOffline()
    clearTokenOnly()
    resetLocalConfigStore()
    router.replace({ name: 'login' })
  }, 200)
}
</script>

<style scoped>
h2 {
  margin-top: 0;
}

.btn {
  width: 100%;
  margin-top: 8px;
}
</style>
