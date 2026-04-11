<template>
  <div class="card">
    <h2 style="margin-top: 0">用户管理</h2>
    <p v-if="error" class="msg-error">{{ error }}</p>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>用户名</th>
            <th>注册时间</th>
            <th>最后登录</th>
            <th>登录状态</th>
            <th style="width: 120px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" style="text-align: center; color: var(--text-muted)">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="5" style="text-align: center; color: var(--text-muted)">暂无用户</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.用户名 }}</td>
            <td>{{ fmtTime(row.创建时间) }}</td>
            <td>{{ row.最近登录时间 ? fmtTime(row.最近登录时间) : '—' }}</td>
            <td>
              <span class="badge" :class="loginBadge(row.最近登录时间).cls">{{ loginBadge(row.最近登录时间).text }}</span>
            </td>
            <td>
              <button type="button" class="btn btn-primary" @click="openPwd(row)">修改密码</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <span>共 {{ total }} 条，每页</span>
      <select v-model.number="pageSize" @change="page = 1; load()">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
      <span>条</span>
      <button type="button" :disabled="page <= 1" @click="prev">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <button type="button" :disabled="page >= totalPages" @click="next">下一页</button>
    </div>

    <div v-if="pwdUser" class="modal-backdrop" @click.self="pwdUser = null">
      <div class="modal">
        <h3>修改密码 · {{ pwdUser.用户名 }}</h3>
        <p v-if="pwdError" class="msg-error">{{ pwdError }}</p>
        <div class="field">
          <label>新密码（1–20 位）</label>
          <input v-model="newPwd" type="password" autocomplete="new-password" maxlength="20" />
        </div>
        <div class="field">
          <label>确认密码</label>
          <input v-model="newPwd2" type="password" autocomplete="new-password" maxlength="20" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="pwdUser = null">取消</button>
          <button type="button" class="btn btn-primary" :disabled="pwdLoading" @click="submitPwd">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { http } from '@/api/http.js'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const error = ref('')

const pwdUser = ref(null)
const newPwd = ref('')
const newPwd2 = ref('')
const pwdError = ref('')
const pwdLoading = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function loginBadge(最近登录时间) {
  if (!最近登录时间) {
    return { text: '从未登录', cls: 'badge-never' }
  }
  const t = new Date(最近登录时间).getTime()
  if (Number.isNaN(t)) return { text: '未知', cls: 'badge-never' }
  const now = Date.now()
  const day = 86400000
  if (now - t < day) return { text: '今日活跃', cls: 'badge-today' }
  if (now - t < 7 * day) return { text: '7 日内登录', cls: 'badge-week' }
  if (now - t < 30 * day) return { text: '30 日内登录', cls: 'badge-month' }
  return { text: '长期未登录', cls: 'badge-old' }
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/api/admin/users', {
      params: { page: page.value, pageSize: pageSize.value },
    })
    list.value = data.list || []
    total.value = data.total ?? 0
  } catch (e) {
    error.value = e?.response?.data?.错误 || e.message || '加载失败'
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function prev() {
  if (page.value <= 1) return
  page.value -= 1
  load()
}

function next() {
  if (page.value >= totalPages.value) return
  page.value += 1
  load()
}

function openPwd(row) {
  pwdUser.value = row
  newPwd.value = ''
  newPwd2.value = ''
  pwdError.value = ''
}

watch(pwdUser, (v) => {
  if (!v) {
    newPwd.value = ''
    newPwd2.value = ''
    pwdError.value = ''
  }
})

async function submitPwd() {
  pwdError.value = ''
  if (newPwd.value !== newPwd2.value) {
    pwdError.value = '两次输入的密码不一致'
    return
  }
  if (newPwd.value.length < 1 || newPwd.value.length > 20) {
    pwdError.value = '密码长度须为 1–20'
    return
  }
  pwdLoading.value = true
  try {
    await http.patch(`/api/admin/users/${pwdUser.value.id}/password`, { 新密码: newPwd.value })
    pwdUser.value = null
    await load()
  } catch (e) {
    pwdError.value = e?.response?.data?.错误 || '修改失败'
  } finally {
    pwdLoading.value = false
  }
}

onMounted(load)
</script>
