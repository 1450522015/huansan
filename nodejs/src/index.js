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
import { getDb } from './db/sqlite.js'
import { getDefaultConfig, normalizeConfigDeep } from './services/defaultConfig.js'

function safeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return getDefaultConfig()
  return normalizeConfigDeep(raw)
}

/** 战局内单位 key 一律以「发起方 = self、目标方 = enemy」，与客户端「当前用户 = self」区分，由客户端自行映射 */
function canonicalBattleUnits(battle) {
  const starter = userRepo.findUserByUsername(battle.发起用户名)
  const target = userRepo.findUserByUsername(battle.目标用户名)
  if (!starter || !target) return null
  const starterSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.发起用户名)
  const targetSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.目标用户名)
  const starterCfg = safeConfig(starterSnap ?? starter.配置)
  const targetCfg = safeConfig(targetSnap ?? target.配置)
  return battleEngine.buildRoundData(
    Number(battle.id),
    battle.发起用户名,
    battle.目标用户名,
    starterCfg,
    targetCfg,
  )
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
    socket.data.userId = String(payload.uid)
    const user = userRepo.findUserById(socket.data.userId)
    if (user) socket.data.用户名 = user.用户名
    next()
  } catch {
    next(new Error('登录已失效'))
  }
})

io.on('connection', (socket) => {
  const userId = socket.data.userId
  const 用户名 = socket.data.用户名 || ''

  onlineMap.addOnline(userId, socket.id, 用户名)
  socket.emit('欢迎', { 消息: 'V1 长连接已建立' })
  io.emit('online-change', { 在线列表: onlineMap.getOnlineList() })

  socket.on('ping', () => socket.emit('pong', { 时间: Date.now() }))

  // 上线时检查是否有等待中的 PK 邀请需要推送
  const pendingBattle = battleRepo.findUserPendingBattle(用户名)
  if (pendingBattle) {
    const 发起用户 = userRepo.findUserByUsername(pendingBattle.发起用户名)
    let 发起转数 = 0, 发起等级 = 1, 发起职业串 = ''
    if (发起用户?.配置?.主将) {
      发起转数 = 发起用户.配置.主将.转数 ?? 0
      发起等级 = 发起用户.配置.主将.等级 ?? 1
      发起职业串 = 职业经历To简串(发起用户.配置.主将.职业经历)
    }
    // 延迟 500ms 推送，等客户端绑定好事件监听
    setTimeout(() => {
      socket.emit('pk-request', {
        发起用户名: pendingBattle.发起用户名,
        发起转数,
        发起等级,
        发起职业串,
      })
    }, 500)
  }

  // PK 挑战：A 发起 → 创建战局 → 如果 B 在线立即推送，否则等 B 上线后自动推送
  socket.on('pk-challenge', (data) => {
    const 目标用户名 = String(data?.目标用户名 ?? '').trim()
    if (!目标用户名) {
      socket.emit('pk-result', { 同意: false, 原因: '缺少目标用户名' })
      return
    }
    // 不允许对自己发起 PK
    if (目标用户名 === 用户名) {
      socket.emit('pk-result', { 同意: false, 原因: '不能对自己发起PK' })
      return
    }
    // 查找目标用户
    const 目标用户 = userRepo.findUserByUsername(目标用户名)
    if (!目标用户) {
      socket.emit('pk-result', { 同意: false, 原因: '用户不存在' })
      return
    }
    // 发起方必须已认证 (已被移除，改为均可PK)
    const 发起用户 = userRepo.findUserById(userId)
    
    // 任一方已在等待或战局中则不可再发起（避免重复占用）
    if (battleRepo.findUserActiveBattle(用户名) || battleRepo.findUserActiveBattle(目标用户名)) {
      socket.emit('pk-result', { 同意: false, 原因: '已有进行中的战局或 PK 邀请' })
      return
    }
    // 提取发起方主将摘要
    let 发起转数 = 0, 发起等级 = 1, 发起职业串 = ''
    if (发起用户?.配置?.主将) {
      发起转数 = 发起用户.配置.主将.转数 ?? 0
      发起等级 = 发起用户.配置.主将.等级 ?? 1
      发起职业串 = 职业经历To简串(发起用户.配置.主将.职业经历)
    }
    // 提取目标方主将摘要
    let 目标转数 = 0, 目标等级 = 1, 目标职业串 = ''
    if (目标用户?.配置?.主将) {
      目标转数 = 目标用户.配置.主将.转数 ?? 0
      目标等级 = 目标用户.配置.主将.等级 ?? 1
      目标职业串 = 职业经历To简串(目标用户.配置.主将.职业经历)
    }
    // 创建战局记录
    const battle = battleRepo.createBattle({ 发起用户名: 用户名, 目标用户名 })
    // 将 battleId 绑定到 socket 以便后续取消/断线时使用
    socket.data.pendingBattleId = battle.id
    // 通知 A 挑战已发出，附带双方完整信息
    socket.emit('pk-sent', {
      目标用户名,
      目标转数,
      目标等级,
      目标职业串,
      发起转数,
      发起等级,
      发起职业串,
    })
    // 如果 B 在线，立即推送 PK 请求
    const 目标info = onlineMap.getOnlineInfo(String(目标用户._id))
    if (目标info) {
      io.to(目标info.socketId).emit('pk-request', {
        发起用户名: 用户名,
        发起转数,
        发起等级,
        发起职业串,
      })
    }
  })

  // PK 取消：发起方主动取消
  socket.on('pk-cancel', (data) => {
    const 目标用户名 = String(data?.目标用户名 ?? '').trim()
    if (!目标用户名) return
    // 删除等待中的战局（不保留已取消记录）
    const battle = battleRepo.findActiveBattle(用户名, 目标用户名)
    if (battle && battle.状态 === '等待中') {
      battleRepo.deleteBattle(battle.id)
    }
    socket.data.pendingBattleId = null
    const 目标用户 = userRepo.findUserByUsername(目标用户名)
    if (!目标用户) return
    const 目标info = onlineMap.getOnlineInfo(String(目标用户._id))
    if (!目标info) return
    // 通知目标用户：对方取消了 PK
    io.to(目标info.socketId).emit('pk-cancel', {
      发起用户名: 用户名,
      目标用户名,
    })
  })

  // PK 回复：B 回复 → 服务端转发给 A
  socket.on('pk-response', (data) => {
    const 发起用户名 = String(data?.发起用户名 ?? '').trim()
    const 同意 = !!data?.同意
    if (!发起用户名) return
    // 更新战局状态
    const battle = battleRepo.findActiveBattle(发起用户名, 用户名)
    if (battle) {
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
        // 对方拒绝，删除战局（不保留已取消记录）
        battleRepo.deleteBattle(battle.id)
      }
    }
    // 查找发起方
    const 发起用户 = userRepo.findUserByUsername(发起用户名)
    if (!发起用户) return
    const 发起info = onlineMap.getOnlineInfo(String(发起用户._id))
    if (!发起info) return
    io.to(发起info.socketId).emit('pk-result', {
      目标用户名: 用户名,
      同意,
      原因: 同意 ? '对方接受了挑战' : '对方拒绝了挑战',
    })
  })

  socket.on('battle-round-start', () => {
    const me = userRepo.findUserById(userId)
    if (!me) return
    const battle = battleRepo.findUserActiveBattle(me.用户名)
    if (!battle || battle.状态 !== '战局中') {
      socket.emit('battle-error', { 错误: '当前不在战局中' })
      return
    }
    const newRoundNum = battleRepo.computePendingRoundNum(battle)
    const existingRound = battleEngine.getRoundData(Number(battle.id), newRoundNum)
    const canonical = canonicalBattleUnits(battle)
    if (!canonical) {
      socket.emit('battle-error', { 错误: '战局数据异常：找不到双方用户' })
      return
    }
    const { units } = canonical
    battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)
    const 发起info = onlineMap.getOnlineInfoByUsername(battle.发起用户名)
    const 目标info = onlineMap.getOnlineInfoByUsername(battle.目标用户名)
    const roundStartedBase = {
      发起用户名: battle.发起用户名,
      目标用户名: battle.目标用户名,
      超时毫秒: battleEngine.getRoundTimeoutMs(),
      服务器时间: Date.now(),
    }
    if (existingRound) {
      const payload = {
        回合数: newRoundNum,
        units,
        ...roundStartedBase,
      }
      if (发起info) io.to(发起info.socketId).emit('round-started', payload)
      if (目标info) io.to(目标info.socketId).emit('round-started', payload)
      return
    }

    battleRepo.updateBattleStatus(battle.id, '战局中', {
      当前回合: newRoundNum,
      回合数: newRoundNum,
    })

    const payload = {
      回合数: newRoundNum,
      units,
      ...roundStartedBase,
    }
    if (发起info) io.to(发起info.socketId).emit('round-started', payload)
    if (目标info) io.to(目标info.socketId).emit('round-started', payload)
  })

  socket.on('battle-actions-submit', async (data) => {
    try {
      const me = userRepo.findUserById(userId)
      if (!me) { socket.emit('battle-error', { 错误: '用户不存在' }); return }

      const battle = battleRepo.findUserActiveBattle(me.用户名)
      if (!battle || battle.状态 !== '战局中') {
        socket.emit('battle-error', { 错误: '当前不在战局中' })
        return
      }

      const { 回合数, 出招列表, 使用自动 } = data || {}
      if (!Array.isArray(出招列表)) {
        socket.emit('battle-error', { 错误: '出招列表格式错误' })
        return
      }

      const roundNum = Number(回合数) || battleRepo.computePendingRoundNum(battle)
      const meIsStarter = battle.发起用户名 === me.用户名

      const canonical = canonicalBattleUnits(battle)
      if (!canonical) { socket.emit('battle-error', { 错误: '对手不存在' }); return }
      const { units } = canonical

      battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)
      let actions = 出招列表
      if (!meIsStarter) {
        actions = battleEngine.swapActionKeys(actions)
      }
      if (使用自动) {
        actions = battleEngine.fillAutoActions(
          battleEngine.createDefaultActions(meIsStarter, units),
          units,
        )
      }

      const existingRound = battleEngine.getRoundData(Number(battle.id), roundNum)
      if (existingRound) {
        const updated = meIsStarter
          ? { ...existingRound, 发起方出招: actions }
          : { ...existingRound, 目标方出招: actions }

        getDb().prepare(
          `UPDATE battle_rounds SET 发起方出招 = ?, 目标方出招 = ? WHERE id = ?`
        ).run(JSON.stringify(updated.发起方出招), JSON.stringify(updated.目标方出招), existingRound.id)

        if (updated.发起方出招.length > 0 && updated.目标方出招.length > 0) {
          const 对方已提交 = meIsStarter
            ? updated.目标方出招.some(a => a.操作 !== null)
            : updated.发起方出招.some(a => a.操作 !== null)
          if (!对方已提交) {
            socket.emit('actions-submitted', { ok: true, 双方就绪: false })
            return
          }
          const result = battleEngine.resolveRound(
            {
              ...updated,
              selfCfg: canonical.selfCfg || null,
              enemyCfg: canonical.enemyCfg || null,
            },
            units,
          )
          const endCheck = battleEngine.checkBattleEnd(result.state, units)

          getDb().prepare(`UPDATE battle_rounds SET 战斗日志 = ?, 战斗过程 = ? WHERE id = ?`)
            .run(JSON.stringify(result.日志), JSON.stringify(result.过程 || []), existingRound.id)

          if (endCheck.结束) {
            battleEngine.clearRuntimeState(Number(battle.id))
            battleRepo.updateBattleStatus(battle.id, '已结束', {
              备注: endCheck.原因,
              回合数: roundNum,
              结束时间: new Date().toISOString(),
            })
          } else {
            battleRepo.updateBattleStatus(battle.id, '战局中', {
              当前回合: roundNum + 1,
              回合数: roundNum,
            })
          }

          const 发起info = onlineMap.getOnlineInfoByUsername(battle.发起用户名)
          const 目标info = onlineMap.getOnlineInfoByUsername(battle.目标用户名)
          let 胜利方用户名 = null
          if (endCheck.结束) {
            胜利方用户名 = endCheck.胜者 === '我方' ? battle.发起用户名 : battle.目标用户名
          }
          const roundResultData = {
            发起用户名: battle.发起用户名,
            回合数: roundNum,
            战斗日志: result.日志,
            战斗过程: result.过程 || [],
            单位状态: battleEngine.buildUnitStateList(units, result.state),
            战局结束: endCheck.结束,
            胜者: endCheck.胜者 || null,
            胜利方用户名,
            原因: endCheck.原因 || null,
            下一回合: endCheck.结束 ? null : roundNum + 1,
          }
          if (发起info) io.to(发起info.socketId).emit('round-result', roundResultData)
          if (目标info) io.to(目标info.socketId).emit('round-result', roundResultData)

          socket.emit('actions-submitted', { ok: true, 双方就绪: true, ...roundResultData })
          return
        }

        socket.emit('actions-submitted', { ok: true, 双方就绪: false })
        return
      }

      const emptyStarterActions = battleEngine.createDefaultActions(true, units)
      const emptyTargetActions = battleEngine.createDefaultActions(false, units)
      const 发起方出招 = meIsStarter ? actions : emptyStarterActions
      const 目标方出招 = meIsStarter ? emptyTargetActions : actions

      battleEngine.saveRoundData(Number(battle.id), roundNum, 发起方出招, 目标方出招, [])
      socket.emit('actions-submitted', { ok: true, 双方就绪: false })
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

  socket.on('disconnect', () => {
    // 发起方断线时，取消其等待中的战局
    if (socket.data.pendingBattleId) {
      const battle = battleRepo.findBattleById(socket.data.pendingBattleId)
      if (battle && battle.状态 === '等待中') {
        // 发起方断线，删除战局（不保留已取消记录）
        battleRepo.deleteBattle(battle.id)
        // 通知被挑战方
        const 目标用户 = userRepo.findUserByUsername(battle.目标用户名)
        if (目标用户) {
          const 目标info = onlineMap.getOnlineInfo(String(目标用户._id))
          if (目标info) {
            io.to(目标info.socketId).emit('pk-cancel', {
              发起用户名: 用户名,
              目标用户名: battle.目标用户名,
            })
          }
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
