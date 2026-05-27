<template>
  <div
    ref="charElRef"
    class="character"
    :class="{
      'char-empty': !character,
      'selectable-target': isSelectableTarget
    }"
    @click="$emit('click', character, positionKey)"
  >
    <div
      ref="charInnerRef"
      class="char-inner"
      :class="{ 'current-actor': isCurrentActor }"
    >
      <div class="char-name-tag deputy-name" v-if="!character?.isHero && character?.deputyName">
        {{ character.deputyName }}
      </div>
      <div class="floating-numbers">
        <div
          v-for="(num, idx) in floatingNums"
          :key="idx"
          class="float-num"
          :class="num.type"
          :style="{ animationDelay: (idx * 0.15) + 's' }"
        >{{ num.text }}</div>
      </div>
      <div class="char-sprite">
        <div v-if="character?.isHero" class="hero-ring"></div>
        <div v-if="isCurrentActor" class="actor-ring"></div>
        <div v-if="character?.isWushuang" class="wushuang-aura"></div>
        <canvas ref="canvasRef" class="char-canvas" width="64" height="72"></canvas>
      </div>
      <div class="char-hud" v-if="character">
        <div class="bar-row hp"><div class="bar-fill" :style="{ width: character.hpPct + '%' }"></div></div>
        <div class="bar-row mp"><div class="bar-fill" :style="{ width: character.mpPct + '%' }"></div></div>
        <span class="corner-label">
          <span class="char-class" :class="character.classColor">{{ character.class }}</span>
          <span class="char-speed">{{ character.speed }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { drawStickman } from '@/shared/canvas/stickman'

const props = defineProps({
  character: { type: Object, default: null },
  positionKey: { type: String, required: true },
  isCurrentActor: { type: Boolean, default: false },
  isSelectableTarget: { type: Boolean, default: false },
})

defineEmits(['click'])

const charElRef = ref(null)
const charInnerRef = ref(null)
const canvasRef = ref(null)
const floatingNums = ref([])

defineExpose({
  el: charElRef,
  inner: charInnerRef,
  canvas: canvasRef,
  addFloatingNumber,
  flashWhite,
  shake,
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

function addFloatingNumber(type, value) {
  if (!value || value <= 0) return
  const text = type === 'damage' ? '-' + value : '+' + value
  floatingNums.value.push({ type, text, timestamp: Date.now() })
  setTimeout(() => {
    const now = Date.now()
    floatingNums.value = floatingNums.value.filter(n => now - n.timestamp < 2000)
  }, 2000)
}

function flashWhite() {
  if (!charInnerRef.value) return
  charInnerRef.value.style.filter = 'brightness(3) saturate(0)'
  setTimeout(() => {
    charInnerRef.value.style.filter = 'brightness(1.5) saturate(0.5)'
    setTimeout(() => {
      charInnerRef.value.style.filter = ''
    }, 40)
  }, 60)
}

function shake(dir) {
  if (!charInnerRef.value) return
  const attackDir = dir || 1
  charInnerRef.value.style.transition = 'transform 0.06s ease-out'
  charInnerRef.value.style.transform = 'translateX(' + (-attackDir * 10) + 'px)'
  setTimeout(() => {
    charInnerRef.value.style.transition = 'transform 0.15s ease-in'
    charInnerRef.value.style.transform = 'translateX(0)'
    setTimeout(() => {
      charInnerRef.value.style.transition = ''
      charInnerRef.value.style.transform = ''
    }, 150)
  }, 60)
}
</script>
