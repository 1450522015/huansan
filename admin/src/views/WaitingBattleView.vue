<template>
  <div class="waiting-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">战局等候列表</h1>
        <p class="sub">查看当前所有 PK 等候记录</p>
      </div>
      <div class="head-stat" v-if="!loading">
        <span class="stat-num">{{ list.length }}</span>
        <span class="stat-label">条等候</span>
      </div>
      <div class="head-stat muted" v-else>加载中…</div>
    </header>

    <section class="toolbar" aria-label="筛选条件">
      <div class="toolbar-row">
        <div class="filter">
          <label for="wb-search">搜索用户名</label>
          <input id="wb-search" class="inp" v-model="keyword" placeholder="发起方或目标方" @input="applyFilter" />
        </div>
        <div class="filter">
          <label for="wb-online">发起方在线</label>
          <select id="wb-online" v-model="onlineFilter" class="inp" @change="applyFilter">
            <option value="all">全部</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
          </select>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-primary btn-pad" @click="load">刷新</button>
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
              <th class="col-id">序号</th>
              <th>发起方</th>
              <th>目标方</th>
              <th>创建时间</th>
              <th>发起方在线</th>
              <th>等候时长</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="row-loading">
              <td colspan="6">
                <div class="loading-cell">
                  <span class="spinner" aria-hidden="true" />
                  <span>加载中…</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!displayList.length" class="row-empty">
              <td colspan="6">
                <div class="empty-inner">
                  <span class="empty-title">暂无数据</span>
                  <span class="empty-hint">当前没有等候中的战局邀请</span>
                </div>
              </td>
            </tr>
            <tr v-for="(row, idx) in displayList" v-else :key="row.唯一id" class="data-row">
              <td class="td-muted td-id">{{ idx + 1 }}</td>
              <td class="td-user">{{ row.发起方用户名 }}</td>
              <td class="td-user">{{ row.目标方用户名 }}</td>
              <td class="td-muted">{{ fmtTime(row.创建时间) }}</td>
              <td>
                <span class="badge" :class="row.发起方在线 ? 'badge-online' : 'badge-offline'">
                  {{ row.发起方在线 ? '在线' : '离线' }}
                </span>
              </td>
              <td class="td-muted">{{ calcWaitTime(row.创建时间) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { http } from '@/api/http.js'

const list = ref([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const onlineFilter = ref('all')

const displayList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let result = list.value

  if (kw) {
    result = result.filter(r =>
      r.发起方用户名.toLowerCase().includes(kw) ||
      r.目标方用户名.toLowerCase().includes(kw)
    )
  }

  if (onlineFilter.value === 'online') {
    result = result.filter(r => r.发起方在线)
  } else if (onlineFilter.value === 'offline') {
    result = result.filter(r => !r.发起方在线)
  }

  return [...result].sort((a, b) => (b.创建时间 || 0) - (a.创建时间 || 0))
})

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function calcWaitTime(ts) {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}秒`
  const min = Math.floor(sec / 60)
  const remainSec = sec % 60
  if (min < 60) return `${min}分${remainSec}秒`
  const hour = Math.floor(min / 60)
  const remainMin = min % 60
  return `${hour}时${remainMin}分`
}

function applyFilter() {
}

function resetFilters() {
  keyword.value = ''
  onlineFilter.value = 'all'
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/api/admin/waiting-battles')
    list.value = data.list || []
  } catch (e) {
    error.value = e?.response?.data?.错误 || e.message || '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.waiting-page {
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
  min-width: 160px;
}

.filter label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
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

.inp:hover { border-color: #cbd5e1; }
.inp:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
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

.table-scroll { overflow-x: auto; }

.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.grid th, .grid td {
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

.col-id { width: 60px; }

.grid tbody tr.data-row:hover { background: #f8fafc; }
.grid tbody tr:last-child td { border-bottom: none; }

.td-user { font-weight: 500; }
.td-muted {
  color: var(--text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.td-id { font-variant-numeric: tabular-nums; }

.row-loading td, .row-empty td {
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
  animation: wb-spin 0.7s linear infinite;
}

@keyframes wb-spin { to { transform: rotate(360deg); } }

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

.grid .badge {
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.02em;
  border-radius: 6px;
  font-weight: 600;
}

.badge-online {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.badge-offline {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
</style>
