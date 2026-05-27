<template>
  <div class="ai-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">电脑人机</h1>
        <p class="sub">管理木桩与大师人机配置</p>
      </div>
      <div class="head-stat" v-if="!loading">
        <span class="stat-num">{{ list.length }}</span>
        <span class="stat-label">个人机</span>
      </div>
    </header>

    <section class="add-section card">
      <h2 class="section-title">新增人机</h2>
      <div class="add-form">
        <div class="form-row">
          <label>名称</label>
          <input v-model.trim="newName" type="text" class="inp" placeholder="例如：新手小白" />
        </div>
        <div class="form-row">
          <label>类型</label>
          <select v-model="newType" class="inp">
            <option value="只会攻击">只会攻击</option>
            <option value="只会防御">只会防御</option>
            <option v-for="t in otherTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="form-row full">
          <label>配置（粘贴主页导出的 JSON）</label>
          <textarea v-model="newConfigText" class="inp textarea" rows="6" placeholder='粘贴完整的配置 JSON'></textarea>
        </div>
        <div class="form-actions">
          <button class="btn primary" @click="onAdd" :disabled="adding">{{ adding ? '添加中…' : '添加' }}</button>
        </div>
      </div>
      <div v-if="addError" class="msg error">{{ addError }}</div>
    </section>

    <section class="list-section">
      <div v-if="loading" class="muted">加载中…</div>
      <div v-else-if="list.length === 0" class="muted">暂无人机，请先添加</div>
      <div v-else class="ai-list">
        <div v-for="item in list" :key="item.id" class="ai-row card">
          <div class="ai-info">
            <span class="ai-name">{{ item.名称 }}</span>
            <span class="ai-type" :class="item.类型 === '大师' ? 'master' : 'dummy'">{{ item.类型 }}</span>
          </div>
          <button class="btn danger" @click="onDelete(item)">删除</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { http } from '@/api/http.js'

const list = ref([])
const loading = ref(false)
const adding = ref(false)
const addError = ref('')

const newName = ref('')
const newType = ref('只会攻击')
const newConfigText = ref('')

const KNOWN_TYPES = ['只会攻击', '只会防御']

const otherTypes = ref([])

async function fetchList() {
  loading.value = true
  try {
    const { data } = await http.get('/api/admin/ai-opponents')
    list.value = data.list || []
    const typeSet = new Set(list.value.map(item => item.类型))
    otherTypes.value = [...typeSet].filter(t => !KNOWN_TYPES.includes(t))
  } catch {
    list.value = []
    otherTypes.value = []
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  addError.value = ''
  if (!newName.value) { addError.value = '请输入名称'; return }
  if (!newConfigText.value.trim()) { addError.value = '请粘贴配置 JSON'; return }
  let 配置
  try {
    配置 = JSON.parse(newConfigText.value.trim())
  } catch {
    addError.value = '配置 JSON 格式错误，请检查'; return
  }
  adding.value = true
  try {
    await http.post('/api/admin/ai-opponents', { 名称: newName.value, 类型: newType.value, 配置 })
    newName.value = ''
    newConfigText.value = ''
    await fetchList()
  } catch (e) {
    addError.value = e?.response?.data?.错误 || '添加失败'
  } finally {
    adding.value = false
  }
}

async function onDelete(item) {
  if (!confirm(`确定删除「${item.名称}」？`)) return
  try {
    await http.delete(`/api/admin/ai-opponents/${item.id}`)
    await fetchList()
  } catch {
    alert('删除失败')
  }
}

onMounted(fetchList)
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.title { margin: 0; font-size: 20px; }
.sub { margin: 4px 0 0; font-size: 13px; color: #64748b; }
.stat-num { font-size: 24px; font-weight: 700; color: #3b82f6; }
.stat-label { font-size: 13px; color: #64748b; margin-left: 4px; }

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.add-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-row.full {
  grid-column: 1 / -1;
}
.form-row label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}
.inp {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #1e293b;
  font-size: 13px;
  box-sizing: border-box;
}
.textarea {
  font-family: monospace;
  resize: vertical;
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
}
.btn {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn.primary {
  background: #3b82f6;
  color: #fff;
}
.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.danger {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 4px 12px;
  font-size: 12px;
}

.ai-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.ai-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}
.ai-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.ai-type.dummy {
  background: rgba(34,197,94,0.12);
  color: #16a34a;
}
.ai-type.master {
  background: rgba(168,85,247,0.12);
  color: #9333ea;
}

.muted {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 14px;
}

.msg.error {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(239,68,68,0.08);
  color: #dc2626;
  font-size: 13px;
}
</style>
