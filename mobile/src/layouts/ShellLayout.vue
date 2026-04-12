<template>
  <div class="shell">
    <router-view />
    <nav class="tabs">
      <router-link to="/">主页</router-link>
      <router-link to="/hall">大厅</router-link>
      <router-link to="/battle">战局</router-link>
      <router-link to="/channel">频道</router-link>
      <router-link to="/more">更多</router-link>
    </nav>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { getToken } from '@/shared/auth/storage.js'
import { loadPlayerConfig } from '@/shared/config/usePlayerConfig.js'

let socket

onMounted(() => {
  if (!getToken()) return
  loadPlayerConfig()
  const url = typeof window !== 'undefined' && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : ''
  socket = io(url, { transports: ['websocket', 'polling'] })
})

onUnmounted(() => {
  socket?.disconnect()
  socket = undefined
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  padding-bottom: 4px;
}
</style>
