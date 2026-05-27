/**
 * 战局服务 - 按照游戏骨架文档重写
 * 包含：战局等候列表管理、战局上下文管理、定时轮询、PK事件处理
 */

import * as onlineMap from '#src/services/onlineMap.js'
import * as battleRepo from '#src/repositories/battleRepo.js'
import * as userRepo from '#src/repositories/userRepo.js'
import * as aiOpponentRepo from '#src/repositories/aiOpponentRepo.js'
import * as 引擎 from '#core/engine.js'
import * as bot from '#core/bot.js'

/**
 * 战局等候列表
 * [{唯一id, 发起方用户名, 目标方用户名, 创建时间}]
 */
const 战局等候列表 = []

/**
 * 战局上下文列表
 * [{战局, 红方出招, 黑方出招, 出招计时, 连续断连次数, 人机类型, 聊天记录}]
 */
const 战局上下文列表 = []

/** 全局io实例，在init中注入 */
let io = null

/** 1秒轮询战局上下文的定时器ID */
let 战局轮询定时器 = null

/** 10秒轮询战局等候的定时器ID */
let 等候轮询定时器 = null

let id自增 = 0
function 生成唯一id() {
  id自增++
  return `wait_${Date.now()}_${id自增}`
}

/**
 * 初始化服务，启动定时轮询
 */
export function init(serverIo) {
  io = serverIo
  start战局轮询()
  start等候轮询()
}

/**
 * 销毁所有定时器和服务状态（服务器关闭时调用）
 */
export function destroyAll() {
  if (战局轮询定时器) clearInterval(战局轮询定时器)
  if (等候轮询定时器) clearInterval(等候轮询定时器)
  
  for (const ctx of 战局上下文列表) {
    ctx.战局.战局描述.状态 = '已结束'
    ctx.战局.战局描述.战胜方玩家名称 = null
    battleRepo.updateBattleStatus(ctx.战局.战局描述.id, '已结束', { 战局: ctx.战局 })
  }
  战局上下文列表.length = 0
  战局等候列表.length = 0
}

// ==================== 在线用户相关 ====================

/**
 * 获取在线用户列表（包含战局状态）
 */
export function getOnlineUserList() {
  return onlineMap.getOnlineUserList(战局上下文列表)
}

export function getWaitingBattleList() {
  return 战局等候列表.map(w => ({
    唯一id: w.唯一id,
    发起方用户名: w.发起方用户名,
    目标方用户名: w.目标方用户名,
    创建时间: w.创建时间,
    发起方在线: onlineMap.hasOnlineUsername(w.发起方用户名),
  }))
}

/**
 * 获取包含用户详细信息的等候列表
 */
function getWaitingListWithUserInfo(目标方用户名) {
  const 等候列表 = 战局等候列表.filter(w => w.目标方用户名 === 目标方用户名)
  const 在线用户列表 = onlineMap.getOnlineUserList(战局上下文列表)
  const 用户信息Map = new Map(在线用户列表.map(u => [u.用户名, u]))
  
  return 等候列表.map(w => {
    const 发起方用户信息 = 用户信息Map.get(w.发起方用户名) || null
    return {
      ...w,
      发起方用户信息,
      邀请者用户名: w.发起方用户名,
      邀请者转数: 发起方用户信息?.转数 ?? 0,
      邀请者等级: 发起方用户信息?.等级 ?? 1,
      邀请者职业串: 发起方用户信息?.职业串 ?? '',
      邀请者坐骑名: 发起方用户信息?.坐骑名 ?? '无',
    }
  })
}

// ==================== PK相关 ====================

/**
 * 订阅 pk-request
 * @param {object} socket 发起方的socket
 * @param {string} 目标方用户名
 */
