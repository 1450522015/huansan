import { Router } from 'express'
import bcrypt from 'bcryptjs'
import * as userRepo from '../repositories/userRepo.js'
import { validatePassword } from '../utils/validate.js'
import { invalidateUser } from '../services/configCache.js'

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

    const { list, total } = userRepo.listUsersForAdmin({
      page,
      pageSize,
      keyword: keyword || undefined,
      login: login !== 'all' ? login : 'all',
    })
    return res.json({ list, total, page, pageSize })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询用户失败' })
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
    const 密码哈希 = await bcrypt.hash(v.密码, 10)
    const ok = userRepo.updateUserPasswordHash(String(uid), 密码哈希)
    if (!ok) return res.status(404).json({ 错误: '用户不存在' })
    invalidateUser(String(uid))
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '修改密码失败' })
  }
})
