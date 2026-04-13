<template>
  <div class="card battle-attrs">
    <h3>战斗属性</h3>
    <div v-if="emptyHint" class="muted">{{ emptyHint }}</div>
    <div v-else-if="!data || typeof data !== 'object'" class="muted">无数据</div>
    <div v-else class="grid">
      <div v-for="(v, k) in data" :key="String(k)" class="kv">
        <span class="k">{{ k }}</span>
        <span class="v">{{ v }}</span>
      </div>
    </div>

    <div v-if="debug && typeof debug === 'object'" class="debug-wrap">
      <div class="debug-toolbar">
        <span class="debug-tag">调试分层（四步）</span>
        <button type="button" class="btn-copy" @click="copyDebugJson">复制 JSON</button>
        <span v-if="copyHint" class="copy-hint">{{ copyHint }}</span>
      </div>
      <p class="debug-tip muted">
        <strong>1</strong> 有效四维（分配修正 + 宝石/装备四维）·
        <strong>2</strong> 仅由有效四维算出的五维（气血/精力/攻击/速度/防御）·
        <strong>3</strong> 加算完成后的全量战斗字段 ·
        <strong>4</strong> 乘算完成（强攻/强血）后的全量，可含小数；再经四舍五入即与上方「战斗属性」一致。
        开发模式或 <code>battleDebug=1</code> 显示。
      </p>
      <details v-for="(layer, i) in debug.分层" :key="'L' + i" class="debug-layer">
        <summary>{{ layer.名称 }}</summary>
        <pre class="debug-pre">{{ formatDebugLayer(layer, i) }}</pre>
      </details>
      <details v-if="debug.中间" class="debug-layer">
        <summary>中间数据（等级系数、宝石四维、天赋乘区等）</summary>
        <pre class="debug-pre">{{ JSON.stringify(debug.中间, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  data: { type: Object, default: null },
  emptyHint: { type: String, default: '' },
  debug: { type: Object, default: null },
})

const copyHint = ref('')

/** 与 common/attrCalculator 输出字段顺序对齐，便于第 3、4 层「全量」展示 */
const DEBUG_FULL_KEYS = [
  '气血',
  '精力',
  '攻击',
  '防御',
  '速度',
  '命中率',
  '暴击率',
  '反击率',
  '致命率',
  '法爆率',
  '反震率',
  '躲避率',
  '抗物理',
  '抗玄击',
  '抗封锁',
  '抗扰乱',
  '抗围困',
  '抗风沙',
  '抗妖火',
  '抗毒术',
  '抗落雷',
  '暴击力',
  '穿透率',
  '爆伤力',
  '法伤力',
  '连击率',
  '连击数',
  '法穿率',
]

const 四维键序 = ['体质', '智力', '力量', '敏捷']
const 五维键序 = ['气血', '精力', '攻击', '速度', '防御']

function formatDebugLayer(layer, index) {
  const obj = layer?.属性
  if (!obj || typeof obj !== 'object') return '（无数据）'
  const name = String(layer.名称 || '')

  if (index === 0 || name.includes('有效四维')) {
    return 四维键序.map((k) => `${k}: ${Number(obj[k]) || 0}`).join('\n')
  }
  if (index === 1 || name.includes('仅五维')) {
    return 五维键序.map((k) => `${k}: ${fmtValue(k, obj[k], false)}`).join('\n')
  }

  const isLayer4 = index === 3 || name.includes('乘算后')
  const lines = []
  const seen = new Set()
  for (const k of DEBUG_FULL_KEYS) {
    const raw = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : 0
    lines.push(`${k}: ${fmtValue(k, raw, isLayer4)}`)
    seen.add(k)
  }
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))) {
    if (seen.has(k)) continue
    lines.push(`${k}: ${fmtValue(k, obj[k], isLayer4)}`)
  }
  return lines.join('\n')
}

function getNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** 第 4 层攻击/气血保留小数，其余数值按有限小数格式化 */
function fmtValue(k, v, allowFloat) {
  const n = getNum(v)
  if (n === undefined) return String(v)
  if (allowFloat && (k === '攻击' || k === '气血')) {
    if (Number.isInteger(n)) return String(n)
    const s = n.toFixed(6)
    return s.replace(/\.?0+$/, '') || '0'
  }
  if (allowFloat && !Number.isInteger(n)) {
    const s = n.toFixed(6)
    return s.replace(/\.?0+$/, '') || '0'
  }
  return String(Math.round(n))
}

let copyTimer = null
async function copyDebugJson() {
  const d = props.debug
  if (!d) return
  const text = JSON.stringify(d, null, 2)
  try {
    await navigator.clipboard.writeText(text)
    copyHint.value = '已复制'
  } catch {
    copyHint.value = '复制失败'
  }
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyHint.value = ''
    copyTimer = null
  }, 2000)
}
</script>

<style scoped>
.battle-attrs {
  padding: 10px;
  margin-bottom: 24px;
}
.battle-attrs h3 {
  margin: 0 0 8px;
  font-size: 15px;
}
.muted {
  color: var(--muted);
  font-size: 13px;
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

.debug-wrap {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.debug-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.debug-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.btn-copy {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card, #fff);
  cursor: pointer;
}
.btn-copy:hover {
  opacity: 0.9;
}
.copy-hint {
  font-size: 12px;
  color: var(--muted);
}
.debug-tip {
  font-size: 12px;
  margin: 0 0 8px;
  line-height: 1.45;
}
.debug-tip code {
  font-size: 11px;
}
.debug-layer {
  margin-bottom: 6px;
  font-size: 13px;
}
.debug-layer summary {
  cursor: pointer;
  color: var(--muted);
  padding: 4px 0;
}
.debug-pre {
  margin: 4px 0 0;
  padding: 8px;
  font-size: 11px;
  line-height: 1.4;
  overflow-x: auto;
  border-radius: 6px;
  background: var(--code-bg, rgba(0, 0, 0, 0.04));
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