export function handlePkRequest(socket, 目标方用户名) {
  const 发起方用户名 = socket.data.用户名
  
  if (!onlineMap.hasOnlineUsername(目标方用户名)) {
    return
  }
  
  const 发起方状态 = onlineMap.getUserStatusByUsername(发起方用户名)
  if (发起方状态 !== '空闲') {
    return
  }
  
  const 已存在 = 战局等候列表.find(
    w => w.发起方用户名 === 发起方用户名 && w.目标方用户名 === 目标方用户名
  )
  if (!已存在) {
    const 等候 = {
      唯一id: 生成唯一id(),
      发起方用户名,
      目标方用户名,
      创建时间: Date.now(),
    }
    战局等候列表.push(等候)
  }
  
  const 目标等候列表 = getWaitingListWithUserInfo(目标方用户名)
  const 目标socket = onlineMap.getOnlineInfoByUsername(目标方用户名)?.socket
  if (目标socket) {
    目标socket.emit('pk-invite-push', 目标等候列表)
  }
}

/**
 * 订阅 pk-invite-pull
 */
export function handlePkInvitePull(socket) {
  const 用户名 = socket.data.用户名
  const 等候列表 = getWaitingListWithUserInfo(用户名)
  socket.emit('pk-invite-push', 等候列表)
}

/**
 * 订阅 pk-reject
 */
export function handlePkReject(socket, 等候id) {
  const idx = 战局等候列表.findIndex(w => w.唯一id === 等候id)
  if (idx !== -1) {
    战局等候列表.splice(idx, 1)
  }
}

/**
 * 通过邀请者用户名拒绝 PK
 */
export function handlePkRejectByUsername(socket, 邀请者用户名) {
  if (!邀请者用户名) return
  const myUsername = socket.data.用户名
  const idx = 战局等候列表.findIndex(
    w => w.发起方用户名 === 邀请者用户名 && w.目标方用户名 === myUsername
  )
  if (idx !== -1) {
    战局等候列表.splice(idx, 1)
  }
}

/**
 * 订阅 pk-agree
 */
export function handlePkAgree(socket, 等候id) {
  const 等候Idx = 战局等候列表.findIndex(w => w.唯一id === 等候id)
  if (等候Idx === -1) {
    socket.emit('pk-push', { success: false, 原因: '邀请不存在' })
    return
  }
  
  const 等候 = 战局等候列表[等候Idx]
  const 发起方用户名 = 等候.发起方用户名
  const 目标方用户名 = 等候.目标方用户名
  
  const 发起方状态 = onlineMap.getUserStatusByUsername(发起方用户名)
  const 目标方状态 = onlineMap.getUserStatusByUsername(目标方用户名)
  
  if (发起方状态 !== '空闲' || 目标方状态 !== '空闲') {
    战局等候列表.splice(等候Idx, 1)
    const 发起方socket = onlineMap.getOnlineInfoByUsername(发起方用户名)?.socket
    if (发起方socket) {
      发起方socket.emit('pk-push', { success: false, 原因: '对方不空闲' })
    }
    return
  }
  
  onlineMap.setUserStatusByUsername(发起方用户名, '战局中')
  onlineMap.setUserStatusByUsername(目标方用户名, '战局中')
  
  // 移除双方作为发起方的战局等候
  for (let i = 战局等候列表.length - 1; i >= 0; i--) {
    const w = 战局等候列表[i]
    if (w.发起方用户名 === 发起方用户名 || w.发起方用户名 === 目标方用户名) {
      战局等候列表.splice(i, 1)
    }
  }
  
  const 发起方用户 = userRepo.findUserByUsername(发起方用户名)
  const 目标方用户 = userRepo.findUserByUsername(目标方用户名)
  
  const 发起方配置 = 发起方用户.配置
  const 目标方配置 = 目标方用户.配置
  
  const 战局id = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const 战局 = 引擎.初始化(战局id, 发起方用户名, 发起方配置, 目标方用户名, 目标方配置)
  
  battleRepo.createBattle({ 战局 })
  
  const 上下文 = {
    战局,
    红方出招: null,
    黑方出招: null,
    出招计时: Date.now() + 9999 * 1000,
    连续断连次数: 0,
    人机类型: null,
  }
  战局上下文列表.push(上下文)
  
  const 回合数据 = 引擎.当前回合数据(战局)
  
  const 发起方socket = onlineMap.getOnlineInfoByUsername(发起方用户名)?.socket
  const 目标方socket = onlineMap.getOnlineInfoByUsername(目标方用户名)?.socket
  
  if (发起方socket) {
    发起方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招: false })
  }
  if (目标方socket) {
    目标方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招: false })
  }
  
  广播在线用户列表()
}

