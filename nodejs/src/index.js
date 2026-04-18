import express from 'express'
import cors from 'cors'
import http from 'http'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from './config/env.js'
import { openSqlite } from './db/sqlite.js'
import { authRouter } from './routes/auth.js'
import { configRouter } from './routes/config.js'
import { attrsRouter } from './routes/attrs.js'
import { adminRouter } from './routes/admin.js'
import { hallRouter } from './routes/hall.js'
import { battleRouter } from './routes/battle.js'
import * as onlineMap from './services/onlineMap.js'
import * as userRepo from './repositories/userRepo.js'
import { 职业经历To简串 } from './repositories/userRepo.js'
import * as battleRepo from './repositories/battleRepo.js'
import * as battleEngine from './services/battleEngine.js'
import * as battleApp from './services/battleApplicationService.js'
import { getDefaultConfig, normalizeConfigDeep } from './services/defaultConfig.js'

function safeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return getDefaultConfig()
  return normalizeConfigDeep(raw)
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

const limiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

app.get('/api/health', (_req, res) => {
  res.json({ 状态: 'ok' })
})

app.use('/api', authRouter)
app.use('/api/config', configRouter)
app.use('/api/attrs', attrsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/hall', hallRouter)
app.use('/api/battle', battleRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ 错误: '服务器错误' })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: true, credentials: true },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('未登录'))
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const user = userRepo.findUserById(String(payload.uid))
    if (!user) return next(new Error('用户不存在'))
    if (payload.tv !== user.token_version) return next(new Error('已在其他设备登录'))
    socket.data.userId = String(payload.uid)
    socket.data.用户名 = user.用户名
    next()
  } catch (e) {
    next(new Error(e.message || '登录已失效'))
  }
})

