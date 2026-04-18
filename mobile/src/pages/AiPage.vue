<template>
  <div class="page ai-page">
    <div class="ai-header">
      <h2>人机对战</h2>
    </div>

    <div v-if="bannerMsg" class="msg" :class="bannerTone">{{ bannerMsg }}</div>

    <div v-if="loading" class="muted">加载中…</div>
    <div v-else-if="list.length === 0" class="muted">暂无人机，请在后台添加</div>
    <div v-else class="ai-list">
      <div v-for="ai in list" :key="ai.id" class="ai-row card">
        <div class="ai-info">
          <span class="ai-name">{{ ai.名称 }}</span>
          <span class="ai-type" :class="ai.类型 === '大师' ? 'master' : 'dummy'">{{ ai.类型 }}</span>
        </div>
        <button
          class="btn pk-btn"
          type="button"
          :disabled="!store.canPk || starting"
          @click="onStartAi(ai)"
        >
          {{ starting ? '…' : 'PK' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/shared/api/http.js'
import { useBattleStore } from '@/stores/battleStore.js'

const router = useRouter()
const store = useBattleStore()

const list = ref([])
const loading = ref(false)
const starting = ref(false)
const bannerMsg = ref('')
const bannerTone = ref('ok')

async function fetchList() {
  loading.value = true
  try {
    const { data } = await http.get('/api/battle/ai-opponents')
    list.value = data.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function onStartAi(ai) {
  if (!store.canPk || starting.value) return
  starting.value = true
  bannerMsg.value = ''
  try {
    const { data } = await http.post('/api/battle/ai-start', { 人机ID: ai.id })
    if (data.ok) {
      store.onBattleEnd()
      store.phase = 'battling'
      store.opponent = ai.名称 + '(电脑)'
      router.push({ name: 'battle', query: { opponent: ai.名称 + '(电脑)' } })
    } else {
      bannerMsg.value = data.错误 || '创建战局失败'
      bannerTone.value = 'error'
    }
  } catch (e) {
    bannerMsg.value = e?.response?.data?.错误 || '创建战局失败'
    bannerTone.value = 'error'
  } finally {
    starting.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.ai-header {
  margin-bottom: 16px;
}
.ai-header h2 {
  margin: 0;
  font-size: 20px;
}
.ai-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.ai-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-name {
  font-size: 16px;
  font-weight: 600;
}
.ai-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.ai-type.dummy {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
}
.ai-type.master {
  background: rgba(168,85,247,0.15);
  color: #a855f7;
}
.pk-btn {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  background: var(--danger, #f07178);
  color: #fff;
}
.pk-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.muted {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted, #8b9cb3);
  font-size: 14px;
}
.msg {
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}
.msg.ok { background: rgba(34,197,94,0.12); color: #4ade80; }
.msg.error { background: rgba(239,68,68,0.12); color: #f87171; }
</style>
