import {readonly, ref} from 'vue'
import {io} from 'socket.io-client'

let socket = null
let manualOffline = false

const connectionStatus = ref('offline')
const onlineList = ref([])

const connectHandlers = new Set()
const pkInviteHandlers = new Set()
const pkPushHandlers = new Set()
const onlineUserHandlers = new Set()

let 重连定时器 = null
let 心跳定时器 = null

function getToken() {
  try { return localStorage.getItem('huansan_token') || '' } catch { return '' }
}

function clearAllAuth() {
  try {
    localStorage.removeItem('huansan_token')
    localStorage.removeItem('huansan_用户名')
    localStorage.removeItem('huansan_密码')
  } catch {}
}

export function useSocketClient() {
  return {
    connectionStatus: readonly(connectionStatus),
    onlineList: readonly(onlineList),
    connect,
    disconnect,
    setManualOffline,
    emit,
    onConnected,
    offConnected,
    onPkInvite,
    offPkInvite,
    onPkPush,
    offPkPush,
    onOnlineUserChange,
    offOnlineUserChange,
    发pk请求,
    发pk拒绝,
    发pk同意,
    发出招,
    发在线用户拉取,
    发退出登录,
  }
}

export function connect() {
  const token = getToken()
  if (!token) return

  manualOffline = false

  if (socket) {
    if (socket.connected) {
      return
    }
    socket.auth = { token }
    socket.connect()
  } else {
    connectionStatus.value = 'connecting'
    const url = typeof window !== 'undefined' && window.__SOCKET_URL__ ? window.__SOCKET_URL__ : 'http://localhost:3001'
    socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: false,
    })

    socket.on('connect', () => {
      if (!manualOffline) {
        connectionStatus.value = 'online'
        for (const handler of connectHandlers) {
          try {
            handler()
          } catch (e) {
            console.error('[socketClient] connect handler error:', e)
          }
        }
      }
    })

    socket.on('disconnect', () => {
      if (!manualOffline) {
        connectionStatus.value = 'connecting'
      }
    })

    socket.on('connect_error', (err) => {
      if (manualOffline) return
      const msg = err?.message || ''
      if (msg.includes('未登录') || msg.includes('登录已失效') || msg.includes('已在其他设备登录') || msg.includes('用户不存在')) {
        clearAllAuth()
        setManualOffline()
        if (window.location.hash !== '#/login') {
          window.location.hash = '#/login'
        }
        return
      }
      connectionStatus.value = 'connecting'
    })

    socket.on('online-user-push', (data) => {
      if (Array.isArray(data)) {
        onlineList.value = data
        for (const handler of onlineUserHandlers) {
          try { handler(data) } catch (e) { console.error('[socketClient] online-user handler error:', e) }
        }
      }
    })

    socket.on('pk-invite-push', (data) => {
      console.log('[socketClient] 收到 pk-invite-push:', data);
      for (const handler of pkInviteHandlers) {
        try { handler(data) } catch (e) { console.error('[socketClient] pk-invite handler error:', e) }
      }
    })

    socket.on('pk-push', (data) => {
      for (const handler of pkPushHandlers) {
        try { handler(data) } catch (e) { console.error('[socketClient] pk-push handler error:', e) }
      }
    })

    启动重连检测()
    启动心跳()
  }
}

export function disconnect() {
  setManualOffline()
}

export function setManualOffline() {
  manualOffline = true
  停止重连检测()
  停止心跳()
  if (socket) {
    socket.io.opts.reconnection = false
    socket.disconnect()
    socket = null
  }
  connectionStatus.value = 'offline'
  onlineList.value = []
}

export function onConnected(handler) {
  connectHandlers.add(handler)
}

export function offConnected(handler) {
  connectHandlers.delete(handler)
}

export function onPkInvite(handler) {
  pkInviteHandlers.add(handler)
}

export function offPkInvite(handler) {
  pkInviteHandlers.delete(handler)
}

export function onPkPush(handler) {
  pkPushHandlers.add(handler)
}

export function offPkPush(handler) {
  pkPushHandlers.delete(handler)
}

export function onOnlineUserChange(handler) {
  onlineUserHandlers.add(handler)
}

export function offOnlineUserChange(handler) {
  onlineUserHandlers.delete(handler)
}

export function getSocket() {
  return socket
}

export function emit(event, ...args) {
  console.log('[socketClient.emit]', event, 'args=', args, 'socket=', !!socket);
  socket?.emit(event, ...args)
}

export function 发pk请求(目标用户名) {
  socket?.emit('pk-request', { 目标用户名 })
}

export function 发pk拒绝(邀请者用户名) {
  socket?.emit('pk-reject', { 邀请者用户名 })
}

export function 发pk同意(邀请者用户名) {
  socket?.emit('pk-agree', { 邀请者用户名 })
}

export function 发出招(出招数据) {
  socket?.emit('pk-plan', 出招数据)
}

export function 发在线用户拉取() {
  socket?.emit('online-user-pull')
}

export function 发退出登录() {
  socket?.emit('login-exit')
}

function 启动重连检测() {
  停止重连检测()
  重连定时器 = setInterval(() => {
    if (socket?.connected) return
    const token = getToken()
    if (!token) {
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login'
      }
      停止重连检测()
      return
    }
    if (!manualOffline && connectionStatus.value !== 'connecting') {
      connect()
    }
  }, 1000)
}

function 停止重连检测() {
  if (重连定时器) {
    clearInterval(重连定时器)
    重连定时器 = null
  }
}

function 启动心跳() {
  停止心跳()
  心跳定时器 = setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping')
    }
  }, 5000)
}

function 停止心跳() {
  if (心跳定时器) {
    clearInterval(心跳定时器)
    心跳定时器 = null
  }
}
