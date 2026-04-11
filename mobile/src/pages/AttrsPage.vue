<template>
  <div class="page">
    <h2>属性</h2>
    <p class="hint">只读展示，由服务端根据当前配置计算。</p>
    <div class="row" style="margin-bottom: 12px">
      <button class="btn secondary" type="button" :disabled="loading" @click="load">刷新</button>
      <button class="btn secondary" type="button" @click="mode = mode === '表单' ? 'JSON' : '表单'">
        切换为{{ mode === '表单' ? 'JSON' : '表单' }}视图
      </button>
    </div>
    <div v-if="错误" class="msg error">{{ 错误 }}</div>
    <div v-if="mode === 'JSON'">
      <pre class="card json">{{ jsonText }}</pre>
    </div>
    <div v-else>
      <div v-for="块 in 块列表" :key="块.key" class="card">
        <h3>{{ 块.key }}</h3>
        <div v-if="!块.data" class="muted">无数据</div>
        <div v-else class="grid">
          <div v-for="(v, k) in 块.data" :key="String(k)" class="kv">
            <span class="k">{{ k }}</span>
            <span class="v">{{ v }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { http } from '@/shared/api/http.js'

const loading = ref(false)
const 错误 = ref('')
const 属性 = ref(null)
const mode = ref('表单')

const jsonText = computed(() => JSON.stringify(属性.value || {}, null, 2))

const 块列表 = computed(() => {
  const a = 属性.value || {}
  return ['主将', '副将1', '副将2', '副将3'].map((key) => ({ key, data: a[key] }))
})

async function load() {
  错误.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/api/attrs')
    属性.value = data.属性 || null
  } catch (e) {
    错误.value = e?.response?.data?.错误 || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
h2,
h3 {
  margin-top: 0;
}
.hint {
  color: var(--muted);
  font-size: 13px;
}
.muted {
  color: var(--muted);
  font-size: 13px;
}
.json {
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 4px;
}
.k {
  color: var(--muted);
}
.v {
  font-variant-numeric: tabular-nums;
}
</style>
