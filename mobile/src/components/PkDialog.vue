<template>
  <Teleport to="body">
    <div v-if="invitation" class="pk-dialog-mask" @click.self="onMaskClick">
      <div class="pk-dialog">
        <div class="pk-dialog-header">
          <h3>PK 邀请</h3>
          <button class="close-btn" type="button" @click="onClose">✕</button>
        </div>
        <div class="pk-dialog-body">
          <div class="invite-user">
            <span class="user-name">{{ invitation.邀请者用户名 }}</span>
          </div>
          <div class="user-meta">
            <span class="meta-item">{{ invitation.邀请者转数 }}转{{ invitation.邀请者等级 }}级</span>
            <span class="meta-item">{{ invitation.邀请者职业串 }}</span>
            <span class="meta-item">{{ invitation.邀请者坐骑名 }}</span>
          </div>
        </div>
        <div class="pk-dialog-footer">
          <button class="btn reject-btn" type="button" @click="onReject">拒绝</button>
          <button class="btn accept-btn" type="button" @click="onAccept">接受</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useBattleStore } from '@/stores/battleStore.js'

const store = useBattleStore()

const invitation = computed(() => store.pkInvitation)

function onMaskClick() {
}

function onClose() {
  store.dismissPkInvitation()
}

function onAccept() {
  if (!invitation.value) return
  store.acceptPk(invitation.value.邀请者用户名)
}

function onReject() {
  if (!invitation.value) return
  store.rejectPk(invitation.value.邀请者用户名)
}
</script>

<style scoped>
.pk-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.pk-dialog {
  background: var(--surface, #1a2030);
  border: 1px solid var(--border, #304455);
  border-radius: 12px;
  padding: 0;
  min-width: 300px;
  max-width: 85vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.pk-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #304455);
}
.pk-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text, #e8eef5);
}
.close-btn {
  background: transparent;
  border: 1px solid var(--border, #304455);
  border-radius: 6px;
  color: var(--text, #e8eef5);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}
.close-btn:hover {
  background: var(--surface-hover, #2a3548);
}
.pk-dialog-body {
  padding: 20px;
  text-align: center;
}
.invite-user {
  margin-bottom: 8px;
}
.user-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent, #5b9fd4);
}
.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta-item {
  font-size: 14px;
  color: var(--text-dim, #8899aa);
}
.pk-dialog-footer {
  display: flex;
  gap: 12px;
  padding: 0 20px 16px;
}
.btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.accept-btn {
  background: var(--success, #4caf50);
  color: #fff;
}
.reject-btn {
  background: var(--danger, #f07178);
  color: #fff;
}
</style>