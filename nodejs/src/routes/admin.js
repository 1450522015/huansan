import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { validatePassword } from '../utils/validate.js'
import { invalidateUser } from '../services/configCache.js'

export const adminRouter = Router()

adminRouter.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || 10))
    const skip = (page - 1) * pageSize
    const filter = {}
    const [list, total] = await Promise.all([
      User.find(filter, { 用户名: 1, 创建时间: 1, 最近登录时间: 1 })
        .sort({ 创建时间: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ])
    const rows = list.map((u) => ({
      id: String(u._id),
      用户名: u.用户名,
      创建时间: u.创建时间,
      最近登录时间: u.最近登录时间 || null,
    }))
    return res.json({ list: rows, total, page, pageSize })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询用户失败' })
  }
})

adminRouter.patch('/users/:id/password', async (req, res) => {
  const { 新密码 } = req.body || {}
  const v = validatePassword(新密码)
  if (!v.ok) return res.status(400).json({ 错误: v.消息 })
  const id = req.params.id
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ 错误: '无效的用户 ID' })
  }
  try {
    const 密码哈希 = await bcrypt.hash(v.密码, 10)
    const user = await User.findByIdAndUpdate(id, { $set: { 密码哈希 } })
    if (!user) return res.status(404).json({ 错误: '用户不存在' })
    invalidateUser(id)
    return res.json({ 成功: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '修改密码失败' })
  }
})
