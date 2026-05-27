<template>
  <div class="mount-unit" :class="side">
    <img class="horse-img" src="/src/assets/坐骑.png" alt="坐骑" :style="side === 'left' ? { transform: 'scaleX(-1)' } : {}" />
    <span class="mount-name">{{ mountName }}</span>
  </div>
</template>

<script setup>
defineProps({
  mountName: { type: String, required: true },
  side: { type: String, required: true, validator: v => v === 'left' || v === 'right' },
})
</script>

<style scoped>
.mount-unit {
  position: absolute;
  top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.mount-unit.left { left: 22%; }
.mount-unit.right { right: 22%; }

.horse-img {
  width: 80px;
  height: 52px;
  object-fit: contain;
}

.mount-name {
  font-size: 10px;
  color: #f5d36a;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  margin-top: 1px;
}
</style>
