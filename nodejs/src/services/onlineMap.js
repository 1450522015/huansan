/**
 * 在线用户映射：userId -> { socketId, 用户名 }
 * 由 Socket.IO connection / disconnect 事件维护
 */

const onlineMap = new Map()

export function addOnline(userId, socketId, 用户名) {
  onlineMap.set(String(userId), { socketId, 用户名 })
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
