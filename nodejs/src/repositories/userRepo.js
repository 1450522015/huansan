import { getDb } from '#src/db/sqlite.js'

function rowToUser(row) {
  if (!row) return null
  let 配置
  try {
    配置 = JSON.parse(row.配置 || '{}')
  } catch {
    配置 = {}
  }
  return {
    _id: String(row.id),
    用户名: row.用户名, 
    密码哈希: row.密码哈希, 
    配置,
    配置已认证: row.配置已认证 === 1,
    创建时间: row.创建时间, 
    最近登录时间: row.最近登录时间 || null,
    token_version: row.token_version ?? 0,
  }
}

function parseId(idStr) {
  const id = Number.parseInt(String(idStr), 10)
  if (!Number.isInteger(id) || id < 1) return null
  return id
}

/** @param {string} idStr */
export function findUserById(idStr) {
  const id = parseId(idStr)
  if (id == null) return null
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)
  return rowToUser(row)
}

export function findUserByUsername(用户名) {
  const row = getDb().prepare('SELECT * FROM users WHERE 用户名 = ? COLLATE NOCASE').get(用户名)
  return rowToUser(row)
}

export function createUser({ 用户名, 密码哈希, 配置,配置已认证 = false, 最近登录时间 }) {
  const now = new Date().toISOString()
  const loginIso = 最近登录时间 ? new Date(最近登录时间).toISOString() : now
  const cfg = JSON.stringify(配置 ?? {})
  const auth = 配置已认证 ? 1 : 0
  const stmt = getDb().prepare(
    'INSERT INTO users (用户名, 密码哈希, 配置,配置已认证, 创建时间, 最近登录时间) VALUES (?,?,?,?,?,?)'
  )
  const info = stmt.run(用户名, 密码哈希, cfg, auth, now, loginIso)
  return findUserById(String(info.lastInsertRowid))
}

export function updateUserLastLogin(idStr, date = new Date()) {
  const id = parseId(idStr)
  if (id == null) return
  getDb().prepare('UPDATE users SET 最近登录时间 = ? WHERE id = ?').run(date.toISOString(), id)
}

export function bumpUserTokenVersion(idStr) {
  const id = parseId(idStr)
  if (id == null) return
  getDb().prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(id)
  return findUserById(idStr)
}

export function updateUserConfig(idStr, 配置,配置已认证 = true) {
  const id = parseId(idStr)
  if (id == null) return false
  const r = getDb()
    .prepare('UPDATE users SET 配置 = ?, 配置已认证 = ? WHERE id = ?')
    .run(JSON.stringify(配置), 配置已认证 ? 1 : 0, id)
  return r.changes > 0
}

export function updateUserPasswordHash(idStr, 密码哈希) {
  const id = parseId(idStr)
  if (id == null) return false
  const r = getDb().prepare('UPDATE users SET 密码哈希 = ? WHERE id = ?').run(密码哈希, id)
  return r.changes > 0
}

/**
 * 职业经历数组 → 简短字符串, 如"男文 - 男文 - 男武 - 男异"
 * 规则: 取每个元素最后一个字（文/武/异）, 前面加上性别（元素首字含"女"则"女"否则"男"）
 */
export function 职业经历To简串 (职业经历) {
  if (!Array.isArray(职业经历) || 职业经历.length === 0) return '————'
  return 职业经历.map((c) => {
    const s = String(c)
    const 性别 = s.startsWith('女') ? '女' : '男'
    let 类别 = '异'
    if (s.endsWith('文')) 类别 = '文'
    else if (s.endsWith('武')) 类别 = '武'
    return 性别 + 类别
  }).join('-')
}

/**
 * 从配置 JSON 中提取主将摘要（转数、等级、职业串）, 供大厅展示
 */
function extract主将摘要 (配置) {
  if (!配置 || typeof 配置 !== 'object') return { 转数: 0, 等级: 1, 职业串: '————' }
  const 主将 = 配置.主将
  if (!主将 || typeof 主将 !== 'object') return { 转数: 0, 等级: 1, 职业串: '————' }
  const 职业串 = 职业经历To简串 (主将.职业经历)
  return {
    转数: 主将.转数 ?? 0,
    等级: 主将.等级 ?? 1,
    职业串: 职业串 || '————',
    坐骑名: 主将?.坐骑?.种类 || '无',
  }
}

