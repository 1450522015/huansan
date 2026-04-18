import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { findUserById } from '../repositories/userRepo.js'

export function authRequired(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) {
    return res.status(401).json({ 错误: '未登录' })
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    const user = findUserById(String(payload.uid))
    if (!user) {
      return res.status(401).json({ 错误: '用户不存在' })
    }
    if (payload.tv !== user.token_version) {
      return res.status(401).json({ 错误: '已在其他设备登录' })
    }
    req.userId = payload.uid
    next()
  } catch (e) {
    if (e && e.message === '已在其他设备登录') {
      return res.status(401).json({ 错误: '已在其他设备登录' })
    }
    return res.status(401).json({ 错误: '登录已失效' })
  }
}
