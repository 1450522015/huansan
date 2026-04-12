import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as userRepo from '../repositories/userRepo.js'
import { env } from '../config/env.js'
import { validateCredentials } from '../utils/validate.js'
import { getDefaultConfig } from '../services/defaultConfig.js'

export const authRouter = Router()

function signToken(userId) {
  return jwt.sign({ uid: String(userId) }, env.jwtSecret, { expiresIn: '30d' })
}

authRouter.post('/register', async (req, res) => {
  const { 用户名, 密码 } = req.body || {}
  const v = validateCredentials(用户名, 密码)
  if (!v.ok) return res.status(400).json({ 错误: v.消息 })
  try {
    if (userRepo.findUserByUsername(v.用户名)) {
      return res.status(409).json({ 错误: '用户名已存在' })
    }
    const 密码哈希 = await bcrypt.hash(v.密码, 10)
    const doc = userRepo.createUser({
      用户名: v.用户名,
      密码哈希,
      配置: getDefaultConfig(),
      配置已认证: false,
      最近登录时间: new Date(),
    })
    const token = signToken(doc._id)
    return res.json({ token, 用户名: doc.用户名 })
  } catch (e) {
    if (e && (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT')) {
      return res.status(409).json({ 错误: '用户名已存在' })
    }
    console.error(e)
    return res.status(500).json({ 错误: '注册失败' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { 用户名, 密码 } = req.body || {}
  const v = validateCredentials(用户名, 密码)
  if (!v.ok) return res.status(400).json({ 错误: v.消息 })
  try {
    const user = userRepo.findUserByUsername(v.用户名)
    if (!user) return res.status(401).json({ 错误: '用户名或密码错误' })
    const ok = await bcrypt.compare(v.密码, user.密码哈希)
    if (!ok) return res.status(401).json({ 错误: '用户名或密码错误' })
    userRepo.updateUserLastLogin(user._id, new Date())
    const token = signToken(user._id)
    return res.json({ token, 用户名: user.用户名 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '登录失败' })
  }
})
