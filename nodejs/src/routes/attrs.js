import { Router } from 'express'
import * as userRepo from '#src/repositories/userRepo.js'
import { authRequired } from '#src/middleware/auth.js'
import { getDefaultConfig, normalizeConfigDeep } from '#src/services/defaultConfig.js'
import { computeAttrsFromConfig, computeAttrsFromConfigDebug } from '#src/services/attrCalculator.js'
import { getCached, setCached } from '#src/services/configCache.js'

export const attrsRouter = Router()
attrsRouter.use(authRequired)

function stableStringify(obj) {
  return JSON.stringify(obj)
}

attrsRouter.get('/', async (req, res) => {
  try {
    const user = userRepo.findUserById(req.userId)
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    let 配置 = user.配置
    if (!配置 || typeof 配置 !== 'object' || Object.keys(配置).length === 0) {
      配置 = getDefaultConfig()
    } else {
      配置 = normalizeConfigDeep(配置)
    }
    const snap = stableStringify(配置)
    const wantDebug = req.query.debug === '1' || req.query.debug === 'true'
    const cached = getCached(req.userId)
    if (cached && stableStringify(cached.配置) === snap) {
      if (wantDebug) {
        return res.json({
          属性: cached.计算结果,
          调试: computeAttrsFromConfigDebug(cached.配置),
        })
      }
      return res.json({ 属性: cached.计算结果 })
    }
    const 属性 = computeAttrsFromConfig(配置)
    setCached(req.userId, JSON.parse(snap), 属性)
    if (wantDebug) {
      return res.json({ 属性, 调试: computeAttrsFromConfigDebug(配置) })
    }
    return res.json({ 属性 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '计算属性失败' })
  }
})
