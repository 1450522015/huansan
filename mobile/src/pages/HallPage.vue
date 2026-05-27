<template>
  <div class="page hall">
    <div class="hall-header">
      <h2>大厅</h2>
      <span class="online-count">在线 {{ onlineUsers.length }} 人</span>
    </div>

    <div v-if="connectionStatus !== 'online'" class="offline-tip">
      {{ connectionStatus === 'connecting' ? '正在连接…' : '已离线' }}
    </div>

    <template v-else>
      <div class="search-bar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索用户名"
        />
      </div>

      <div class="card user-list-card">
        <div v-if="displayUsers.length === 0" class="muted">暂无用户</div>
        <div v-else class="user-list">
          <div v-for="u in displayUsers" :key="u.用户名" class="user-row">
            <div class="user-info">
              <span class="user-name">{{ u.用户名 }}</span>
              <span class="user-meta">{{ u.转数 }}转{{ u.等级 }}级 · {{ u.职业串 }} · {{ u.坐骑名 }}</span>
            </div>
            <button
              v-if="u.用户名 !== 当前用户名"
              class="btn pk-btn"
              type="button"
              :disabled="!canPkUser(u)"
              @click="onPk(u.用户名)"
            >
              {{ pkButtonText(u.用户名) }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSocketClient } from '@/shared/socket/socketClient.js'
import { useBattleStore } from '@/stores/battleStore.js'

const {
  connectionStatus,
  onlineList,
  connect,
} = useSocketClient()

const store = useBattleStore()

const keyword = ref('')

const 当前用户名 = computed(() => {
  try { return localStorage.getItem('huansan_用户名') || '' } catch { return '' }
})

const onlineUsers = computed(() => onlineList.value)

const displayUsers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return onlineUsers.value
  return onlineUsers.value.filter(u => u.用户名.toLowerCase().includes(kw))
})

const 全局战局中 = computed(() => {
  return store.battleSnapshot?.战局描述?.状态 === '战局中'
})

function canPkUser(u) {
  if (全局战局中.value) return false
  if (store.sentPkRequest?.目标用户名) return false
  return u.战斗状态 === '空闲'
}

function pkButtonText(用户名) {
  if (用户名 === 当前用户名.value) return ''
  if (store.sentPkRequest?.目标用户名 === 用户名) return '已邀请'
  const u = onlineUsers.value.find(x => x.用户名 === 用户名)
  if (u?.战斗状态 === '战局中') return '战局中'
  return 'PK'
}

function onPk(目标用户名) {
  if (!canPkUser({ 用户名: 目标用户名, 战斗状态: '空闲' })) return
  store.challenge(目标用户名)
}

onMounted(() => {
  if (connectionStatus.value === 'offline' || connectionStatus.value === 'connecting') {
    connect()
  }
})
</script>

<style scoped>
.hall-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.hall-header h2 {
  margin: 0;
  font-size: 20px;
}
.online-count {
  font-size: 13px;
  color: #7fd99a;
  font-weight: 600;
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
.btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  min-width: 60px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.pk-btn {
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
</style>