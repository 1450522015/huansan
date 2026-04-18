import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import * as battleRepo from '../repositories/battleRepo.js'
import * as userRepo from '../repositories/userRepo.js'
import * as aiOpponentRepo from '../repositories/aiOpponentRepo.js'
import * as battleApp from '../services/battleApplicationService.js'
import { buildBattleCurrentSnapshot } from '../services/battleCurrentPayload.js'

export const battleRouter = Router()

battleRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

battleRouter.use(authRequired)

battleRouter.get('/current', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })

    const battle = battleRepo.findUserActiveBattle(me.用户名) || battleRepo.findUserLatestBattle(me.用户名)
    if (!battle) return res.json({ 战局: null })

    const snapshot = buildBattleCurrentSnapshot(battle, me.用户名)
    if (!snapshot) return res.json({ 战局: null })

    return res.json(snapshot)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '读取战局失败' })
  }
})

battleRouter.post('/round/start', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })
    const result = battleApp.startRound(me.用户名)
    if (!result.ok) return res.status(result.code || 500).json({ 错误: result.error || '开始回合失败' })
    return res.json({ ok: true, ...result.payload })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '开始回合失败' })
  }
})

battleRouter.post('/actions/submit', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })
    const result = battleApp.submitActions(me.用户名, req.body || {})
    if (!result.ok) return res.status(result.code || 500).json({ 错误: result.error || '提交出招失败' })
    return res.json({ ...result.payload, 已提交: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '提交出招失败' })
  }
})

battleRouter.post('/flee', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })
    const result = battleApp.fleeBattle(me.用户名)
    if (!result.ok) return res.status(result.code || 500).json({ 错误: result.error || '逃跑失败' })
    return res.json(result.payload)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '逃跑失败' })
  }
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

battleRouter.post('/ai-start', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })
    const { 人机ID } = req.body || {}
    if (!人机ID) return res.status(400).json({ 错误: '缺少人机ID' })
    const result = battleApp.startAiBattle(me.用户名, 人机ID)
    if (!result.ok) return res.status(result.code || 500).json({ 错误: result.error || '创建人机战局失败' })
    return res.json({ ok: true, 战局ID: result.battle.id })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '创建人机战局失败' })
  }
})
