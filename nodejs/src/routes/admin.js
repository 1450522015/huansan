import { Router } from 'express'
import * as userRepo from '#src/repositories/userRepo.js'
import * as battleRepo from '#src/repositories/battleRepo.js'
import * as aiOpponentRepo from '#src/repositories/aiOpponentRepo.js'
import * as battleService from '#src/services/battleService.js'
import { filterUserBattleDisplayLines } from '#common/battleUserBattleText.js'
import { validatePassword } from '#src/utils/validate.js'
import { invalidateUser } from '#src/services/configCache.js'
import { getOnlineUserIds, getOnlineInfo } from '#src/services/onlineMap.js'

export const adminRouter = Router()

function parseUserIdParam(id) {
  const n = Number.parseInt(String(id), 10)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

adminRouter.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 10))
    const keyword = String(req.query.keyword ?? '').trim()
    const login = String(req.query.login ?? 'all').toLowerCase()
    
    const onlineUserIds = getOnlineUserIds()

    const { list, total } = userRepo.listUsersForAdmin({
      page,
      pageSize,
      keyword: keyword || undefined,
      login: login !== 'all' ? login : 'all',
      onlineUserIds,
    })
    const enriched = list.map(u => {
      const onlineInfo = getOnlineInfo(String(u.id))
      return {
        ...u,
        最新在线时间: onlineInfo ? new Date(onlineInfo.ping时间).toISOString() : null,
      }
    })
    return res.json({ list: enriched, total, page, pageSize })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询用户失败' })
  }
})

adminRouter.get('/users/:id/config', async (req, res) => {
  const uid = parseUserIdParam(req.params.id)
  if (uid == null) {
    return res.status(400).json({ 错误: '无效的用户 ID' })
  }
  try {
    const user = userRepo.findUserById(String(uid))
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    return res.json({ 配置: user.配置 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '获取配置失败' })
  }
})

adminRouter.post('/users/:id/config/import', async (req, res) => {
  const uid = parseUserIdParam(req.params.id)
  if (uid == null) {
    return res.status(400).json({ 错误: '无效的用户 ID' })
  }
  const { 配置 } = req.body || {}
  if (!配置 || typeof 配置 !== 'object') {
    return res.status(400).json({ 错误: '缺少配置数据' })
  }
  try {
    const user = userRepo.findUserById(String(uid))
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    const ok = userRepo.updateUserConfig(String(uid), 配置)
    if (!ok) return res.status(404).json({ 错误: '更新配置失败' })
    invalidateUser(String(uid))
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '导入配置失败' })
  }
})

adminRouter.patch('/users/:id/password', async (req, res) => {
  const { 新密码 } = req.body || {}
  const v = validatePassword(新密码)
  if (!v.ok) return res.status(400).json({ 错误: v.消息 })
  const uid = parseUserIdParam(req.params.id)
  if (uid == null) {
    return res.status(400).json({ 错误: '无效的用户 ID' })
  }
  try {
    const ok = userRepo.updateUserPasswordHash(String(uid), v.密码)
    if (!ok) return res.status(404).json({ 错误: '用户不存在' })
    invalidateUser(String(uid))
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '修改密码失败' })
  }
})

adminRouter.get('/battles', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20))
    const 状态 = String(req.query.状态 ?? 'all').trim()

    const { list, total } = battleRepo.listBattlesForAdmin({
      page,
      pageSize,
      状态: 状态 !== 'all' ? 状态 : undefined,
    })
    return res.json({ list, total, page, pageSize })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询战局失败' })
  }
})

adminRouter.get('/battles/:id/debug', async (req, res) => {
  const bid = req.params.id
  if (!bid) {
    return res.status(400).json({ 错误: '无效的战局 ID' })
  }
  try {
    const battle = battleRepo.findBattleById(String(bid))
    if (!battle) return res.status(404).json({ 错误: '战局不存在' })

    const payload = {
      战局数据: battle.战局 || null,
    }
    return res.json(payload)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '获取战局调试信息失败' })
  }
})

adminRouter.get('/ai-opponents', (_req, res) => {
  try {
    const list = aiOpponentRepo.listAllAiOpponents()
    return res.json({ list })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询人机失败' })
  }
})

adminRouter.post('/ai-opponents', (req, res) => {
  try {
    const { 名称, 类型, 配置 } = req.body || {}
    if (!名称 || typeof 名称 !== 'string' || !名称.trim()) {
      return res.status(400).json({ 错误: '名称不能为空' })
    }
    if (!配置 || typeof 配置 !== 'object') {
      return res.status(400).json({ 错误: '配置格式错误' })
    }
    const existing = aiOpponentRepo.findAiOpponentByName(名称.trim())
    if (existing) {
      return res.status(409).json({ 错误: '名称已存在' })
    }
    const item = aiOpponentRepo.createAiOpponent({ 名称: 名称.trim(), 类型, 配置 })
    return res.json(item)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '创建人机失败' })
  }
})

adminRouter.delete('/ai-opponents/:id', (req, res) => {
  try {
    const id = req.params.id
    aiOpponentRepo.deleteAiOpponent(id)
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '删除人机失败' })
  }
})

adminRouter.get('/waiting-battles', (_req, res) => {
  try {
    const list = battleService.getWaitingBattleList()
    return res.json({ list, total: list.length })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询战局等候列表失败' })
  }
})
