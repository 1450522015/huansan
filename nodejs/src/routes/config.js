import { Router } from 'express'
import * as userRepo from '../repositories/userRepo.js'
import { authRequired } from '../middleware/auth.js'
import { getDefaultConfig, normalizeConfigDeep } from '../services/defaultConfig.js'
import { validateConfigForSave } from '../../../common/gameCatalog.js'
import { invalidateUser } from '../services/configCache.js'

export const configRouter = Router()
configRouter.use(authRequired)

configRouter.get('/', async (req, res) => {
  try {
    const user = userRepo.findUserById(req.userId)
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    let 配置 = user.配置
    if (!配置 || typeof 配置 !== 'object' || Object.keys(配置).length === 0) {
      配置 = getDefaultConfig()
    } else {
      配置 = normalizeConfigDeep(配置)
    }
    return res.json({
      配置,
      配置已认证: user.配置已认证 === true,
    })
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
    const v = validateConfigForSave(配置)
    if (!v.ok) {
      return res.status(400).json({ 错误: v.错误 })
    }
    const ok = userRepo.updateUserConfig(req.userId, v.配置, true)
    if (!ok) return res.status(404).json({ 错误: '用户不存在' })
    invalidateUser(req.userId)
    return res.json({ 成功: true, 配置已认证: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '保存配置失败' })
  }
})
