import { getDb } from '#src/db/sqlite.js'

/** @param {import('better-sqlite3').Database} db 可选，用于事务内操作 */
export function createBattle({ 战局 }) {
  const now = new Date().toISOString()
  const desc = 战局.战局描述
  const 战局数据 = JSON.stringify(战局)
  const stmt = getDb().prepare(
    'INSERT INTO battles (id, 红方用户名, 黑方用户名, 状态, 当前回合, 战局数据, 创建时间) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  stmt.run(desc.id, desc.红方用户名, desc.黑方用户名, desc.状态, desc.当前回合, 战局数据, now)
  return findBattleById(desc.id)
}

export function findBattleById(id) {
  if (typeof id !== 'string' || !id.trim()) return null
  const row = getDb().prepare('SELECT * FROM battles WHERE id = ?').get(id)
  return row ? rowToBattle(row) : null
}

export function findBattleByUsers(红方用户名, 黑方用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE 红方用户名 = ? AND 黑方用户名 = ? AND 状态 IN ('等待中', '战局中') ORDER BY 创建时间 DESC LIMIT 1`
    )
    .get(红方用户名, 黑方用户名)
  return row ? rowToBattle(row) : null
}

export function findUserActiveBattle(用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE (红方用户名 = ? OR 黑方用户名 = ?) AND 状态 IN ('等待中', '战局中') ORDER BY 创建时间 DESC LIMIT 1`
    )
    .get(用户名, 用户名)
  return row ? rowToBattle(row) : null
}

export function findUserPendingAsBlack(目标用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE 黑方用户名 = ? AND 状态 = '等待中' ORDER BY 创建时间 DESC LIMIT 1`
    )
    .get(目标用户名)
  return row ? rowToBattle(row) : null
}

export function updateBattleStatus(id, 状态, { 当前回合, 战胜方玩家名称, 战局, 结束时间 } = {}) {
  const fields = ['状态 = ?']
  const params = [状态]

  if (当前回合 != null) {
    fields.push('当前回合 = ?')
    params.push(当前回合)
  }
  if (战胜方玩家名称 !== undefined) {
    fields.push('战胜方玩家名称 = ?')
    params.push(战胜方玩家名称)
  }
  if (战局 !== undefined) {
    fields.push('战局数据 = ?')
    params.push(JSON.stringify(战局))
  }
  if (结束时间 != null) {
    fields.push('结束时间 = ?')
    params.push(结束时间)
  }

  params.push(id)
  const r = getDb()
    .prepare(`UPDATE battles SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params)
  return r.changes > 0
}

export function deleteBattle(id) {
  const r = getDb().prepare('DELETE FROM battles WHERE id = ?').run(id)
  return r.changes > 0
}

export function endAllActiveBattles(reason = '服务器重启，战局终止') {
  const now = new Date().toISOString()
  const r = getDb().prepare(
    `UPDATE battles
       SET 状态 = '已结束',
           结束时间 = COALESCE(结束时间, ?)
     WHERE 状态 IN ('等待中', '战局中')`,
  ).run(now)
  return Number(r?.changes || 0)
}

export function listBattlesForAdmin({ page = 1, pageSize = 20, 状态 } = {}) {
  const conditions = []
  const params = []

  if (状态 && 状态 !== 'all') {
    conditions.push('状态 = ?')
    params.push(状态)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const db = getDb()

  const total = db.prepare(`SELECT COUNT(*) AS c FROM battles ${where}`).get(...params).c

  const skip = (page - 1) * pageSize
  const listStmt = db.prepare(
    `SELECT id, 红方用户名, 黑方用户名, 状态, 当前回合, 战胜方玩家名称, 创建时间, 结束时间 FROM battles ${where} ORDER BY 创建时间 DESC LIMIT ? OFFSET ?`
  )
  const rows = listStmt.all(...params, pageSize, skip)

  const list = rows.map((row) => ({
    id: row.id,
    红方用户名: row.红方用户名,
    黑方用户名: row.黑方用户名,
    状态: row.状态,
    当前回合: row.当前回合 ?? 0,
    战胜方玩家名称: row.战胜方玩家名称 || null,
    创建时间: row.创建时间,
    结束时间: row.结束时间 || null,
  }))

  return { list, total }
}

function rowToBattle(row) {
  if (!row) return null
  let 战局
  try { 战局 = JSON.parse(row.战局数据 || 'null') } catch { 战局 = null }
  const desc = 战局?.战局描述 || {}
  return {
    id: row.id || desc.id,
    红方用户名: row.红方用户名 || desc.红方用户名,
    黑方用户名: row.黑方用户名 || desc.黑方用户名,
    状态: row.状态 || desc.状态,
    当前回合: row.当前回合 ?? desc.当前回合 ?? 0,
    战胜方玩家名称: row.战胜方玩家名称 || desc.战胜方玩家名称 || null,
    创建时间: row.创建时间,
    结束时间: row.结束时间 || null,
    战局,
  }
}
