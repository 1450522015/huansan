import { ref, readonly } from 'vue'
import { io } from 'socket.io-client'
import { getToken } from '@/shared/auth/storage.js'

let socket = null

// 手动离线标志：只有用户主动点击"下线"才为 true
let manualOffline = false

// 连接状态：'offline' | 'connecting' | 'online'
const connectionStatus = ref('offline')
// 在线用户列表（仅在线时有效）
const onlineList = ref([])
// PK 等待中的目标用户名（用于取消）
const pendingPkTarget = ref('')
// 当前战局对手用户名（持久化以防刷新丢失）
const currentOpponent = ref(localStorage.getItem('huansan_当前对手') || '')

export function setCurrentOpponent(用户名) {
  currentOpponent.value = 用户名
  if (用户名) {
    localStorage.setItem('huansan_当前对手', 用户名)
  } else {
    localStorage.removeItem('huansan_当前对手')
  }
}

/** 收到 pk-result 等终态时由 ShellLayout 等调用，解除大厅 PK 按钮占用 */
export function clearPendingPkTarget() {
  pendingPkTarget.value = ''
}

// 持久化事件处理器缓存：事件名 -> Set<handler>
const handlerMap = {
  'pk-request': new Set(),
  'pk-result': new Set(),
  'pk-cancel': new Set(),
  'pk-sent': new Set(),
  'online-change': new Set(),
  'round-started': new Set(),
  'round-result': new Set(),
  'actions-submitted': new Set(),
  'battle-error': new Set(),
  'battle-chat': new Set(),
}

export function useSocketClient() {
  return {
    connectionStatus: readonly(connectionStatus),
    onlineList: readonly(onlineList),
    pendingPkTarget: readonly(pendingPkTarget),
    currentOpponent,
    setCurrentOpponent,
    clearPendingPkTarget,
    connect,
    disconnect,
    emitPkChallenge,
    onPkRequest,
    offPkRequest,
    emitPkResponse,
    onPkResult,
    offPkResult,
    emitPkCancel,
    onPkCancel,
    offPkCancel,
    onPkSent,
    offPkSent,
    onOnlineChange,
    offOnlineChange,
    setManualOffline,
    emitBattleRoundStart,
    emitBattleActionsSubmit,
    onRoundStarted,
    offRoundStarted,
    onRoundResult,
    offRoundResult,
    onActionsSubmitted,
    offActionsSubmitted,
    onBattleError,
    offBattleError,
    emitBattleChat,
    onBattleChat,
    offBattleChat,
  }
}

/**
 * 连接服务器
 */
export function connect() {
  // 已连接则跳过
  if (socket?.connected) return

  // 没有 token 无法连接
  const token = getToken()
  if (!token) return

  // 清除手动离线标志
  manualOffline = false
  connectionStatus.value = 'connecting'

  // 销毁旧 socket（如果有）
  if (socket) {
    socket.disconnect()
    socket = null
  }

  const url = typeof window !== 'undefined' && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : ''
  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => {
    if (!manualOffline) {
      connectionStatus.value = 'online'
      // 重新注册所有缓存的事件处理器
      rebindHandlers()
    }
  })

  socket.on('disconnect', () => {
    if (!manualOffline) {
      connectionStatus.value = 'connecting'
    }
    pendingPkTarget.value = ''
  })

  socket.on('connect_error', () => {
    if (!manualOffline) {
      connectionStatus.value = 'connecting'
    }
  })

  socket.on('online-change', (data) => {
    if (Array.isArray(data?.在线列表)) {
      onlineList.value = data.在线列表
    }
  })
}

/**
 * 将缓存中的所有 handler 绑定到当前 socket
 */
function rebindHandlers() {
  if (!socket) return
  for (const [event, handlers] of Object.entries(handlerMap)) {
    for (const handler of handlers) {
      socket.on(event, handler)
    }
  }
}

/**
 * 断开连接（组件卸载时调用）
 */
export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  manualOffline = false
  connectionStatus.value = 'offline'
  onlineList.value = []
  pendingPkTarget.value = ''
}

