import { Router } from 'express'
import jwt from 'jsonwebtoken'
import * as userRepo from '#src/repositories/userRepo.js'
import { env } from '#src/config/env.js'
import { validateCredentials } from '#src/utils/validate.js'
import { getDefaultConfig } from '#src/services/defaultConfig.js'
import * as loggedInUsers from '#src/services/loggedInUsers.js'

export const authRouter = Router()

function signToken(userId, tokenVersion) {
  return jwt.sign({ uid: String(userId), tv: tokenVersion }, env.jwtSecret, { expiresIn: '30d' })
}

authRouter.post('/register', async (req, res) => {
  const { 用户名, 密码 } = req.body || {}
  const v = validateCredentials(用户名, 密码)
  if (!v.ok) return res.status(400).json({ 错误: v.消息 })
  try {
    if (userRepo.findUserByUsername(v.用户名)) {
      return res.status(409).json({ 错误: '用户名已存在' })
    }
    const doc = userRepo.createUser({
      用户名: v.用户名,
      密码哈希: v.密码,
      配置: getDefaultConfig(),
      配置已认证: true, // 注册时即拥有一套默认的已保存配置
      最近登录时间: new Date(),
    })
    const token = signToken(doc._id, doc.token_version)
    loggedInUsers.addLoggedInUser(doc._id, doc.用户名, token)
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
  const u = typeof 用户名 === 'string' ? 用户名.trim() : ''
  const p = typeof 密码 === 'string' ? 密码 : ''
  if (!u || !p) {
    return res.status(400).json({ 错误: '用户名或密码不能为空' })
  }
  try {
    const user = userRepo.findUserByUsername(u)
    if (!user) return res.status(401).json({ 错误: '用户名或密码错误' })
    const ok = p === user.密码哈希
    if (!ok) return res.status(401).json({ 错误: '用户名或密码错误' })
    const updated = userRepo.bumpUserTokenVersion(user._id)
    userRepo.updateUserLastLogin(updated._id, new Date())
    const token = signToken(updated._id, updated.token_version)
    loggedInUsers.addLoggedInUser(user._id, user.用户名, token)
    return res.json({ token, 用户名: user.用户名 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '登录失败' })
  }
})
