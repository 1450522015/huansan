import { Router } from 'express'
import { User } from '../models/User.js'
import { authRequired } from '../middleware/auth.js'
import { getDefaultConfig, normalizeConfigDeep } from '../services/defaultConfig.js'
import { computeAttrsFromConfig } from '../services/attrCalculator.js'
import { getCached, setCached } from '../services/configCache.js'

export const attrsRouter = Router()
attrsRouter.use(authRequired)

function stableStringify(obj) {
  return JSON.stringify(obj)
}

attrsRouter.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean()
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    let 配置 = user.配置
    if (!配置 || typeof 配置 !== 'object' || Object.keys(配置).length === 0) {
      配置 = getDefaultConfig()
    } else {
      配置 = normalizeConfigDeep(配置)
    }
    const snap = stableStringify(配置)
    const cached = getCached(req.userId)
    if (cached && stableStringify(cached.配置) === snap) {
      return res.json({ 属性: cached.计算结果 })
    }
    const 属性 = computeAttrsFromConfig(配置)
    setCached(req.userId, JSON.parse(snap), 属性)
    return res.json({ 属性 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '计算属性失败' })
  }
})