io.on('connection', (socket) => {
  const userId = socket.data.userId
  const 用户名 = socket.data.用户名 || ''

  const oldInfo = onlineMap.getOnlineInfo(userId)
  if (oldInfo && oldInfo.oldSocket) {
    oldInfo.oldSocket.disconnect(true)
  }

  onlineMap.addOnline(userId, socket.id, 用户名, socket)
  socket.emit('欢迎', { 消息: 'V1 长连接已建立' })
  io.emit('online-change', { 在线列表: onlineMap.getOnlineList() })

  socket.on('ping', () => socket.emit('pong', { 时间: Date.now() }))

  const pendingBattle = battleRepo.findUserPendingBattle(用户名)
  if (pendingBattle) {
    const 发起用户 = userRepo.findUserByUsername(pendingBattle.发起用户名)
    let 发起转数 = 0, 发起等级 = 1, 发起职业串 = ''
    if (发起用户?.配置?.主将) {
      发起转数 = 发起用户.配置.主将.转数 ?? 0
      发起等级 = 发起用户.配置.主将.等级 ?? 1
      发起职业串 = 职业经历To简串(发起用户.配置.主将.职业经历)
    }
    setTimeout(() => {
      socket.emit('pk-request', {
        发起用户名: pendingBattle.发起用户名,
        发起转数,
        发起等级,
        发起职业串,
      })
    }, 500)
  }

  socket.on('pk-check-pending', () => {
    const pending = battleRepo.findUserPendingBattle(用户名)
    if (!pending) return
    const 发起用户 = userRepo.findUserByUsername(pending.发起用户名)
    let 发起转数 = 0, 发起等级 = 1, 发起职业串 = ''
    if (发起用户?.配置?.主将) {
      发起转数 = 发起用户.配置.主将.转数 ?? 0
      发起等级 = 发起用户.配置.主将.等级 ?? 1
      发起职业串 = 职业经历To简串(发起用户.配置.主将.职业经历)
    }
    socket.emit('pk-request', {
      发起用户名: pending.发起用户名,
      发起转数,
      发起等级,
      发起职业串,
    })
  })

  socket.on('pk-challenge', (data) => {
    const 目标用户名 = String(data?.目标用户名 ?? '').trim()
    if (!目标用户名) {
      socket.emit('pk-result', { 同意: false, 原因: '缺少目标用户名' })
      return
    }
    if (目标用户名 === 用户名) {
      socket.emit('pk-result', { 同意: false, 原因: '不能对自己发起PK' })
      return
    }
    const 目标用户 = userRepo.findUserByUsername(目标用户名)
    if (!目标用户) {
      socket.emit('pk-result', { 同意: false, 原因: '用户不存在' })
      return
    }
    const 发起用户 = userRepo.findUserById(userId)

    if (battleRepo.findUserActiveBattle(用户名) || battleRepo.findUserActiveBattle(目标用户名)) {
      socket.emit('pk-result', { 同意: false, 原因: '已有进行中的战局或 PK 邀请' })
      return
    }
    let 发起转数 = 0, 发起等级 = 1, 发起职业串 = ''
    if (发起用户?.配置?.主将) {
      发起转数 = 发起用户.配置.主将.转数 ?? 0
      发起等级 = 发起用户.配置.主将.等级 ?? 1
      发起职业串 = 职业经历To简串(发起用户.配置.主将.职业经历)
    }
    let 目标转数 = 0, 目标等级 = 1, 目标职业串 = ''
    if (目标用户?.配置?.主将) {
      目标转数 = 目标用户.配置.主将.转数 ?? 0
      目标等级 = 目标用户.配置.主将.等级 ?? 1
      目标职业串 = 职业经历To简串(目标用户.配置.主将.职业经历)
    }
    const battle = battleRepo.createBattle({ 发起用户名: 用户名, 目标用户名 })
    socket.data.pendingBattleId = battle.id
    socket.emit('pk-sent', {
      目标用户名,
      目标转数,
      目标等级,
      目标职业串,
      发起转数,
      发起等级,
      发起职业串,
    })
    const 目标info = onlineMap.getOnlineInfoByUsername(目标用户名)
    if (目标info) {
      io.to(目标info.socketId).emit('pk-request', {
        发起用户名: 用户名,
        发起转数,
        发起等级,
        发起职业串,
      })
    }
  })

  socket.on('pk-cancel', (data) => {
    const 目标用户名 = String(data?.目标用户名 ?? '').trim()
    if (!目标用户名) return
    const battle = battleRepo.findActiveBattle(用户名, 目标用户名)
    if (battle && battle.状态 === '等待中') {
      battleRepo.deleteBattle(battle.id)
    }
    socket.data.pendingBattleId = null
    const 目标info = onlineMap.getOnlineInfoByUsername(目标用户名)
    if (!目标info) return
    io.to(目标info.socketId).emit('pk-cancel', {
      发起用户名: 用户名,
      目标用户名,
    })
  })

  socket.on('pk-response', (data) => {
    const 发起用户名 = String(data?.发起用户名 ?? '').trim()
    const 同意 = !!data?.同意
    if (!发起用户名) return
    const battle = battleRepo.findActiveBattle(发起用户名, 用户名)
    if (!battle) {
      socket.emit('pk-result', { 同意: false, 原因: '对方已离开' })
      return
    }
    if (同意) {
      const 发起方快照源 = userRepo.findUserByUsername(发起用户名)
      const 目标方快照源 = userRepo.findUserByUsername(用户名)
      battleRepo.updateBattleStatus(battle.id, '战局中', {
        备注: null,
        当前回合: 1,
        回合数: 0,
        发起方配置快照: JSON.stringify(safeConfig(发起方快照源?.配置)),
        目标方配置快照: JSON.stringify(safeConfig(目标方快照源?.配置)),
      })
    } else {
      battleRepo.deleteBattle(battle.id)
    }
    const 发起info = onlineMap.getOnlineInfoByUsername(发起用户名)
    if (!发起info) return
    io.to(发起info.socketId).emit('pk-result', {
      目标用户名: 用户名,
      同意,
      原因: 同意 ? '对方接受了挑战' : '对方拒绝了挑战',
    })
  })

  socket.on('battle-round-start', () => {
    const result = battleApp.startRound(用户名)
    if (!result.ok) {
      socket.emit('battle-error', { 错误: result.error || '开始回合失败' })
      return
    }
    const { battle, payload } = result
    const 发起info = onlineMap.getOnlineInfoByUsername(battle.发起用户名)
    const 目标info = onlineMap.getOnlineInfoByUsername(battle.目标用户名)
    if (发起info) io.to(发起info.socketId).emit('round-started', payload)
    if (目标info) io.to(目标info.socketId).emit('round-started', payload)
  })

  socket.on('battle-actions-submit', async (data) => {
    try {
      const result = battleApp.submitActions(用户名, data)
      if (!result.ok) {
        socket.emit('battle-error', { 错误: result.error || '提交出招失败' })
        return
      }
      if (result.payload?.双方就绪) {
        const battle = result.battle
        const 发起info = onlineMap.getOnlineInfoByUsername(battle.发起用户名)
        const 目标info = onlineMap.getOnlineInfoByUsername(battle.目标用户名)
        if (发起info) io.to(发起info.socketId).emit('round-result', result.roundResultData)
        if (目标info) io.to(目标info.socketId).emit('round-result', result.roundResultData)
      }
      socket.emit('actions-submitted', result.payload)
    } catch (e) {
      console.error(e)
      socket.emit('battle-error', { 错误: '提交出招失败' })
    }
  })

  socket.on('battle-chat', (data) => {
    const me = userRepo.findUserById(userId)
    if (!me) return
    const text = String(data?.text || '').slice(0, 1024)
    if (!text) return
    const battle = battleRepo.findUserActiveBattle(me.用户名)
    if (!battle || battle.状态 !== '战局中') return
    const opponentName = battle.发起用户名 === me.用户名 ? battle.目标用户名 : battle.发起用户名
    const info = onlineMap.getOnlineInfoByUsername(opponentName)
    const payload = { from: me.用户名, text, time: Date.now() }
    if (info) io.to(info.socketId).emit('battle-chat', payload)
    socket.emit('battle-chat', payload)
  })

  socket.on('battle-flee', () => {
    const result = battleApp.fleeBattle(用户名)
    if (!result.ok) {
      socket.emit('battle-error', { 错误: result.error || '逃跑失败' })
      return
    }
    const battle = result.battle
    const otherName = battle.发起用户名 === 用户名 ? battle.目标用户名 : battle.发起用户名
    const otherInfo = onlineMap.getOnlineInfoByUsername(otherName)
    if (otherInfo) {
      io.to(otherInfo.socketId).emit('battle-fled', { 逃跑方: 用户名, 原因: result.payload.备注 })
    }
    socket.emit('actions-submitted', { ok: true, 已逃跑: true, 备注: result.payload.备注 })
  })

  socket.on('disconnect', () => {
    const currentInfo = onlineMap.getOnlineInfo(userId)
    if (currentInfo && currentInfo.socketId !== socket.id) {
      return
    }

    if (socket.data.pendingBattleId) {
      const battle = battleRepo.findBattleById(socket.data.pendingBattleId)
      if (battle && battle.状态 === '等待中') {
        battleRepo.deleteBattle(battle.id)
        const 目标info = onlineMap.getOnlineInfoByUsername(battle.目标用户名)
        if (目标info) {
          io.to(目标info.socketId).emit('pk-cancel', {
            发起用户名: 用户名,
            目标用户名: battle.目标用户名,
          })
        }
      }
      socket.data.pendingBattleId = null
    }
    const activeBattle = battleRepo.findUserActiveBattle(用户名)
    if (activeBattle && activeBattle.状态 === '战局中') {
      const otherName = activeBattle.发起用户名 === 用户名 ? activeBattle.目标用户名 : activeBattle.发起用户名
      const otherOnline = onlineMap.hasOnlineUsername(otherName)
      if (!otherOnline) {
        battleEngine.clearRuntimeState(Number(activeBattle.id))
        battleRepo.updateBattleStatus(activeBattle.id, '已结束', {
          备注: '失去连接',
          回合数: Number(activeBattle.当前回合 || 0),
          结束时间: new Date().toISOString(),
        })
      }
    }
    onlineMap.removeOnline(userId)
    io.emit('online-change', { 在线列表: onlineMap.getOnlineList() })
  })
})

function main() {
  openSqlite()
  battleRepo.endAllActiveBattles('服务器重启，战局终止')
  battleEngine.clearAllRuntimeState()
  server.listen(env.port, () => {
    console.log(`[huansan] HTTP+WS 监听 ${env.port}（战局 GET /api/battle/current、/api/battle/health）`)
  })
}

try {
  main()
} catch (e) {
  console.error(e)
  process.exit(1)
}
