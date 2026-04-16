<template>
  <div class="battles-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">战局管理</h1>
        <p class="sub">查看所有 PK 战局状态与进度</p>
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
          <label for="bm-status">战局状态</label>
          <select id="bm-status" v-model="statusFilter" class="inp" @change="search">
            <option value="all">全部</option>
            <option value="等待中">等待中</option>
            <option value="战局中">战局中</option>
            <option value="已结束">已结束</option>
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
              <th class="col-id">ID</th>
              <th>发起人</th>
              <th>目标人</th>
              <th>发起时间</th>
              <th>状态</th>
              <th>回合数</th>
              <th>备注</th>
              <th class="col-detail">详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="row-loading">
              <td colspan="8">
                <div class="loading-cell">
                  <span class="spinner" aria-hidden="true" />
                  <span>加载中…</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!list.length" class="row-empty">
              <td colspan="8">
                <div class="empty-inner">
                  <span class="empty-title">暂无数据</span>
                  <span class="empty-hint">调整筛选条件或稍后再试</span>
                </div>
              </td>
            </tr>
            <tr v-for="row in list" v-else :key="row.id" class="data-row">
              <td class="td-muted td-id">{{ row.id }}</td>
              <td class="td-user">{{ row.发起用户名 }}</td>
              <td class="td-user">{{ row.目标用户名 }}</td>
              <td class="td-muted">{{ fmtTime(row.发起时间) }}</td>
              <td>
                <span class="badge" :class="statusBadge(row.状态).cls">{{ statusBadge(row.状态).text }}</span>
              </td>
              <td class="td-muted">{{ row.回合数 ?? 0 }}</td>
              <td class="td-muted">{{ row.备注 || '—' }}</td>
              <td class="td-detail">
                <template v-if="row.状态 === '战局中'">
                  第 {{ row.当前回合 }} 回合
                </template>
                <template v-else-if="row.状态 === '已结束'">
                  {{ fmtTime(row.结束时间) }}
                </template>
                <template v-else>—</template>
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { http } from '@/api/http.js'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const error = ref('')
const statusFilter = ref('all')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function statusBadge(状态) {
  switch (状态) {
    case '等待中': return { text: '等待中', cls: 'badge-waiting' }
    case '战局中': return { text: '战局中', cls: 'badge-fighting' }
    case '已结束': return { text: '已结束', cls: 'badge-ended' }
    default: return { text: 状态, cls: '' }
  }
}

function search() {
  page.value = 1
  load()
}

function resetFilters() {
  statusFilter.value = 'all'
  page.value = 1
  load()
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value && statusFilter.value !== 'all') params.状态 = statusFilter.value
    const { data } = await http.get('/api/admin/battles', { params })
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

onMounted(load)
</script>

<style scoped>
.battles-page {
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
.col-detail { min-width: 140px; }

.grid tbody tr.data-row:hover { background: #f8fafc; }
.grid tbody tr:last-child td { border-bottom: none; }

.td-user { font-weight: 500; }
.td-muted {
  color: var(--text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.td-id { font-variant-numeric: tabular-nums; }
.td-detail {
  font-size: 13px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

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
  animation: bm-spin 0.7s linear infinite;
}

@keyframes bm-spin { to { transform: rotate(360deg); } }

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

/* 状态 badge */
.grid .badge {
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.02em;
  border-radius: 6px;
  font-weight: 600;
}

.badge-waiting {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.badge-fighting {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.badge-ended {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.badge-lost {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

/* 分页 */
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

.dot { margin: 0 6px; opacity: 0.35; }

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
</style>
