<template>
  <div class="calc-page">
    <header class="page-head">
      <div class="head-text">
        <h1 class="title">战局计算</h1>
        <p class="sub">输入真源 JSON，计算战局结果</p>
      </div>
    </header>

    <section class="calc-body card">
      <div class="calc-panels">
        <div class="panel">
          <label class="panel-label">真源 JSON</label>
          <textarea v-model="inputText" class="inp textarea" rows="20" placeholder="粘贴真源 JSON"></textarea>
        </div>
        <div class="panel-actions">
          <button class="btn primary" @click="onCalc" :disabled="calcing">{{ calcText }}</button>
        </div>
        <div class="panel">
          <label class="panel-label">结果 JSON</label>
          <textarea v-model="outputText" class="inp textarea" rows="20" readonly></textarea>
        </div>
      </div>
      <div v-if="errMsg" class="msg error">{{ errMsg }}</div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {结算} from '@/core/engine.js'

const inputText = ref('')
const outputText = ref('')
const calcing = ref(false)
const errMsg = ref('')

const calcText = computed(() => calcing.value ? '计算中…' : '计算')

function onCalc() {
  errMsg.value = ''
  outputText.value = ''
  if (!inputText.value.trim()) { errMsg.value = '请输入真源 JSON'; return }
  let src
  try {
    src = JSON.parse(inputText.value.trim())
  } catch {
    errMsg.value = '真源 JSON 格式错误，请检查'; return
  }
  calcing.value = true
  try {
    const result = 结算(src)
    outputText.value = JSON.stringify(result, null, 2)
  } catch (e) {
    errMsg.value = e?.message || '计算失败'
  } finally {
    calcing.value = false
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

.calc-panels {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.panel {
  flex: 1;
  min-width: 0;
}

.panel-label {
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
  padding-top: 24px;
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
