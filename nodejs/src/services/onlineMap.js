/**
 * 在线用户映射：userId -> { socketId, 用户名, socket, ping时间 }
 * 由 Socket.IO connection / disconnect 事件维护
 */

import * as userRepo from '#src/repositories/userRepo.js'

const onlineMap = new Map()

export function addOnline(userId, socketId, 用户名, socketRef) {
  const key = String(userId)
  const user = userRepo.findUserById(userId)
  const 配置 = user?.配置 || {}
  const 主将 = 配置.主将 || {}
  const 职业经历 = Array.isArray(主将.职业经历) ? 主将.职业经历 : []
  const 职业串 = userRepo.职业经历To简串(职业经历)
  
  onlineMap.set(key, { 
    socketId, 
    用户名, 
    socket: socketRef, 
    ping时间: Date.now(), 
    战斗状态: '空闲',
    转数: 主将.转数 ?? 0,
    等级: 主将.等级 ?? 1,
    职业串,
    坐骑名: 主将?.坐骑?.种类 || '无'
  })
}

export function removeOnline(userId) {
  onlineMap.delete(String(userId))
}

export function updatePingTime(userId) {
  const info = onlineMap.get(String(userId))
  if (info) {
    info.ping时间 = Date.now()
  }
}

export function setUserStatusByUsername(用户名, 战斗状态) {
  const target = String(用户名 || '').trim()
  if (!target) return
  for (const info of onlineMap.values()) {
    if (info?.用户名 === target) {
      info.战斗状态 = 战斗状态
      return
    }
  }
}

export function getUserStatusByUsername(用户名) {
  const target = String(用户名 || '').trim()
  if (!target) return null
  for (const info of onlineMap.values()) {
    if (info?.用户名 === target) return info.战斗状态 || '空闲'
  }
  return null
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
    if (info?.用户名 === target) return { userId, socketId: info.socketId, socket: info.socket }
  }
  return null
}

export function getSocketByUsername(用户名) {
  const info = getOnlineInfoByUsername(用户名)
  return info?.socket || null
}

export function getEntries() {
  return Array.from(onlineMap.entries())
}

/**
 * 获取在线用户列表（包含战局状态）
 */
export function getOnlineUserList(战局上下文列表 = []) {
  const entries = getEntries()
  return entries.map(([userId, u]) => {
    const 是否有战局 = 战局上下文列表.some(ctx => {
      const desc = ctx.战局?.战局描述
      return desc?.红方用户名 === u.用户名 || desc?.黑方用户名 === u.用户名
    })
    
    return {
      用户名: u.用户名,
      转数: u.转数 ?? 0,
      等级: u.等级 ?? 1,
      职业串: u.职业串,
      坐骑名: u.坐骑名,
      战斗状态: 是否有战局 ? '战局中' : u.战斗状态,
    }
  })
}
