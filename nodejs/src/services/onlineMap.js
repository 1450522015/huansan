/**
 * 在线用户映射：userId -> { socketId, 用户名, socket }
 * 由 Socket.IO connection / disconnect 事件维护
 * 支持同一用户多设备（多 socket）同时在线
 */

const onlineMap = new Map()

export function addOnline(userId, socketId, 用户名, socketRef) {
  const key = String(userId)
  if (!onlineMap.has(key)) {
    onlineMap.set(key, { socketId, 用户名, socket: socketRef })
  } else {
    // 多设备：更新为最新 socket
    const old = onlineMap.get(key)
    onlineMap.set(key, { socketId, 用户名, socket: socketRef, oldSocketId: old.socketId, oldSocket: old.socket })
  }
}

export function removeOnline(userId) {
  onlineMap.delete(String(userId))
}

export function getOnlineInfo(userId) {
  return onlineMap.get(String(userId)) || null
}

export function getOnlineUserIds() {
  return new Set(onlineMap.keys())
}

export function getOnlineList() {
  return Array.from(onlineMap.entries()).map(([id, info]) => ({
    id,
    用户名: info.用户名,
  }))
}

export function hasOnlineUsername(用户名) {
  const target = String(用户名 || '').trim()
  if (!target) return false
  for (const info of onlineMap.values()) {
    if (info?.用户名 === target) return true
  }
  return false
}

export function getOnlineInfoByUsername(用户名) {
  const target = String(用户名 || '').trim()
  if (!target) return null
  for (const [userId, info] of onlineMap.entries()) {
    if (info?.用户名 === target) return { userId, socketId: info.socketId }
  }
  return null
}