/**
 * 手动切换到离线状态（停止自动重连）
 */
export function setManualOffline() {
  manualOffline = true
  if (socket) {
    socket.io.opts.reconnection = false
    socket.disconnect()
    socket = null
  }
  connectionStatus.value = 'offline'
  onlineList.value = []
  pendingPkTarget.value = ''
}

/**
 * 发送 PK 挑战
 */
export function emitPkChallenge(目标用户名) {
  if (!socket?.connected) return false
  pendingPkTarget.value = 目标用户名
  socket.emit('pk-challenge', { 目标用户名 })
  return true
}

/**
 * 取消 PK 挑战（发起方主动取消）
 */
export function emitPkCancel(目标用户名) {
  if (!socket?.connected) return
  pendingPkTarget.value = ''
  socket.emit('pk-cancel', { 目标用户名 })
}

export function onPkCancel(handler) {
  handlerMap['pk-cancel'].add(handler)
  socket?.on('pk-cancel', handler)
}

export function offPkCancel(handler) {
  handlerMap['pk-cancel'].delete(handler)
  socket?.off('pk-cancel', handler)
}

export function onPkRequest(handler) {
  handlerMap['pk-request'].add(handler)
  socket?.on('pk-request', handler)
}

export function offPkRequest(handler) {
  handlerMap['pk-request'].delete(handler)
  socket?.off('pk-request', handler)
}

export function emitPkResponse(发起用户名, 同意) {
  if (!socket?.connected) return
  socket.emit('pk-response', { 发起用户名, 同意 })
}

export function onPkResult(handler) {
  handlerMap['pk-result'].add(handler)
  socket?.on('pk-result', handler)
}

export function offPkResult(handler) {
  handlerMap['pk-result'].delete(handler)
  socket?.off('pk-result', handler)
}

export function onPkSent(handler) {
  handlerMap['pk-sent'].add(handler)
  socket?.on('pk-sent', handler)
}

export function offPkSent(handler) {
  handlerMap['pk-sent'].delete(handler)
  socket?.off('pk-sent', handler)
}

export function onOnlineChange(handler) {
  handlerMap['online-change'].add(handler)
  socket?.on('online-change', handler)
}

export function offOnlineChange(handler) {
  handlerMap['online-change'].delete(handler)
  socket?.off('online-change', handler)
}

export function emitBattleRoundStart() {
  if (!socket?.connected) return
  socket.emit('battle-round-start')
}

export function emitBattleActionsSubmit(data) {
  if (!socket?.connected) return false
  socket.emit('battle-actions-submit', data)
  return true
}

export function onRoundStarted(handler) {
  handlerMap['round-started'].add(handler)
  socket?.on('round-started', handler)
}

export function offRoundStarted(handler) {
  handlerMap['round-started'].delete(handler)
  socket?.off('round-started', handler)
}

export function onRoundResult(handler) {
  handlerMap['round-result'].add(handler)
  socket?.on('round-result', handler)
}

export function offRoundResult(handler) {
  handlerMap['round-result'].delete(handler)
  socket?.off('round-result', handler)
}

export function onActionsSubmitted(handler) {
  handlerMap['actions-submitted'].add(handler)
  socket?.on('actions-submitted', handler)
}

export function offActionsSubmitted(handler) {
  handlerMap['actions-submitted'].delete(handler)
  socket?.off('actions-submitted', handler)
}

export function onBattleError(handler) {
  handlerMap['battle-error'].add(handler)
  socket?.on('battle-error', handler)
}

export function offBattleError(handler) {
  handlerMap['battle-error'].delete(handler)
  socket?.off('battle-error', handler)
}

export function emitBattleChat(text) {
  if (!socket?.connected) return
  socket.emit('battle-chat', { text: String(text || '').slice(0, 1024) })
}

export function onBattleChat(handler) {
  handlerMap['battle-chat'].add(handler)
  socket?.on('battle-chat', handler)
}

export function offBattleChat(handler) {
  handlerMap['battle-chat'].delete(handler)
  socket?.off('battle-chat', handler)
}
