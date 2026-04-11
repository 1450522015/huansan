import express from 'express'
import cors from 'cors'
import http from 'http'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'
import { Server } from 'socket.io'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'
import { configRouter } from './routes/config.js'
import { attrsRouter } from './routes/attrs.js'
import { adminRouter } from './routes/admin.js'

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

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ 错误: '服务器错误' })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: true, credentials: true },
})

io.on('connection', (socket) => {
  socket.emit('欢迎', { 消息: 'V1 长连接已建立，后续用于实时对战' })
  socket.on('ping', () => socket.emit('pong', { 时间: Date.now() }))
})

async function main() {
  await mongoose.connect(env.mongoUri)
  server.listen(env.port, () => {
    console.log(`[huansan] HTTP+WS 监听 ${env.port}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
