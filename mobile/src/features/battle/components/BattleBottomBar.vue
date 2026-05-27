<template>
  <div class="battle-bottom-bar">
    <div class="action-buttons">
      <button class="action-btn" :class="{ active: actionMode === '技能' && selectingTarget }" type="button" :disabled="!canAct" @click="$emit('action', '技能')">
        <span class="btn-text">技能</span>
      </button>
      <button class="action-btn" :class="{ active: showItemPopup || (actionMode === '物品' && selectingTarget) }" type="button" :disabled="!canAct" @click="$emit('action', '物品')">
        <span class="btn-text">物品</span>
      </button>
      <button class="action-btn" :class="{ active: actionMode === '防御' }" type="button" :disabled="!canAct" @click="$emit('action', '防御')">
        <span class="btn-text">防御</span>
      </button>
      <button v-if="canSubmit" class="action-btn confirm" type="button" @click="$emit('submit')">
        <span class="btn-text">确定</span>
      </button>
      <div v-if="currentUnitName" class="current-unit-info">
        <span class="unit-name">{{ currentUnitName }}</span>
        <span class="action-hint" v-if="selectingTarget">请选择目标</span>
      </div>
    </div>

    <div class="scene-bottom-controls">
      <button class="ctrl-btn" type="button" :class="{ active: autoEnabled }" @click="$emit('toggle-auto')">自动</button>
      <button class="ctrl-btn danger" type="button" @click="$emit('flee')">
        {{ fleeing ? '逃跑中...' : '逃跑' }}
      </button>
      <button class="ctrl-btn" type="button" @click="$emit('toggle-speed')">{{ speedText }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canAct: { type: Boolean, default: false },
  canSubmit: { type: Boolean, default: false },
  actionMode: { type: String, default: '' },
  selectingTarget: { type: Boolean, default: false },
  showItemPopup: { type: Boolean, default: false },
  currentUnitName: { type: String, default: '' },
  autoEnabled: { type: Boolean, default: false },
  fleeing: { type: Boolean, default: false },
  speedText: { type: String, default: '速度×1' },
})

defineEmits(['action', 'submit', 'toggle-auto', 'flee', 'toggle-speed'])
</script>

<style scoped>
.battle-bottom-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(10, 15, 25, 0.85);
  border-top: 1px solid rgba(245, 211, 106, 0.15);
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid rgba(245, 211, 106, 0.3);
  border-radius: 6px;
  background: rgba(30, 40, 60, 0.8);
  color: #f5d36a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.active {
  background: rgba(245, 211, 106, 0.2);
  border-color: #f5d36a;
}

.action-btn.confirm {
  background: rgba(46, 204, 113, 0.3);
  border-color: #2ecc71;
}

.btn-text {
  font-weight: bold;
}

.current-unit-info {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.unit-name {
  font-size: 13px;
  color: #f5d36a;
}

.action-hint {
  font-size: 11px;
  color: #aaa;
}

.scene-bottom-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.ctrl-btn {
  padding: 6px 14px;
  border: 1px solid rgba(245, 211, 106, 0.2);
  border-radius: 4px;
  background: rgba(20, 30, 50, 0.7);
  color: #ddd;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-btn.active {
  background: rgba(46, 204, 113, 0.3);
  border-color: #2ecc71;
}

.ctrl-btn.danger {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.3);
}
</style>
