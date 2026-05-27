<template>
  <div class="zuoqi-container" :class="side">
    <img class="horse-img" src="/src/assets/坐骑.png" alt="坐骑" :style="{ transform: side === 'left' ? 'scaleX(-1)' : 'none' }" />
    <span class="horse-name">{{ mountName }}</span>
  </div>
</template>

<script setup>
defineProps({
  mountName: { type: String, default: '' },
  side: { type: String, required: true },
})
</script>

<style scoped>
.zuoqi-container {
  position: absolute;
  top: 4px;
}
.zuoqi-container.left {
  left: 2%;
}
.zuoqi-container.right {
  right: 2%;
}
.horse-img {
  width: 80px;
  height: auto;
  pointer-events: none;
  z-index: 1;
  opacity: 0.85;
}
.horse-name {
  position: absolute;
  top: 4px;
  font-size: 11px;
  color: #ffd957;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  z-index: 3;
  white-space: nowrap;
  letter-spacing: 1px;
}
.zuoqi-container.left .horse-name {
  left: 4%;
}
.zuoqi-container.right .horse-name {
  right: 4%;
}
</style>
