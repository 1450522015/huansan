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
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, default: null },
  emptyHint: { type: String, default: '' },
})
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