/**
 * 通过邀请者用户名同意 PK
 */
export function handlePkAgreeByUsername(socket, 邀请者用户名) {
  if (!邀请者用户名) return
  const myUsername = socket.data.用户名
  const 等候Idx = 战局等候列表.findIndex(
    w => w.发起方用户名 === 邀请者用户名 && w.目标方用户名 === myUsername
  )
  if (等候Idx === -1) {
    socket.emit('pk-push', { success: false, 原因: '邀请不存在' })
    return
  }

  const 等候 = 战局等候列表[等候Idx]
  const 发起方用户名 = 等候.发起方用户名
  const 目标方用户名 = 等候.目标方用户名

  const 发起方状态 = onlineMap.getUserStatusByUsername(发起方用户名)
  const 目标方状态 = onlineMap.getUserStatusByUsername(目标方用户名)

  if (发起方状态 !== '空闲' || 目标方状态 !== '空闲') {
    战局等候列表.splice(等候Idx, 1)
    const 发起方socket = onlineMap.getOnlineInfoByUsername(发起方用户名)?.socket
    if (发起方socket) {
      发起方socket.emit('pk-push', { success: false, 原因: '对方不空闲' })
    }
    socket.emit('pk-push', { success: false, 原因: '状态不空闲' })
    return
  }

  onlineMap.setUserStatusByUsername(发起方用户名, '战局中')
  onlineMap.setUserStatusByUsername(目标方用户名, '战局中')

  for (let i = 战局等候列表.length - 1; i >= 0; i--) {
    const w = 战局等候列表[i]
    if (w.发起方用户名 === 发起方用户名 || w.发起方用户名 === 目标方用户名) {
      战局等候列表.splice(i, 1)
    }
  }

  const 发起方用户 = userRepo.findUserByUsername(发起方用户名)
  const 目标方用户 = userRepo.findUserByUsername(目标方用户名)

  const 发起方配置 = 发起方用户.配置
  const 目标方配置 = 目标方用户.配置

  const 战局id = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const 战局 = 引擎.初始化(战局id, 发起方用户名, 发起方配置, 目标方用户名, 目标方配置)

  battleRepo.createBattle({ 战局 })

  const 上下文 = {
    战局,
    红方出招: null,
    黑方出招: null,
    出招计时: Date.now() + 9999 * 1000,
    连续断连次数: 0,
    人机类型: null,
  }
  战局上下文列表.push(上下文)

  const 回合数据 = 引擎.当前回合数据(战局)

  const 发起方socket = onlineMap.getOnlineInfoByUsername(发起方用户名)?.socket
  const 目标方socket = onlineMap.getOnlineInfoByUsername(目标方用户名)?.socket

  if (发起方socket) {
    发起方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招: false })
  }
  if (目标方socket) {
    目标方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招: false })
  }

  广播在线用户列表()
}

// ==================== 战局进行 ====================

/**
 * 订阅 pk-plan
 */
