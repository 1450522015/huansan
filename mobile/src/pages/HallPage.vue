<template>
  <div class="page hall">
    <div class="hall-header">
      <h2>大厅</h2>
      <div class="header-right">
        <span class="online-count">在线 {{ onlineCount }} 人</span>
        <div class="status-switch" :class="connectionStatus">
          <span class="status-dot" />
          <span class="status-label">{{ 状态文案 }}</span>
          <button
            class="toggle-btn"
            type="button"
            @click="onToggleStatus"
          >
            {{ connectionStatus === 'offline' ? '上线' : '下线' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="bannerMsg" class="msg" :class="bannerTone">{{ bannerMsg }}</div>

    <div v-if="connectionStatus !== 'online'" class="offline-tip">
      {{ connectionStatus === 'offline' ? '已离线，不显示在大厅' : '正在连接…' }}
    </div>

    <template v-else>
      <div class="search-bar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索用户名"
          @input="onSearchDebounced"
        />
      </div>

      <div class="card user-list-card">
        <div v-if="loading && list.length === 0" class="muted">加载中…</div>
        <div v-else-if="list.length === 0" class="muted">暂无用户</div>
        <div v-else class="user-list">
          <div v-for="u in list" :key="u.id" class="user-row">
            <div class="user-info">
              <span class="user-name">{{ u.用户名 }}</span>
              <span class="user-meta">{{ u.转数 }}转{{ u.等级 }}级 · {{ u.职业串 }} · {{ u.坐骑名 }}</span>
            </div>
            <button
              v-if="u.用户名 !== 当前用户名"
              class="btn pk-btn"
              type="button"
              :disabled="!canPkUser(u.用户名)"
              @click="onPk(u.用户名)"
            >
              {{ pkButtonText(u.用户名) }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="list.length > 0 && loadingMore" class="muted load-more-tip">加载更多…</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '@/shared/api/http.js'
import {
  useSocketClient,
} from '@/shared/socket/socketClient.js'
import { useBattleStore } from '@/stores/battleStore.js'

const route = useRoute()
const {
  connectionStatus,
  onlineList,
  connect,
  setManualOffline,
  onOnlineChange,
  offOnlineChange,
} = useSocketClient()

const store = useBattleStore()

const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const list = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const bannerMsg = ref('')
const bannerTone = ref('ok')

const activePkBattle = ref(null)

let searchTimer = null

const 当前用户名 = computed(() => {
  try { return localStorage.getItem('huansan_用户名') || '' } catch { return '' }
})

const onlineCount = computed(() => onlineList.value.length)

const 战局中不可PK = computed(() => activePkBattle.value?.状态 === '战局中')

function canPkUser(用户名) {
  if (!store.canPk) return false
  if (战局中不可PK.value) return false
  return true
}

function pkButtonText(用户名) {
  if (store.phase === 'waiting' && store.opponent === 用户名) return '…'
  return 'PK'
}

const 可继续加载 = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return list.value.length < onlineCount.value
  return list.value.length < total.value
})

const 状态文案 = computed(() => {
  switch (connectionStatus.value) {
    case 'online': return '在线'
    case 'connecting': return '连接中'
    default: return '离线'
  }
})

async function refreshPkBattleState() {
  if (connectionStatus.value !== 'online') {
    activePkBattle.value = null
    return
  }
  try {
    const { data } = await http.get('/api/battle/current')
    activePkBattle.value = data?.战局 || null
  } catch {
    activePkBattle.value = null
  }
}

function onToggleStatus() {
  if (connectionStatus.value === 'offline') {
    connect()
  } else {
    setManualOffline()
  }
}

async function fetchList({ append = false } = {}) {
  if (loading.value || loadingMore.value) return
  if (append) loadingMore.value = true
  else loading.value = true
  try {
    const params = { page: page.value, pageSize }
    const kw = keyword.value.trim()
    if (kw) params.keyword = kw
    const { data } = await http.get('/api/hall/users', { params })
    const rows = Array.isArray(data.list) ? data.list : []
    list.value = append ? [...list.value, ...rows] : rows
    total.value = data.total || 0
  } catch (e) {
    bannerMsg.value = e?.response?.data?.错误 || '加载失败'
    bannerTone.value = 'error'
  } finally {
    if (append) loadingMore.value = false
    else loading.value = false
  }
}

function onSearchDebounced() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchList({ append: false })
  }, 350)
}

async function tryLoadMore() {
  if (connectionStatus.value !== 'online') return
  if (!可继续加载.value) return
  page.value += 1
  await fetchList({ append: true })
}

function onPageScroll() {
  if (loading.value || loadingMore.value) return
  const doc = document.documentElement
  const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 80
  if (nearBottom) {
    tryLoadMore()
  }
}

function onPk(目标用户名) {
  if (!canPkUser(目标用户名)) return
  bannerMsg.value = ''
  store.challenge(目标用户名)
  refreshPkBattleState()
}

function handleOnlineChange() {
  if (connectionStatus.value === 'online') {
    page.value = 1
    fetchList({ append: false })
    refreshPkBattleState()
  }
}

watch(connectionStatus, (val) => {
  if (val !== 'online') {
    list.value = []
    total.value = 0
    page.value = 1
    activePkBattle.value = null
  } else {
    page.value = 1
    fetchList({ append: false })
    refreshPkBattleState()
  }
})

watch(
  () => route.path,
  (p) => {
    if (p === '/hall') refreshPkBattleState()
  }
)

watch(() => store.phase, () => {
  if (connectionStatus.value === 'online') refreshPkBattleState()
})

onMounted(() => {
  if (connectionStatus.value === 'online') {
    fetchList({ append: false })
    refreshPkBattleState()
  }
  onOnlineChange(handleOnlineChange)
  window.addEventListener('scroll', onPageScroll, { passive: true })
})

onUnmounted(() => {
  offOnlineChange(handleOnlineChange)
  window.removeEventListener('scroll', onPageScroll)
})
</script>

<style scoped>
.hall-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}
.hall-header h2 {
  margin: 0;
  font-size: 20px;
}
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.online-count {
  font-size: 13px;
  color: #7fd99a;
  font-weight: 600;
}
.status-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted, #8b9cb3);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
}
.status-switch.online .status-dot {
  background: #7fd99a;
}
.status-switch.connecting .status-dot {
  background: #fbbf24;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.status-label {
  min-width: 36px;
}
.toggle-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border, #2a3548);
  border-radius: 4px;
  background: transparent;
  color: var(--muted, #8b9cb3);
  cursor: pointer;
}
.toggle-btn:hover {
  background: var(--surface, #1a2332);
}
.offline-tip {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted, #8b9cb3);
  font-size: 14px;
}
.search-bar {
  margin-bottom: 10px;
}
.search-bar input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border, #2a3548);
  background: #121a26;
  color: var(--text, #e8eef5);
  font-size: 14px;
}
.user-list-card {
  padding: 0;
}
.user-list {
  display: flex;
  flex-direction: column;
}
.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #2a3548);
}
.user-row:last-child {
  border-bottom: none;
}
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.user-name {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-meta {
  font-size: 12px;
  color: var(--muted, #8b9cb3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pk-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  min-width: 60px;
  background: var(--danger, #f07178);
  color: #fff;
}
.pk-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.muted {
  padding: 20px;
  text-align: center;
  color: var(--muted, #8b9cb3);
  font-size: 14px;
}
.load-more-tip {
  padding-top: 10px;
}
</style>
