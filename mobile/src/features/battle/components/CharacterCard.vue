<template>
  <div
    v-if="character"
    class="character-unit"
    :class="{
      'char-empty': !character,
      'is-hero': character.isHero,
      'selectable-target': isSelectableTarget
    }"
    @click="handleClick"
  >
    <div
      class="char-inner"
      ref="innerRef"
      :class="{ 'current-actor': isCurrentActor }"
    >
      <div class="char-name-tag deputy-name" v-if="!character.isHero && character.deputyName">
        {{ character.deputyName }}
      </div>
      <div class="char-sprite">
        <div v-if="character.isHero" class="hero-ring"></div>
        <div v-if="isCurrentActor" class="actor-ring"></div>
        <div v-if="character.isWushuang" class="wushuang-aura"></div>
        <canvas ref="canvasRef" class="char-canvas" width="64" height="72"></canvas>
      </div>
      <div class="char-bars">
        <div class="bar-row hp-row">
          <span class="bar-label hp-label">气血</span>
          <div class="bar-container hp-bar">
            <div class="bar-fill hp-fill" :style="{ width: character.hpPct + '%' }"></div>
          </div>
          <span class="bar-value">{{ character.currentHp }}/{{ character.maxHp }}</span>
        </div>
        <div class="bar-row mp-row">
          <span class="bar-label mp-label">精力</span>
          <div class="bar-container mp-bar">
            <div class="bar-fill mp-fill" :style="{ width: character.mpPct + '%' }"></div>
          </div>
          <span class="bar-value">{{ character.currentMp }}/{{ character.maxMp }}</span>
        </div>
      </div>
      <div class="char-meta">
        <span :class="['char-class', character.classColor]">{{ character.class }}</span>
        <span class="speed-rank">#{{ character.speed }}</span>
      </div>
      <FloatingNumbers ref="floatingRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { drawStickman, startBreathing, stopBreathing } from '@/shared/canvas/stickman'
import FloatingNumbers from './FloatingNumbers.vue'

const props = defineProps({
  character: { type: Object, default: null },
  positionKey: { type: String, required: true },
  isCurrentActor: { type: Boolean, default: false },
  isSelectableTarget: { type: Boolean, default: false },
})

const emit = defineEmits(['target-click'])

const innerRef = ref(null)
const canvasRef = ref(null)
const floatingRef = ref(null)

defineExpose({
  flash,
  shake,
  showDamage,
  showHeal,
  showMp,
})

onMounted(() => {
  drawChar()
})

watch(() => props.character, () => {
  nextTick(() => drawChar())
}, { deep: true })

function drawChar() {
  if (canvasRef.value && props.character) {
    drawStickman(canvasRef.value, props.positionKey)
  }
}

function flash() {
  if (!innerRef.value) return
  innerRef.value.style.filter = 'brightness(3) saturate(0)'
  setTimeout(() => {
    innerRef.value.style.filter = 'brightness(1.5) saturate(0.5)'
    setTimeout(() => {
      innerRef.value.style.filter = ''
    }, 40)
  }, 60)
}

function shake() {
  if (!innerRef.value) return
  const dir = Math.random() > 0.5 ? 1 : -1
  innerRef.value.style.transition = 'transform 0.06s ease-out'
  innerRef.value.style.transform = `translateX(${dir * 12}px)`
  setTimeout(() => {
    innerRef.value.style.transition = 'transform 0.15s ease-in'
    innerRef.value.style.transform = 'translateX(0)'
    setTimeout(() => {
      innerRef.value.style.transition = ''
      innerRef.value.style.transform = ''
    }, 150)
  }, 80)
}

function showDamage(value) {
  if (!value || value <= 0) return
  floatingRef.value?.addNumber('damage', '-' + value)
}

function showHeal(value) {
  if (!value || value <= 0) return
  floatingRef.value?.addNumber('heal', '+' + value)
}

function showMp(value) {
  if (!value || value <= 0) return
  floatingRef.value?.addNumber('mp', '+' + value)
}

function handleClick() {
  if (props.isSelectableTarget) {
    emit('click', props.character)
  } else if (props.character) {
    emit('click', props.character)
  }
}
</script>

<style scoped>
.character-unit {
  position: relative;
  width: 72px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: transform 0.15s ease-out, filter 0.2s ease-out;
  z-index: 1;
}

.character-unit.is-hero {
  z-index: 2;
}

.char-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: transform 0.4s ease-out, opacity 0.4s ease-out, filter 0.2s ease-out;
  border-radius: 8px;
  padding: 4px 2px;
  position: relative;
}

.current-actor .char-sprite {
  box-shadow: 0 0 10px rgba(245, 211, 106, 0.6);
}

.selectable-target {
  cursor: pointer;
}

.selectable-target:hover {
  transform: scale(1.08) translateY(-2px);
}

.selectable-target .char-inner {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 8px rgba(100, 200, 255, 0.3);
}

.char-name-tag {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  color: #f5d36a;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  z-index: 10;
  font-weight: bold;
}

.deputy-name {
  color: #b4d3ff;
}

.char-sprite {
  position: relative;
  width: 64px;
  height: 72px;
}

.hero-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
  pointer-events: none;
  animation: heroRingPulse 2s ease-in-out infinite;
}

@keyframes heroRingPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.actor-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 3px solid rgba(245, 211, 106, 0.8);
  box-shadow: 0 0 12px rgba(245, 211, 106, 0.6), inset 0 0 8px rgba(255, 255, 255, 0.4);
  pointer-events: none;
  animation: actorRingPulse 1.2s ease-in-out infinite;
}

@keyframes actorRingPulse {
  0% { opacity: 1; box-shadow: 0 0 8px rgba(245, 211, 106, 0.8), inset 0 0 6px rgba(255, 255, 255, 0.4); }
  50% { opacity: 0.6; box-shadow: 0 0 12px rgba(245, 211, 106, 1), inset 0 0 10px rgba(255, 255, 255, 0.6); }
  100% { opacity: 1; box-shadow: 0 0 8px rgba(245, 211, 106, 0.8), inset 0 0 6px rgba(255, 255, 255, 0.4); }
}

.char-canvas {
  width: 64px;
  height: 72px;
  image-rendering: pixelated;
}

.char-bars {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.bar-label {
  font-size: 9px;
  color: #aaa;
  min-width: 20px;
  text-align: right;
}

.hp-label { color: #ff6b6b; }
.mp-label { color: #6bcfff; }

.bar-container {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease-out;
}

.hp-fill {
  background: linear-gradient(90deg, #ff6b6b, #ff4757);
}

.mp-fill {
  background: linear-gradient(90deg, #6bcfff, #3498db);
}

.bar-value {
  font-size: 9px;
  color: #ddd;
  min-width: 35px;
  text-align: left;
}

.char-meta {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 2px;
  margin-top: 2px;
}

.char-class {
  font-size: 10px;
  font-weight: bold;
}

.class-warrior { color: #ff6b6b; }
.class-scholar { color: #6bcfff; }
.class-strategist { color: #a29bfe; }

.speed-rank {
  font-size: 10px;
  color: #888;
}
</style>
