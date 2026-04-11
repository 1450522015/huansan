import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function authRequired(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) {
    return res.status(401).json({ 错误: '未登录' })
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.userId = payload.uid
    next()
  } catch {
    return res.status(401).json({ 错误: '登录已失效' })
  }
}
