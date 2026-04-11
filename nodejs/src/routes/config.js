import { Router } from 'express'
import { User } from '../models/User.js'
import { authRequired } from '../middleware/auth.js'
import { getDefaultConfig, normalizeConfigDeep } from '../services/defaultConfig.js'
import { invalidateUser } from '../services/configCache.js'

export const configRouter = Router()
configRouter.use(authRequired)

configRouter.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean()
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    let 配置 = user.配置
    if (!配置 || typeof 配置 !== 'object' || Object.keys(配置).length === 0) {
      配置 = getDefaultConfig()
    } else {
      配置 = normalizeConfigDeep(配置)
    }
    return res.json({ 配置 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '读取配置失败' })
  }
})

configRouter.post('/', async (req, res) => {
  const { 配置 } = req.body || {}
  if (!配置 || typeof 配置 !== 'object') {
    return res.status(400).json({ 错误: '缺少配置对象' })
  }
  try {
    const normalized = normalizeConfigDeep(配置)
    await User.findByIdAndUpdate(req.userId, { $set: { 配置: normalized } })
    invalidateUser(req.userId)
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '保存配置失败' })
  }
})
