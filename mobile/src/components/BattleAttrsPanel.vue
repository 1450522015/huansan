<template>
  <div class="card battle-attrs">
    <h3>战斗属性</h3>
    <div v-if="emptyHint" class="muted">{{ emptyHint }}</div>
    <div v-else-if="!data || typeof data !== 'object'" class="muted">无数据</div>
    <div v-else class="grid">
      <div v-for="k in 固定显示键" :key="k" class="kv">
        <span class="k">{{ k }}</span>
        <span class="v">{{ 获取值(k) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: { type: Object, default: null },
  emptyHint: { type: String, default: '' },
})

const 固定显示键 = [
  '风格',
  '角色分类',
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

function 获取值(k) {
  const v = props.data?.[k]
  if (v === undefined || v === null) return '—'
  if (k === '连击数') {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    return `2~${Math.max(2, Math.trunc(n || 2))}`
  }
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
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
</style>