export function handlePkPlan(socket, 出招数据) {
  const 用户名 = socket.data.用户名
  
  const 上下文 = 战局上下文列表.find(ctx => {
    const desc = ctx.战局.战局描述
    return desc.红方用户名 === 用户名 || desc.黑方用户名 === 用户名
  })
  
  if (!上下文) {
    return
  }

  // 处理聊天
  if (出招数据?.type === 'chat') {
    addChatMessage(用户名, 出招数据.text)
    return
  }

  // 处理逃跑
  if (出招数据?.type === 'flee') {
    // 逃跑逻辑：直接结算，让逃跑方认输
    const 我是红方 = 上下文.战局.战局描述.红方用户名 === 用户名
    // 先让逃跑方出一个认输的招
    if (我是红方) {
      上下文.红方出招 = { 行动: '逃跑' }
    } else {
      上下文.黑方出招 = { 行动: '逃跑' }
    }
    // 结算这一回合
    结算回合(上下文)
    return
  }
  
  // 普通出招
  if (上下文.战局.战局描述.红方用户名 === 用户名) {
    上下文.红方出招 = 出招数据
  } else {
    上下文.黑方出招 = 出招数据
  }
}

/**
 * 处理玩家断连
 */
export function handleDisconnect(用户名) {
  removeWaitingByInitiator(用户名)
}

export function removeWaitingByInitiator(用户名) {
  for (let i = 战局等候列表.length - 1; i >= 0; i--) {
    const 等候 = 战局等候列表[i]
    if (等候.发起方用户名 === 用户名) {
      战局等候列表.splice(i, 1)
    }
  }
}

/**
 * 处理玩家重连
 */
export function handleReconnect(socket, 用户名) {
  const 上下文 = 战局上下文列表.find(ctx => {
    const desc = ctx.战局.战局描述
    return desc.红方用户名 === 用户名 || desc.黑方用户名 === 用户名
  })
  
  if (上下文) {
    const 回合数据 = 引擎.当前回合数据(上下文.战局)
    const 已出招 = (上下文.战局.战局描述.红方用户名 === 用户名 && 上下文.红方出招 !== null)
      || (上下文.战局.战局描述.黑方用户名 === 用户名 && 上下文.黑方出招 !== null)
    
    socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招 })
    return
  }
  
  const 等候列表 = getWaitingListWithUserInfo(用户名)
  if (等候列表.length > 0) {
    socket.emit('pk-invite-push', 等候列表)
  }
  
  socket.emit('pk-push', { success: false, 原因: '不在战局中' })
}

// ==================== 定时轮询 ====================

function start战局轮询() {
  if (战局轮询定时器) clearInterval(战局轮询定时器)
  
  战局轮询定时器 = setInterval(() => {
    for (let i = 战局上下文列表.length - 1; i >= 0; i--) {
      const ctx = 战局上下文列表[i]
      
      if (!ctx.人机类型) {
        const 红方在线 = onlineMap.hasOnlineUsername(ctx.战局.战局描述.红方用户名)
        const 黑方在线 = onlineMap.hasOnlineUsername(ctx.战局.战局描述.黑方用户名)
        
        if (!红方在线 && !黑方在线) {
          ctx.连续断连次数++
        } else {
          ctx.连续断连次数 = 0
        }
        
        if (ctx.连续断连次数 >= 10) {
          ctx.战局.战局描述.状态 = '已结束'
          battleRepo.updateBattleStatus(ctx.战局.战局描述.id, '已结束', { 战局: ctx.战局 })
          // 恢复玩家状态为空闲
          onlineMap.setUserStatusByUsername(ctx.战局.战局描述.红方用户名, '空闲')
          onlineMap.setUserStatusByUsername(ctx.战局.战局描述.黑方用户名, '空闲')
          战局上下文列表.splice(i, 1)
          广播在线用户列表()
          continue
        }
        
        const 双方都已出招 = ctx.红方出招 !== null && ctx.黑方出招 !== null
        const 超时 = Date.now() > ctx.出招计时
        
        if (双方都已出招 || 超时) {
          结算回合(ctx)
        }
      } else {
        const 红方在线 = onlineMap.hasOnlineUsername(ctx.战局.战局描述.红方用户名)
        
        if (!红方在线) {
          ctx.连续断连次数++
        } else {
          ctx.连续断连次数 = 0
        }
        
        if (ctx.连续断连次数 >= 10) {
          ctx.战局.战局描述.状态 = '已结束'
          battleRepo.updateBattleStatus(ctx.战局.战局描述.id, '已结束', { 战局: ctx.战局 })
          // 恢复玩家状态为空闲
          onlineMap.setUserStatusByUsername(ctx.战局.战局描述.红方用户名, '空闲')
          onlineMap.setUserStatusByUsername(ctx.战局.战局描述.黑方用户名, '空闲')
          战局上下文列表.splice(i, 1)
          广播在线用户列表()
          continue
        }
        
        const 红方已出招 = ctx.红方出招 !== null
        const 超时 = Date.now() > ctx.出招计时
        
        if ((红方已出招 && ctx.人机类型) || 超时) {
          const ai出招 = bot.出招(ctx.战局, ctx.红方出招 || [], ctx.人机类型)
          ctx.黑方出招 = ai出招
          结算回合(ctx)
        }
      }
    }
  }, 1000)
}

