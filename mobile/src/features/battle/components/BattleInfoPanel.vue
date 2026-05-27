<template>
  <div class="info-panel">
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="$emit('update:activeTab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="panel-content">
      <div v-if="activeTab === 'chat'" class="chat-section">
        <div class="chat-messages" ref="chatContainer">
          <div v-for="(msg, i) in messages" :key="i" class="chat-msg">
            <span class="chat-time">{{ msg.time }}</span>
            <span class="chat-sender">{{ msg.sender }}:</span>
            <span class="chat-text">{{ msg.content }}</span>
          </div>
        </div>
        <div class="chat-input-row">
          <input
            class="chat-input"
            :value="inputValue"
            @input="$emit('update:chatInput', $event.target.value)"
            @keyup.enter="$emit('send-chat')"
            placeholder="输入消息..."
          />
          <button class="chat-send-btn" @click="$emit('send-chat')">发送</button>
        </div>
      </div>

      <div v-if="activeTab === 'debug'" class="debug-section">
        <pre class="debug-json">{{ debugJson }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  activeTab: { type: String, default: 'chat' },
  messages: { type: Array, default: () => [] },
  inputValue: { type: String, default: '' },
  debugJson: { type: String, default: '{}' },
})

defineEmits(['update:activeTab', 'update:chatInput', 'send-chat'])

const chatContainer = ref(null)

watch(() => props.messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<style scoped>
.info-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 15, 25, 0.9);
  border-left: 1px solid rgba(245, 211, 106, 0.15);
}

.panel-tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(245, 211, 106, 0.1);
}

.tab-btn {
  padding: 4px 12px;
  border: 1px solid rgba(245, 211, 106, 0.2);
  border-radius: 4px;
  background: transparent;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
}

.tab-btn.active {
  background: rgba(245, 211, 106, 0.15);
  color: #f5d36a;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.chat-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.chat-msg {
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.chat-time {
  color: #666;
  margin-right: 4px;
  font-size: 10px;
}

.chat-sender {
  color: #f5d36a;
  margin-right: 4px;
}

.chat-text {
  color: #ddd;
}

.chat-input-row {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-top: 1px solid rgba(245, 211, 106, 0.1);
}

.chat-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid rgba(245, 211, 106, 0.2);
  border-radius: 4px;
  background: rgba(20, 30, 50, 0.6);
  color: #ddd;
  font-size: 12px;
}

.chat-send-btn {
  padding: 6px 12px;
  border: 1px solid rgba(245, 211, 106, 0.3);
  border-radius: 4px;
  background: rgba(245, 211, 106, 0.15);
  color: #f5d36a;
  font-size: 12px;
  cursor: pointer;
}

.debug-section {
  font-size: 11px;
}

.debug-json {
  white-space: pre-wrap;
  word-break: break-all;
  color: #aaa;
  margin: 0;
  font-size: 10px;
}
</style>
