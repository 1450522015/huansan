import { getDb } from '../db/sqlite.js'

export function ensureAiOpponentsTable(db) {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='ai_opponents'`).get()
  if (row) return
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_opponents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      名称 TEXT NOT NULL UNIQUE,
      类型 TEXT NOT NULL CHECK (类型 IN ('木桩', '大师')),
      配置 TEXT NOT NULL DEFAULT '{}',
      创建时间 TEXT NOT NULL
    );
  `)
  console.log('[sqlite] created ai_opponents table')
}

export function createAiOpponent({ 名称, 类型, 配置 }) {
  const now = new Date().toISOString()
  const result = getDb().prepare(
    'INSERT INTO ai_opponents (名称, 类型, 配置, 创建时间) VALUES (?, ?, ?, ?)'
  ).run(名称, 类型, JSON.stringify(配置), now)
  return findAiOpponentById(String(result.lastInsertRowid))
}

export function findAiOpponentById(id) {
  const row = getDb().prepare('SELECT * FROM ai_opponents WHERE id = ?').get(Number(id))
  return row ? rowToAiOpponent(row) : null
}

export function findAiOpponentByName(名称) {
  const row = getDb().prepare('SELECT * FROM ai_opponents WHERE 名称 = ?').get(名称)
  return row ? rowToAiOpponent(row) : null
}

export function listAiOpponents({ page = 1, pageSize = 50 } = {}) {
  const offset = (page - 1) * pageSize
  const rows = getDb().prepare(
    'SELECT * FROM ai_opponents ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(pageSize, offset)
  const { total } = getDb().prepare('SELECT COUNT(*) AS total FROM ai_opponents').get()
  return { list: rows.map(rowToAiOpponent), total, page, pageSize }
}

export function listAllAiOpponents() {
  const rows = getDb().prepare('SELECT * FROM ai_opponents ORDER BY id ASC').all()
  return rows.map(rowToAiOpponent)
}

export function deleteAiOpponent(id) {
  getDb().prepare('DELETE FROM ai_opponents WHERE id = ?').run(Number(id))
}

export function updateAiOpponent(id, { 名称, 类型, 配置 }) {
  const sets = []
  const vals = []
  if (名称 != null) { sets.push('名称 = ?'); vals.push(名称) }
  if (类型 != null) { sets.push('类型 = ?'); vals.push(类型) }
  if (配置 != null) { sets.push('配置 = ?'); vals.push(JSON.stringify(配置)) }
  if (!sets.length) return findAiOpponentById(id)
  vals.push(Number(id))
  getDb().prepare(`UPDATE ai_opponents SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return findAiOpponentById(id)
}

function rowToAiOpponent(row) {
  return {
    id: String(row.id),
    名称: row.名称,
    类型: row.类型,
    配置: typeof row.配置 === 'string' ? JSON.parse(row.配置) : row.配置,
    创建时间: row.创建时间,
  }
}