function start等候轮询() {
  if (等候轮询定时器) clearInterval(等候轮询定时器)
  
  等候轮询定时器 = setInterval(() => {
    for (let i = 战局等候列表.length - 1; i >= 0; i--) {
      const 等候 = 战局等候列表[i]
      if (!onlineMap.hasOnlineUsername(等候.发起方用户名)) {
        战局等候列表.splice(i, 1)
      }
    }
  }, 10000)
}

// ==================== 内部辅助 ====================

function 结算回合(ctx) {
  ctx.战局 = 引擎.结算(ctx.战局, ctx.红方出招, ctx.黑方出招)
  ctx.红方出招 = null
  ctx.黑方出招 = null
  ctx.出招计时 = Date.now() + 9999 * 1000
  
  battleRepo.updateBattleStatus(ctx.战局.战局描述.id, ctx.战局.战局描述.状态, {
    当前回合: ctx.战局.战局描述.当前回合,
    战胜方玩家名称: ctx.战局.战局描述.战胜方玩家名称,
    战局: ctx.战局,
  })
  
  const 回合数据 = 引擎.当前回合数据(ctx.战局)
  const 已出招 = true
  
  const 红方socket = onlineMap.getOnlineInfoByUsername(ctx.战局.战局描述.红方用户名)?.socket
  const 黑方socket = onlineMap.getOnlineInfoByUsername(ctx.战局.战局描述.黑方用户名)?.socket
  
  if (红方socket) {
    红方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招 })
  }
  if (黑方socket) {
    黑方socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招 })
  }
  
  if (ctx.战局.战局描述.状态 === '已结束') {
    const idx = 战局上下文列表.indexOf(ctx)
    if (idx !== -1) {
      战局上下文列表.splice(idx, 1)
    }
    // 恢复玩家状态为空闲
    const 红方用户名 = ctx.战局.战局描述.红方用户名
    const 黑方用户名 = ctx.战局.战局描述.黑方用户名
    onlineMap.setUserStatusByUsername(红方用户名, '空闲')
    onlineMap.setUserStatusByUsername(黑方用户名, '空闲')
    广播在线用户列表()
  }
}

export function 广播在线用户列表() {
  const 列表 = getOnlineUserList()
  io.emit('online-user-push', 列表)
}

/**
 * 获取用户当前战局状态
 */
export function getCurrentState(用户名) {
  const ctx = 战局上下文列表.find(c => {
    const desc = c.战局?.战局描述
    return desc?.红方用户名 === 用户名 || desc?.黑方用户名 === 用户名
  })
  if (!ctx) return null
  
  const 回合数据 = 引擎.当前回合数据(ctx.战局)
  const 红方是否已出招 = ctx.红方出招 !== null
  const 黑方是否已出招 = ctx.黑方出招 !== null
  
  return {
    ...回合数据,
    红方是否已出招,
    黑方是否已出招,
  }
}

