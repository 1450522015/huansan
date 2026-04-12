<template>
  <div class="users-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">用户管理</h1>
        <p class="sub">查询、筛选与维护账号密码</p>
      </div>
      <div class="head-stat" v-if="!loading">
        <span class="stat-num">{{ total }}</span>
        <span class="stat-label">条记录</span>
      </div>
      <div class="head-stat muted" v-else>加载中…</div>
    </header>

    <section class="toolbar" aria-label="筛选条件">
      <div class="toolbar-row">
        <div class="filter">
          <label for="um-keyword">用户名</label>
          <input
            id="um-keyword"
            v-model.trim="keyword"
            type="search"
            class="inp"
            placeholder="支持模糊搜索"
            autocomplete="off"
            @keyup.enter="search"
          />
        </div>
        <div class="filter">
          <label for="um-login">登录状态</label>
          <select id="um-login" v-model="loginFilter" class="inp" @change="search">
            <option value="all">全部</option>
            <option value="never">从未登录</option>
            <option value="today">今日活跃</option>
            <option value="week">7 日内登录</option>
            <option value="month">30 日内登录</option>
            <option value="old">长期未登录</option>
          </select>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-primary btn-pad" @click="search">查询</button>
          <button type="button" class="btn btn-ghost btn-pad" @click="resetFilters">重置</button>
        </div>
      </div>
    </section>

    <p v-if="error" class="alert-error" role="alert">{{ error }}</p>

    <section class="table-shell" :aria-busy="loading">
      <div class="table-scroll">
        <table class="grid">
          <thead>
            <tr>
              <th class="col-user">用户名</th>
              <th>注册时间</th>
              <th>最后登录</th>
              <th>登录状态</th>
              <th class="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="row-loading">
              <td colspan="5">
                <div class="loading-cell">
                  <span class="spinner" aria-hidden="true" />
                  <span>加载中…</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!list.length" class="row-empty">
              <td colspan="5">
                <div class="empty-inner">
                  <span class="empty-title">暂无数据</span>
                  <span class="empty-hint">调整筛选条件或稍后再试</span>
                </div>
              </td>
            </tr>
            <tr v-for="row in list" v-else :key="row.id" class="data-row">
              <td class="td-user">
                <span class="user-name">{{ row.用户名 }}</span>
              </td>
              <td class="td-muted">{{ fmtTime(row.创建时间) }}</td>
              <td class="td-muted">{{ row.最近登录时间 ? fmtTime(row.最近登录时间) : '—' }}</td>
              <td>
                <span class="badge" :class="loginBadge(row.最近登录时间).cls">{{
                  loginBadge(row.最近登录时间).text
                }}</span>
              </td>
              <td>
                <button type="button" class="btn-action" @click="openPwd(row)">修改密码</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer class="pager">
      <div class="pager-info">
        <span>第 <strong>{{ page }}</strong> / {{ totalPages }} 页</span>
        <span class="dot">·</span>
        <span>共 {{ total }} 条</span>
      </div>
      <div class="pager-ctrl">
        <label class="page-size-label">
          每页
          <select v-model.number="pageSize" class="inp inp-compact" @change="page = 1; load()">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button type="button" class="nav-btn" :disabled="page <= 1" @click="prev">上一页</button>
        <button type="button" class="nav-btn" :disabled="page >= totalPages" @click="next">下一页</button>
      </div>
    </footer>

    <div v-if="pwdUser" class="modal-backdrop" @click.self="pwdUser = null">
      <div class="modal modal-refine" role="dialog" aria-modal="true" aria-labelledby="pwd-title">
        <div class="modal-head">
          <div class="avatar" aria-hidden="true">{{ pwdAvatar }}</div>
          <div>
            <h3 id="pwd-title" class="modal-title">修改密码</h3>
            <p class="modal-user">{{ pwdUser.用户名 }}</p>
          </div>
        </div>
        <p v-if="pwdError" class="msg-error">{{ pwdError }}</p>
        <div class="modal-field">
          <label for="np1">新密码</label>
          <input id="np1" v-model="newPwd" type="password" autocomplete="new-password" maxlength="20" class="inp" />
        </div>
        <div class="modal-field">
          <label for="np2">确认密码</label>
          <input id="np2" v-model="newPwd2" type="password" autocomplete="new-password" maxlength="20" class="inp" />
        </div>
        <p class="field-hint">长度 1–20 位，不允许 &lt; &gt; ' " &amp; 等字符</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost btn-pad" @click="pwdUser = null">取消</button>
          <button type="button" class="btn btn-primary btn-pad" :disabled="pwdLoading" @click="submitPwd">
            {{ pwdLoading ? '保存中…' : '保存' }}
          </button>
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
const keyword = ref('')
const loginFilter = ref('all')

