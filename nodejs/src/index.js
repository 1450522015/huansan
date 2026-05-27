import express from 'express'
import cors from 'cors'
import http from 'http'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from '#src/config/env.js'
import { openSqlite } from '#src/db/sqlite.js'
import { authRouter } from '#src/routes/auth.js'
import { configRouter } from '#src/routes/config.js'
import { attrsRouter } from '#src/routes/attrs.js'
import { adminRouter } from '#src/routes/admin.js'
import { hallRouter } from '#src/routes/hall.js'
import { battleRouter } from '#src/routes/battle.js'
import * as onlineMap from '#src/services/onlineMap.js'
import * as loggedInUsers from '#src/services/loggedInUsers.js'
import * as userRepo from '#src/repositories/userRepo.js'
import * as battleRepo from '#src/repositories/battleRepo.js'
import * as battleService from '#src/services/battleService.js'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: true, credentials: true },
})

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

app.use((req, _res, next) => {
  req.io = io
  next()
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
  if (oldInfo) {
    oldInfo.socket.disconnect(true)
  }

  onlineMap.addOnline(userId, socket.id, 用户名, socket)
  socket.emit('欢迎', { 消息: '长连接已建立' })

  battleService.handleReconnect(socket, 用户名)
  battleService.广播在线用户列表()

  socket.on('ping', () => {
    onlineMap.updatePingTime(userId)
    socket.emit('pong', { 时间: Date.now() })
  })

  socket.on('online-user-pull', () => {
    socket.emit('online-user-push', battleService.getOnlineUserList())
  })

  socket.on('pk-request', (数据) => battleService.handlePkRequest(socket, 数据?.目标用户名))
  socket.on('pk-invite-pull', () => battleService.handlePkInvitePull(socket))
  socket.on('pk-reject', (数据) => battleService.handlePkRejectByUsername(socket, 数据?.邀请者用户名))
  socket.on('pk-agree', (数据) => battleService.handlePkAgreeByUsername(socket, 数据?.邀请者用户名))
  socket.on('pk-plan', (数据) => battleService.handlePkPlan(socket, 数据))

  socket.on('pk-ai-start', (数据) => battleService.createAiBattle(socket, 用户名, 数据?.aiOpponentId))

  socket.on('login-exit', () => {
    battleService.handleDisconnect(用户名)
    onlineMap.removeOnline(userId)
    loggedInUsers.removeLoggedInUser(userId)
    // 移除该用户作为发起方的战局等候
    battleService.removeWaitingByInitiator(用户名)
    io.emit('online-user-push', battleService.getOnlineUserList())
    socket.disconnect(true)
  })

  socket.on('disconnect', () => {
    const currentInfo = onlineMap.getOnlineInfo(userId)
    if (currentInfo && currentInfo.socketId !== socket.id) {
      return
    }

    battleService.handleDisconnect(用户名)

    onlineMap.removeOnline(userId)
    io.emit('online-user-push', battleService.getOnlineUserList())
  })
})

function main() {
  openSqlite()
  battleRepo.endAllActiveBattles('服务器重启，战局终止')
  battleService.init(io)
  startHeartbeatCheck(io)
  server.listen(env.port, () => {
    console.log(`[huansan] HTTP+WS 监听 ${env.port}`)
  })
}

let 心跳检测定时器 = null

function startHeartbeatCheck(serverIo) {
  if (心跳检测定时器) clearInterval(心跳检测定时器)
  心跳检测定时器 = setInterval(() => {
    const now = Date.now()
    const 需移除 = []
    for (const [userId, info] of onlineMap.getEntries()) {
      if (!info) continue
      if (now - info.ping时间 > 10000) {
        需移除.push({ userId, 用户名: info.用户名, socketId: info.socketId })
      }
    }
    if (需移除.length === 0) return
    for (const { userId, 用户名, socketId } of 需移除) {
      const currentInfo = onlineMap.getOnlineInfo(userId)
      if (!currentInfo || currentInfo.socketId !== socketId) continue
      currentInfo.socket.disconnect(true)
      battleService.handleDisconnect(用户名)
      onlineMap.removeOnline(userId)
    }
    serverIo.emit('online-user-push', battleService.getOnlineUserList())
  }, 5000)
}

process.on('SIGTERM', () => {
  battleService.destroyAll()
  if (心跳检测定时器) clearInterval(心跳检测定时器)
  server.close()
})

process.on('SIGINT', () => {
  battleService.destroyAll()
  if (心跳检测定时器) clearInterval(心跳检测定时器)
  server.close()
})

try {
  main()
} catch (e) {
  console.error(e)
  process.exit(1)
}
