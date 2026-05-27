<template>
  <div class="floating-numbers">
    <TransitionGroup name="float">
      <div
        v-for="num in numbers"
        :key="num.id"
        class="float-num"
        :class="num.type"
      >
        {{ num.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue'

let nextId = 0

const numbers = ref([])

function addNumber(type, text) {
  const id = nextId++
  numbers.value.push({ id, type, text, timestamp: Date.now() })

  setTimeout(() => {
    numbers.value = numbers.value.filter(n => n.id !== id)
  }, 1500)
}

defineExpose({ addNumber })
</script>

<style scoped>
.floating-numbers {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.float-num {
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8), 0 0 6px rgba(0, 0, 0, 0.5);
  animation: floatUpAndFade 1.5s ease-out forwards;
  white-space: nowrap;
}

.float-num.damage { color: #ff4444; }
.float-num.heal { color: #44ff44; }
.float-num.mp { color: #4488ff; }

.float-enter-active {
  animation: floatUpAndFade 1.5s ease-out forwards;
}

.float-leave-active {
  transition: opacity 0.3s ease-out;
}

.float-leave-to {
  opacity: 0;
}

@keyframes floatUpAndFade {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  20% {
    transform: translateY(-8px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
}
</style>
