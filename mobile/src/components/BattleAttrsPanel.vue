<template>
  <div class="card battle-attrs">
    <h3>战斗属性</h3>
    <div v-if="emptyHint" class="muted">{{ emptyHint }}</div>
    <div v-else-if="!data || typeof data !== 'object'" class="muted">无数据</div>
    <div v-else class="grid">
      <div v-for="([k, v]) in 展示格" :key="String(k)" class="kv">
        <span class="k">{{ k }}</span>
        <span class="v">{{ v }}</span>
      </div>
    </div>

    <div v-if="debug && typeof debug === 'object'" class="debug-wrap">
      <button type="button" class="btn-copy" @click="copyDebugInfo">复制调试信息</button>
      <span v-if="copyHint" class="copy-hint">{{ copyHint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  data: { type: Object, default: null },
  emptyHint: { type: String, default: '' },
  debug: { type: Object, default: null },
})

const copyHint = ref('')

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

const 面板排除键 = new Set(['忽视率', '天赋技能效果'])

const 展示格 = computed(() => {
  const d = props.data
  if (!d || typeof d !== 'object') return []
  const order = ['风格', '角色分类', ...DEBUG_FULL_KEYS]
  const seen = new Set()
  const rows = []
  for (const k of order) {
    if (!Object.prototype.hasOwnProperty.call(d, k) || 面板排除键.has(k)) continue
    rows.push([k, d[k]])
    seen.add(k)
  }
  for (const k of Object.keys(d).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))) {
    if (seen.has(k) || 面板排除键.has(k)) continue
    rows.push([k, d[k]])
  }
  return rows
})

const 四维键序 = ['体质', '智力', '力量', '敏捷']
const 五维键序 = ['气血', '精力', '攻击', '速度', '防御']

function fmtNum(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  if (Number.isInteger(n)) return String(n)
  const s = n.toFixed(6)
  return s.replace(/\.?0+$/, '') || '0'
}

function formatLayerObj(obj, keys) {
  if (!obj || typeof obj !== 'object') return '（无数据）'
  const seen = new Set()
  const lines = []
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue
    lines.push(`  ${k}: ${fmtNum(obj[k])}`)
    seen.add(k)
  }
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))) {
    if (seen.has(k)) continue
    lines.push(`  ${k}: ${fmtNum(obj[k])}`)
  }
  return lines.join('\n')
}

function buildDebugText() {
  const d = props.debug
  if (!d || typeof d !== 'object') return ''
  const parts = []

  parts.push('=== 战斗属性调试信息 ===')
  parts.push('')

  if (d.结果 && typeof d.结果 === 'object') {
    parts.push('【最终结果】')
    parts.push(formatLayerObj(d.结果, ['风格', '角色分类', ...DEBUG_FULL_KEYS, '忽视率']))
    if (d.结果.天赋技能效果 && typeof d.结果.天赋技能效果 === 'object') {
      parts.push('  天赋技能效果:')
      for (const [k, v] of Object.entries(d.结果.天赋技能效果)) {
        parts.push(`    ${k}: ${fmtNum(v)}`)
      }
    }
    parts.push('')
  }

  if (Array.isArray(d.分层)) {
    const layerNames = [
      '步骤1：有效四维',
      '步骤2：仅五维',
      '步骤3：加算后（未取整）',
      '步骤4：天赋乘算前（已取整）',
      '步骤5：强攻强血乘算后',
    ]
    for (let i = 0; i < d.分层.length; i++) {
      const layer = d.分层[i]
      if (!layer) continue
      const name = layer.名称 || layerNames[i] || `步骤${i + 1}`
      parts.push(`【${name}】`)
      if (i === 0 || name.includes('有效四维')) {
        parts.push(formatLayerObj(layer.属性, 四维键序))
      } else if (i === 1 || name.includes('仅五维')) {
        parts.push(formatLayerObj(layer.属性, 五维键序))
      } else {
        parts.push(formatLayerObj(layer.属性, DEBUG_FULL_KEYS))
      }
      parts.push('')
    }
  }

  if (d.中间 && typeof d.中间 === 'object') {
    parts.push('【中间数据】')
    const meta = d.中间
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === 'object' && v !== null) {
        parts.push(`  ${k}:`)
        parts.push(`    ${JSON.stringify(v)}`)
      } else {
        parts.push(`  ${k}: ${fmtNum(v)}`)
      }
    }
    parts.push('')
  }

  parts.push('=== 计算流程说明 ===')
  parts.push('步骤1：有效四维 = 分配修正后的属性点 + 宝石/装备四维加成')
  parts.push('步骤2：仅五维 = 由有效四维按公式算出（气血/精力/攻击/速度/防御；含前世槽攻血乘在公式内）')
  parts.push('步骤3：加算后（未取整）= 步骤2 + 装备非四维 + 坐骑 + 帮派 + 天赋加算 + 职业基础与抗性等')
  parts.push('步骤4：天赋乘算前（已取整）= 步骤3 合并后，主将速度先四舍五入再 × 前世槽速度倍率；再对全部数值型战斗属性四舍五入')
  parts.push('步骤5：强攻强血乘算后 = 步骤4 的「攻击」「气血」× ∏(1+p/100)；最终输出再四舍五入（连击数等区间文案不变）')

  return parts.join('\n')
}

let copyTimer = null
async function copyDebugInfo() {
  const text = buildDebugText()
  if (!text) return
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
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
</style>
