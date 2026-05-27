<template>
  <section class="chat-area">
    <div class="chat-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="chat-tab"
        :class="['tab-' + tab.id, { active: activeTab === tab.id }]"
        @click="$emit('update:activeTab', tab.id)"
      >{{ tab.label }}</button>
    </div>

    <div class="chat-content">
      <div v-if="activeTab === 'chat'" class="chat-messages">
        <div v-for="(msg, i) in chatMessages" :key="i" class="chat-msg" :class="{ self: msg.isSelf }">
          <span class="msg-sender">{{ msg.发送者用户名 || msg.sender || '系统' }}</span>
          <span class="msg-text">{{ msg.内容 || msg.content || msg.text || '' }}</span>
        </div>
      </div>
      <div v-else-if="activeTab === 'debug'" class="debug-panel">
        <div class="debug-row">
          <span class="debug-label">调试面板</span>
        </div>
      </div>
    </div>

    <div class="chat-input-bar">
      <button class="ib-btn ib-plus" type="button">+</button>
      <button class="ib-btn ib-emoji" type="button">😊</button>
      <input class="ib-input" type="text" v-model="localChatInput" @keydown="$emit('input-keydown', $event)" placeholder="输入消息..." />
      <button class="ib-send" type="button" @click="$emit('send-chat')">发送</button>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  activeTab: { type: String, default: 'chat' },
  chatMessages: { type: Array, default: () => [] },
  tabs: {
    type: Array,
    default: () => [
      { id: 'chat', label: '聊天' },
      { id: 'debug', label: '调试' }
    ]
  },
  chatInput: { type: String, default: '' }
})

const emit = defineEmits(['update:activeTab', 'send-chat', 'input-keydown', 'update:chatInput'])

const localChatInput = ref(props.chatInput)

watch(() => props.chatInput, (val) => {
  localChatInput.value = val
})

watch(localChatInput, (val) => {
  emit('update:chatInput', val)
})
</script>
