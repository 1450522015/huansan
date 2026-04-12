<template>
  <div class="page">
    <h2>登录 / 注册</h2>
    <p class="hint">用户名与密码 1–20 位；用户名仅中文、字母、数字、下划线。</p>
    <div class="field">
      <label>用户名</label>
      <input v-model="用户名" type="text" autocomplete="username" maxlength="20" />
    </div>
    <div class="field">
      <label>密码</label>
      <input v-model="密码" type="password" autocomplete="current-password" maxlength="20" />
    </div>
    <div v-if="消息" class="msg error">{{ 消息 }}</div>
    <div class="row" style="margin-top: 12px">
      <button class="btn" type="button" :disabled="loading" @click="onLogin">登录</button>
      <button class="btn secondary" type="button" :disabled="loading" @click="onRegister">注册</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { http } from '@/shared/api/http.js'
import { saveSession, getToken, getStoredCredentials } from '@/shared/auth/storage.js'

const router = useRouter()
const route = useRoute()
const 用户名 = ref('')
const 密码 = ref('')
const 消息 = ref('')
const loading = ref(false)

function afterAuthRedirect() {
  const r = route.query.redirect
  let path = '/'
  if (typeof r === 'string' && r.length > 0) {
    if (r.startsWith('/') && !r.startsWith('//')) path = r
    else if (r.startsWith('#/')) path = r.slice(1)
  }
  return router.replace(path)
}

onMounted(() => {
  const { 用户名: u, 密码: p } = getStoredCredentials()
  if (u) 用户名.value = u
  if (p) 密码.value = p
  if (getToken()) afterAuthRedirect()
})

async function onLogin() {
  消息.value = ''
  loading.value = true
  try {
    const { data } = await http.post('/api/login', {
      用户名: 用户名.value,
      密码: 密码.value,
    })
    saveSession({ token: data.token, 用户名: 用户名.value, 密码: 密码.value })
    await afterAuthRedirect()
  } catch (e) {
    消息.value = e?.response?.data?.错误 || '登录失败'
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  消息.value = ''
  loading.value = true
  try {
    const { data } = await http.post('/api/register', {
      用户名: 用户名.value,
      密码: 密码.value,
    })
    saveSession({ token: data.token, 用户名: 用户名.value, 密码: 密码.value })
    await afterAuthRedirect()
  } catch (e) {
    消息.value = e?.response?.data?.错误 || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
h2 {
  margin-top: 0;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
</style>