function likePatternContains(sub) {
  return `%${sub.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

/**
 * @param {{ page: number, pageSize: number, keyword?: string, login?: string, onlineUserIds?: Set<string> }} q
 */
export function listUsersForAdmin(q) {
  const conditions = []
  const params = []

  const kw = String(q.keyword ?? '').trim()
  if (kw) {
    conditions.push(`用户名 LIKE ? ESCAPE '\\'`)
    params.push(likePatternContains(kw))
  }

  const login = String(q.login ?? 'all').toLowerCase()
  const now = Date.now()
  const day = 86400000
  switch (login) {
    case 'never':
      conditions.push('(最近登录时间 IS NULL OR 最近登录时间 = \'\')')
      break
    case 'today':
      conditions.push('最近登录时间 >= ?')
      params.push(new Date(now - day).toISOString())
      break
    case 'week':
      conditions.push('最近登录时间 >= ?')
      params.push(new Date(now - 7 * day).toISOString())
      break
    case 'month':
      conditions.push('最近登录时间 >= ?')
      params.push(new Date(now - 30 * day).toISOString())
      break
    case 'old':
      conditions.push('最近登录时间 IS NOT NULL AND 最近登录时间 != \'\' AND 最近登录时间 < ?')
      params.push(new Date(now - 30 * day).toISOString())
      break
    default:
      break
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const db = getDb()

  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params).c

  const skip = (q.page - 1) * q.pageSize
  const listStmt = db.prepare(
    `SELECT id, 用户名, 密码哈希, 创建时间, 最近登录时间 FROM users ${where} ORDER BY 创建时间 DESC LIMIT ? OFFSET ?`
  )
  const rows = listStmt.all(...params, q.pageSize, skip)

  const onlineSet = q.onlineUserIds || new Set()

  const list = rows.map((u) => ({
    id: String(u.id),
    用户名: u.用户名, 
    密码: u.密码哈希,
    创建时间: u.创建时间, 
    最近登录时间: u.最近登录时间 || null,
    在线状态: onlineSet.has(String(u.id)) ? '在线' : '离线',
  }))

  return { list, total }
}

/**
 * 大厅用户列表: 返回用户名 + 主将摘要（转数、等级）, 支持分页和关键词搜索
 * @param {{ page: number, pageSize: number, keyword?: string, onlineUserIds?: Set<string>, onlyOnline?: boolean }} q
 */
export function listUsersForHall(q) {
  const conditions = []
  const params = []

  const kw = String(q.keyword ?? '').trim()
  if (kw) {
    conditions.push(`用户名 LIKE ? ESCAPE '\\'`)
    params.push(likePatternContains(kw))
  }

  // 只查在线用户
  if (q.onlyOnline && q.onlineUserIds && q.onlineUserIds.size > 0) {
    const placeholders = [...q.onlineUserIds].map(() => '?').join(',')
    conditions.push(`id IN (${placeholders})`)
    params.push(...q.onlineUserIds)
  } else if (q.onlyOnline) {
    // 没有在线用户, 直接返回空
    return { list: [], total: 0 }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const db = getDb()

  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params).c

  const skip = (q.page - 1) * q.pageSize
  const listStmt = db.prepare(
    `SELECT id, 用户名, 配置,配置已认证 FROM users ${where} ORDER BY 最近登录时间 DESC NULLS LAST LIMIT ? OFFSET ?`
  )
  const rows = listStmt.all(...params, q.pageSize, skip)

  const onlineSet = q.onlineUserIds || new Set()

  const list = rows.map((u) => {
    let 配置
    try {
      配置 = JSON.parse(u.配置 || '{}')
    } catch {
      配置 = {}
    }
    const 摘要 = extract主将摘要 (配置)
    return {
      id: String(u.id),
      用户名: u.用户名, 
      转数: 摘要.转数,
      等级: 摘要.等级,
      职业串: 摘要.职业串,
      坐骑名: 摘要.坐骑名,
      配置已认证: !!u.配置已认证, 
      在线: onlineSet.has(String(u.id)),
    }
  })

  return { list, total }
}
