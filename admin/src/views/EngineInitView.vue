<template>
  <div class="init-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">战局初始化</h1>
        <p class="sub">输入参数，初始化战局</p>
      </div>
    </header>

    <section class="init-body card">
      <div class="init-panels">
        <div class="form-fields">
          <div class="field">
            <label class="field-label">战局ID</label>
            <input v-model="id" class="inp" placeholder="输入战局ID" />
          </div>
          <div class="field">
            <label class="field-label">红方用户名</label>
            <input v-model="红方用户名" class="inp" placeholder="输入红方用户名" />
          </div>
          <div class="field">
            <label class="field-label">黑方用户名</label>
            <input v-model="黑方用户名" class="inp" placeholder="输入黑方用户名" />
          </div>
          <div class="field">
            <label class="field-label">红方配置 JSON</label>
            <textarea v-model="红方配置" class="inp textarea" rows="10" placeholder="粘贴红方配置 JSON"></textarea>
          </div>
          <div class="field">
            <label class="field-label">黑方配置 JSON</label>
            <textarea v-model="黑方配置" class="inp textarea" rows="10" placeholder="粘贴黑方配置 JSON"></textarea>
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn primary" @click="onInit" :disabled="initing">{{ initText }}</button>
        </div>
        <div class="field">
          <label class="field-label">结果 JSON</label>
          <textarea v-model="outputText" class="inp textarea" rows="20" readonly></textarea>
        </div>
      </div>
      <div v-if="errMsg" class="msg error">{{ errMsg }}</div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {初始化} from '@/core/engine.js'

const id = ref('')
const 红方用户名 = ref('')
const 黑方用户名 = ref('')
const 红方配置 = ref('')
const 黑方配置 = ref('')
const outputText = ref('')
const initing = ref(false)
const errMsg = ref('')

const initText = computed(() => initing.value ? '初始化中…' : '初始化')

function onInit() {
  errMsg.value = ''
  outputText.value = ''
  if (!id.value.trim()) { errMsg.value = '请输入战局ID'; return }
  if (!红方用户名.value.trim()) { errMsg.value = '请输入红方用户名'; return }
  if (!黑方用户名.value.trim()) { errMsg.value = '请输入黑方用户名'; return }
  if (!红方配置.value.trim()) { errMsg.value = '请输入红方配置 JSON'; return }
  if (!黑方配置.value.trim()) { errMsg.value = '请输入黑方配置 JSON'; return }

  let 红方配置对象, 黑方配置对象
  try {
    红方配置对象 = JSON.parse(红方配置.value.trim())
  } catch {
    errMsg.value = '红方配置 JSON 格式错误'; return
  }
  try {
    黑方配置对象 = JSON.parse(黑方配置.value.trim())
  } catch {
    errMsg.value = '黑方配置 JSON 格式错误'; return
  }

  initing.value = true
  try {
    const result = 初始化(id.value.trim(), 红方用户名.value.trim(), 红方配置对象, 黑方用户名.value.trim(), 黑方配置对象)
    outputText.value = JSON.stringify(result, null, 2)
  } catch (e) {
    errMsg.value = e?.message || '初始化失败'
  } finally {
    initing.value = false
  }
}
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

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
}

.init-panels {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.form-fields {
  flex: 1;
  min-width: 0;
}

.field {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
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

.panel-actions {
  display: flex;
  align-items: center;
  padding: 24px 0;
}

.btn {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn.primary {
  background: #3b82f6;
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.msg.error {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(239,68,68,0.08);
  color: #dc2626;
  font-size: 13px;
}
</style>
