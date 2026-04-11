<template>
  <div class="page">
    <h2>更多</h2>
    <div class="card">
      <button class="btn danger" type="button" @click="logout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { clearSession } from '@/shared/auth/storage.js'

const router = useRouter()

function logout() {
  clearSession()
  router.replace({ name: 'login' })
}
</script>

<style scoped>
h2 {
  margin-top: 0;
}
</style>