const pwdUser = ref(null)
const newPwd = ref('')
const newPwd2 = ref('')
const pwdError = ref('')
const pwdLoading = ref(false)

const pwdAvatar = computed(() => {
  const u = pwdUser.value?.用户名
  if (!u) return '?'
  return String(u).slice(0, 1)
})

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

function listParams() {
  const p = { page: page.value, pageSize: pageSize.value }
  if (keyword.value) p.keyword = keyword.value
  if (loginFilter.value && loginFilter.value !== 'all') p.login = loginFilter.value
  return p
}

function search() {
  page.value = 1
  load()
}

function resetFilters() {
  keyword.value = ''
  loginFilter.value = 'all'
  page.value = 1
  load()
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/api/admin/users', {
      params: listParams(),
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

<style scoped>
.users-page {
  max-width: 1120px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.head-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}

.head-stat.muted {
  color: var(--text-muted);
  background: #f8fafc;
  border-color: var(--border);
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

.toolbar {
  margin-bottom: 16px;
  padding: 16px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px 20px;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  flex: 1;
}

.filter label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: none;
}

.inp {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.inp:hover {
  border-color: #cbd5e1;
}

.inp:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.inp-compact {
  width: auto;
  min-width: 64px;
  padding: 6px 10px;
  display: inline-block;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  padding-bottom: 1px;
}

.btn-pad {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
}

.btn-ghost {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btn-ghost:hover {
  background: #f8fafc;
  color: var(--text);
  border-color: #cbd5e1;
}

.alert-error {
  margin: 0 0 14px;
  padding: 10px 14px;
  font-size: 13px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.table-shell {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.grid th,
.grid td {
  text-align: left;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.grid thead th {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.col-user {
  min-width: 120px;
}

.col-action {
  width: 112px;
  text-align: right;
}

.grid tbody tr.data-row:hover {
  background: #f8fafc;
}

.grid tbody tr:last-child td {
  border-bottom: none;
}

.td-user {
  font-weight: 500;
}

.user-name {
  color: var(--text);
}

.td-muted {
  color: var(--text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.row-loading td,
.row-empty td {
  text-align: center;
  padding: 40px 18px;
  color: var(--text-muted);
  border-bottom: none;
}

.loading-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: um-spin 0.7s linear infinite;
}

@keyframes um-spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.empty-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.btn-action {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  border: 1px solid rgba(37, 99, 235, 0.35);
  background: #fff;
  color: var(--primary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-action:hover {
  background: #eff6ff;
  border-color: var(--primary);
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  padding: 14px 4px 0;
  font-size: 13px;
  color: var(--text-muted);
}

.pager-info strong {
  color: var(--text);
  font-weight: 600;
}

.dot {
  margin: 0 6px;
  opacity: 0.35;
}

.pager-ctrl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.page-size-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.nav-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 弹窗 */
.modal-refine {
  max-width: 420px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
}

.modal-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px;
  background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
  border-bottom: 1px solid var(--border);
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(145deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.modal-user {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.modal-refine .msg-error {
  margin: 16px 22px 0;
}

.modal-field {
  padding: 0 22px;
  margin-top: 14px;
}

.modal-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.modal-field .inp {
  box-sizing: border-box;
}

.field-hint {
  margin: 10px 22px 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px 22px 22px;
  margin-top: 8px;
}

/* 与全局 badge 协调：略加厚边框感 */
.grid .badge {
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.02em;
}
</style>
