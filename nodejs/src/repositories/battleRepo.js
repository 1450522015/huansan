import { getDb } from '../db/sqlite.js'

/**
 * 创建战局记录
 */
export function createBattle({ 发起用户名, 目标用户名 }) {
  const now = new Date().toISOString()
  const stmt = getDb().prepare(
    'INSERT INTO battles (发起用户名, 目标用户名, 状态, 备注, 当前回合, 回合数, 发起时间) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const info = stmt.run(发起用户名, 目标用户名, '等待中', null, 0, 0, now)
  return findBattleById(String(info.lastInsertRowid))
}

/**
 * 根据 ID 查找战局
 */
export function findBattleById(idStr) {
  const id = Number.parseInt(String(idStr), 10)
  if (!Number.isInteger(id) || id < 1) return null
  const row = getDb().prepare('SELECT * FROM battles WHERE id = ?').get(id)
  return row ? rowToBattle(row) : null
}

/**
 * 更新战局状态
 */
export function updateBattleStatus(idStr, 状态, {
  备注,
  当前回合,
  回合数,
  结束时间,
  发起方配置快照,
  目标方配置快照,
} = {}) {
  const id = Number.parseInt(String(idStr), 10)
  if (!Number.isInteger(id) || id < 1) return false

  const fields = ['状态 = ?']
  const params = [状态]

  if (备注 !== undefined) {
    fields.push('备注 = ?')
    params.push(备注)
  }
  if (当前回合 != null) {
    fields.push('当前回合 = ?')
    params.push(当前回合)
  }
  if (回合数 != null) {
    fields.push('回合数 = ?')
    params.push(回合数)
  }
  if (结束时间 != null) {
    fields.push('结束时间 = ?')
    params.push(结束时间)
  }
  if (发起方配置快照 !== undefined) {
    fields.push('发起方配置快照 = ?')
    params.push(发起方配置快照)
  }
  if (目标方配置快照 !== undefined) {
    fields.push('目标方配置快照 = ?')
    params.push(目标方配置快照)
  }

  params.push(id)
  const r = getDb()
    .prepare(`UPDATE battles SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params)
  return r.changes > 0
}

/**
 * 查找两个用户之间的等待中/战局中的战局
 */
export function findActiveBattle(发起用户名, 目标用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE 发起用户名 = ? AND 目标用户名 = ? AND 状态 IN ('等待中', '战局中') ORDER BY id DESC LIMIT 1`
    )
    .get(发起用户名, 目标用户名)
  return row ? rowToBattle(row) : null
}

/**
 * 查找用户相关的进行中战局（作为发起人或目标人）
 */
export function findUserActiveBattle(用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE (发起用户名 = ? OR 目标用户名 = ?) AND 状态 IN ('等待中', '战局中') ORDER BY id DESC LIMIT 1`
    )
    .get(用户名, 用户名)
  return row ? rowToBattle(row) : null
}

/** 查找用户最近一场战局（含已结束），用于前端结束确认弹框兜底。 */
export function findUserLatestBattle(用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE (发起用户名 = ? OR 目标用户名 = ?) ORDER BY id DESC LIMIT 1`
    )
    .get(用户名, 用户名)
  return row ? rowToBattle(row) : null
}

/**
 * 查找用户作为目标人的等待中战局（上线时补推 PK 邀请用）
 */
export function findUserPendingBattle(目标用户名) {
  const row = getDb()
    .prepare(
      `SELECT * FROM battles WHERE 目标用户名 = ? AND 状态 = '等待中' ORDER BY id DESC LIMIT 1`
    )
    .get(目标用户名)
  return row ? rowToBattle(row) : null
}

/**
 * 管理端：分页查询战局列表（不含已取消，已取消的直接删除不入库）
 */
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
    `SELECT * FROM battles ${where} ORDER BY 发起时间 DESC LIMIT ? OFFSET ?`
  )
  const rows = listStmt.all(...params, pageSize, skip)

  const list = rows.map(rowToBattle)
  return { list, total }
}

/**
 * 删除战局记录（取消时直接删除，不保留已取消记录）
 */
export function deleteBattle(idStr) {
  const id = Number.parseInt(String(idStr), 10)
  if (!Number.isInteger(id) || id < 1) return false
  const r = getDb().prepare('DELETE FROM battles WHERE id = ?').run(id)
  return r.changes > 0
}

/**
 * 本次 `battle-round-start` / `POST .../round/start` 应对齐的 **出招回合序号**（与 `battle_rounds.回合数` 一致）。
 *
 * - 接受 PK 后：`当前回合=1`、`回合数=0` → 第 1 回合（勿用 `回合数+1` 在第二次请求时变成 2）。
 * - 结算后：`当前回合 = 刚结束 + 1`、`回合数 = 刚结束` → 新开 `当前回合` 那一格。
 * - 本回合已开启（`当前回合 === 回合数 > 0`）：重复开回合只补发同一 N，不递增。
 */
export function computePendingRoundNum(battle) {
  const cr = Number(battle?.当前回合) || 0
  const tr = Number(battle?.回合数) || 0
  if (cr > tr) return cr
  if (cr === tr && cr > 0) return cr
  return Math.max(1, tr + 1)
}

/**
 * 查询 battle_rounds 时使用的「日志所在回合」键：
 * 结算后会把 当前回合 推进到下一格、回合数 仍为刚结束回合，此时日志在 回合数 那一行。
 */
export function getBattleRoundRowKeyForLog(battle) {
  const cr = Number(battle?.当前回合) || 0
  const tr = Number(battle?.回合数) || 0
  if (cr > tr) return Math.max(1, tr)
  return Math.max(1, cr || tr || 1)
}

/** 从战局快照列解析一方配置对象；无快照返回 null */
export function parseBattleSideConfigSnapshot(battle, username) {
  const isStarter = battle?.发起用户名 === username
  const raw = isStarter ? battle?.发起方配置快照 : battle?.目标方配置快照
  if (raw == null || !String(raw).trim()) return null
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

function rowToBattle(row) {
  if (!row) return null
  return {
    id: String(row.id),
    发起用户名: row.发起用户名,
    目标用户名: row.目标用户名,
    状态: row.状态,
    备注: row.备注 || null,
    当前回合: row.当前回合 ?? 0,
    回合数: row.回合数 ?? 0,
    发起时间: row.发起时间,
    结束时间: row.结束时间 || null,
    发起方配置快照: row.发起方配置快照 ?? null,
    目标方配置快照: row.目标方配置快照 ?? null,
  }
}
