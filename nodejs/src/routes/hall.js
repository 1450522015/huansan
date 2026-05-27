import { Router } from 'express'
import * as userRepo from '#src/repositories/userRepo.js'
import { authRequired } from '#src/middleware/auth.js'
import { getOnlineUserIds, getOnlineList, getUserStatusByUsername } from '#src/services/onlineMap.js'

export const hallRouter = Router()
hallRouter.use(authRequired)

hallRouter.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize), 10) || 20))
    const keyword = String(req.query.keyword ?? '').trim()

    const onlineUserIds = getOnlineUserIds()

    const { list, total } = userRepo.listUsersForHall({
      page,
      pageSize,
      keyword: keyword || undefined,
      onlineUserIds,
      onlyOnline: true,
    })
    const statusList = getOnlineList().map(u => ({
      用户名: u.用户名,
      状态: getUserStatusByUsername(u.用户名),
    }))
    return res.json({ list, total, page, pageSize, statusList })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '查询大厅用户失败' })
  }
})
