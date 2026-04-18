<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="pk-overlay"
      role="dialog"
      aria-modal="true"
      @click.self="onCancelOrClose"
    >
      <div class="pk-dialog card">
      <!-- 等待模式（发起方视角） -->
      <template v-if="mode === 'waiting'">
        <h3>等待回应</h3>
        <p class="pk-info">
          <span class="pk-name">{{ 目标用户名 }}</span>
          <span class="pk-level">{{ 目标转数 }}转{{ 目标等级 }}级</span>
          <span v-if="目标职业串" class="pk-career">{{ 目标职业串 }}</span>
        </p>
        <p class="pk-hint">等待对方接受挑战…</p>
        <div class="row" style="margin-top: 14px">
          <button class="btn secondary" type="button" @click="onCancel">取消挑战</button>
        </div>
      </template>

      <!-- 接受模式（被挑战方视角） -->
      <template v-else-if="mode === 'receiving'">
        <h3>PK 挑战</h3>
        <p class="pk-info">
          <span class="pk-name">{{ 发起用户名 }}</span>
          <span class="pk-level">{{ 发起转数 }}转{{ 发起等级 }}级</span>
          <span v-if="发起职业串" class="pk-career">{{ 发起职业串 }}</span>
        </p>
        <p class="pk-hint">向你发起了 PK 挑战！</p>
        <div class="row" style="margin-top: 14px">
          <button class="btn" type="button" @click="onAccept">同意</button>
          <button class="btn secondary" type="button" @click="onReject">拒绝</button>
        </div>
      </template>

      <!-- 被拒绝确认 -->
      <template v-else-if="mode === 'rejected'">
        <div class="status-text">
          <span class="emoji">❌</span>
          <span>{{ rejectReason || '对方拒绝了挑战' }}</span>
        </div>
        <div class="confirm-actions">
          <button class="confirm-btn" @click="onConfirmRejected">确定</button>
        </div>
      </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'receiving' },
  发起用户名: { type: String, default: '' },
  发起转数: { type: Number, default: 0 },
  发起等级: { type: Number, default: 1 },
  发起职业串: { type: String, default: '' },
  目标用户名: { type: String, default: '' },
  目标转数: { type: Number, default: 0 },
  目标等级: { type: Number, default: 1 },
  目标职业串: { type: String, default: '' },
  rejectReason: { type: String, default: '' },
})

const emit = defineEmits(['accepted', 'rejected', 'cancel', 'confirm-rejected'])

function onCancel() {
  emit('cancel')
}

function onCancelOrClose() {
  if (props.mode === 'receiving') {
    onReject()
  }
}

function onAccept() {
  emit('accepted')
}

function onReject() {
  emit('rejected')
}

function onConfirmRejected() {
  emit('confirm-rejected')
}
</script>

<style scoped>
.pk-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  padding-bottom: max(20px, env(safe-area-inset-bottom, 0px));
  background: rgba(0, 0, 0, 0.55);
  box-sizing: border-box;
}
.pk-dialog {
  text-align: center;
  width: min(360px, 100%);
  max-height: min(80vh, 520px);
  overflow: auto;
  margin: 0;
}
.pk-dialog h3 {
  margin: 0 0 12px;
  font-size: 18px;
}
.pk-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 12px 0 4px;
}
.pk-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent, #3d8bfd);
}
.pk-level {
  font-size: 15px;
  color: var(--muted, #8b9cb3);
}
.pk-career {
  font-size: 13px;
  color: var(--muted, #8b9cb3);
  opacity: 0.85;
}
.pk-hint {
  font-size: 14px;
  color: var(--text, #e8eef5);
  margin: 8px 0 0;
}
</style>