/**
 * 添加聊天消息
 */
export function addChatMessage(用户名, text) {
  const ctx = 战局上下文列表.find(c => {
    const desc = c.战局?.战局描述
    return desc?.红方用户名 === 用户名 || desc?.黑方用户名 === 用户名
  })
  if (!ctx) return false
  
  if (!ctx.聊天记录) ctx.聊天记录 = []
  
  ctx.聊天记录.push({
    用户名,
    文本: text,
    时间: Date.now(),
  })
  
  const 对方用户名 = ctx.战局.战局描述.红方用户名 === 用户名 
    ? ctx.战局.战局描述.黑方用户名 
    : ctx.战局.战局描述.红方用户名
  
  const 对方在线 = onlineMap.getOnlineInfoByUsername(对方用户名)
  if (对方在线?.socket) {
    对方在线.socket.emit('chat-message', {
      用户名,
      文本: text,
    })
  }
  
  return true
}

/**
 * 获取聊天记录
 */
export function getChatMessages(用户名) {
  const ctx = 战局上下文列表.find(c => {
    const desc = c.战局?.战局描述
    return desc?.红方用户名 === 用户名 || desc?.黑方用户名 === 用户名
  })
  if (!ctx || !ctx.聊天记录) return []
  
  return ctx.聊天记录
}

export function createAiBattle(socket, 玩家用户名, aiOpponentId) {
  const aiOpponent = aiOpponentRepo.findAiOpponentById(aiOpponentId)
  if (!aiOpponent) {
    socket.emit('pk-push', { success: false, 原因: 'AI对手不存在' })
    return
  }

  const 玩家用户 = userRepo.findUserByUsername(玩家用户名)
  if (!玩家用户) {
    socket.emit('pk-push', { success: false, 原因: '玩家不存在' })
    return
  }

  const 玩家配置 = 玩家用户.配置
  if (!玩家配置.主将) {
    socket.emit('pk-push', { success: false, 原因: '玩家未配置武将' })
    return
  }

  const ai配置 = aiOpponent.配置
  if (!ai配置.主将) {
    socket.emit('pk-push', { success: false, 原因: 'AI对手未配置武将' })
    return
  }

  // 检查玩家是否空闲
  const 玩家状态 = onlineMap.getUserStatusByUsername(玩家用户名)
  if (玩家状态 !== '空闲') {
    socket.emit('pk-push', { success: false, 原因: '玩家当前不在空闲状态' })
    return
  }

  // 检查玩家是否已经在战局中
  const 已有战局 = 战局上下文列表.find(ctx => {
    const desc = ctx.战局.战局描述
    return desc.红方用户名 === 玩家用户名 || desc.黑方用户名 === 玩家用户名
  })
  if (已有战局) {
    socket.emit('pk-push', { success: false, 原因: '玩家已经在战局中' })
    return
  }

  const ai用户名 = aiOpponent.名称 + '(电脑)'
  const 战局id = 'battle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  const 战局 = 引擎.初始化(战局id, 玩家用户名, 玩家配置, ai用户名, ai配置)

  battleRepo.createBattle({ 战局 })

  const 上下文 = {
    战局,
    红方出招: null,
    黑方出招: null,
    出招计时: Date.now() + 9999 * 1000,
    连续断连次数: 0,
    人机类型: aiOpponent.类型,
  }
  战局上下文列表.push(上下文)

  // 设置玩家状态为战局中
  onlineMap.setUserStatusByUsername(玩家用户名, '战局中')

  const 回合数据 = 引擎.当前回合数据(战局)
  socket.emit('pk-push', { success: true, 战局: 回合数据, 已出招: false })
  
  广播在线用户列表()
}
