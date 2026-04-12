import { getDb } from '../db/sqlite.js'

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

export function createUser({ 用户名, 密码哈希, 配置, 配置已认证 = false, 最近登录时间 }) {
  const now = new Date().toISOString()
  const loginIso = 最近登录时间 ? new Date(最近登录时间).toISOString() : now
  const cfg = JSON.stringify(配置 ?? {})
  const auth = 配置已认证 ? 1 : 0
  const stmt = getDb().prepare(
    'INSERT INTO users (用户名, 密码哈希, 配置, 配置已认证, 创建时间, 最近登录时间) VALUES (?,?,?,?,?,?)'
  )
  const info = stmt.run(用户名, 密码哈希, cfg, auth, now, loginIso)
  return findUserById(String(info.lastInsertRowid))
}

export function updateUserLastLogin(idStr, date = new Date()) {
  const id = parseId(idStr)
  if (id == null) return
  getDb().prepare('UPDATE users SET 最近登录时间 = ? WHERE id = ?').run(date.toISOString(), id)
}

export function updateUserConfig(idStr, 配置, 配置已认证 = true) {
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

function likePatternContains(sub) {
  return `%${sub.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
}

/**
 * @param {{ page: number, pageSize: number, keyword?: string, login?: string }} q
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
    `SELECT id, 用户名, 创建时间, 最近登录时间 FROM users ${where} ORDER BY 创建时间 DESC LIMIT ? OFFSET ?`
  )
  const rows = listStmt.all(...params, q.pageSize, skip)

  const list = rows.map((u) => ({
    id: String(u.id),
    用户名: u.用户名,
    创建时间: u.创建时间,
    最近登录时间: u.最近登录时间 || null,
  }))

  return { list, total }
}
