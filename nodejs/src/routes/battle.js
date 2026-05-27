import { Router } from 'express'
import { authRequired } from '#src/middleware/auth.js'
import * as userRepo from '#src/repositories/userRepo.js'
import * as aiOpponentRepo from '#src/repositories/aiOpponentRepo.js'
import * as battleService from '#src/services/battleService.js'

export const battleRouter = Router()
battleRouter.use(authRequired)

battleRouter.get('/current', (req, res) => {
  const 用户名 = userRepo.findUserById(String(req.userId))?.用户名
  if (!用户名) return res.status(401).json({ 错误: '用户不存在' })

  const state = battleService.getCurrentState(用户名)
  return res.json(state)
})

battleRouter.get('/ai-opponents', (_req, res) => {
  try {
    const list = aiOpponentRepo.listAllAiOpponents()
    return res.json({ list })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询人机列表失败' })
  }
})

battleRouter.post('/chat', (req, res) => {
  const 用户名 = userRepo.findUserById(String(req.userId))?.用户名
  if (!用户名) return res.status(401).json({ 错误: '用户不存在' })

  const text = String(req.body?.text || '').slice(0, 1024).trim()
  if (!text) return res.json({ success: false, message: '消息不能为空' })

  const result = battleService.addChatMessage(用户名, text)
  if (!result) return res.json({ success: false, message: '不在战局中' })

  return res.json({ success: true })
})

battleRouter.get('/chat/recent', (req, res) => {
  const 用户名 = userRepo.findUserById(String(req.userId))?.用户名
  if (!用户名) return res.status(401).json({ 错误: '用户不存在' })

  const messages = battleService.getChatMessages(用户名)
  return res.json({ messages })
})
