import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { env } from '../config/env.js'

let dbInstance = null

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      用户名 TEXT NOT NULL UNIQUE COLLATE NOCASE,
      密码哈希 TEXT NOT NULL,
      配置 TEXT NOT NULL DEFAULT '{}',
      配置已认证 INTEGER NOT NULL DEFAULT 0 CHECK (配置已认证 IN (0, 1)),
      创建时间 TEXT NOT NULL,
      最近登录时间 TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_created ON users (创建时间 DESC);

    CREATE TABLE IF NOT EXISTS battles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      发起用户名 TEXT NOT NULL,
      目标用户名 TEXT NOT NULL,
      状态 TEXT NOT NULL DEFAULT '等待中' CHECK (状态 IN ('等待中', '战局中', '已结束')),
      备注 TEXT,
      当前回合 INTEGER NOT NULL DEFAULT 0,
      回合数 INTEGER NOT NULL DEFAULT 0,
      发起时间 TEXT NOT NULL,
      结束时间 TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles (状态);
    CREATE INDEX IF NOT EXISTS idx_battles_time ON battles (发起时间 DESC);
  `)
  migrateBattlesSchemaV2(db)
  migrateBattlesSchemaV3(db)
  migrateBattlesSchemaV4(db)
  migrateBattlesSchemaV5(db)
}

function migrateBattlesSchemaV2(db) {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='battles'`).get()
  if (!row?.sql) return
  const sql = String(row.sql)
  const has备注 = sql.includes('备注')
  const has回合数 = sql.includes('回合数')
  const hasStatusCheck = sql.includes(`CHECK (状态 IN ('等待中', '战局中', '已结束'))`)
  if (has备注 && has回合数 && hasStatusCheck) return

  db.exec(`
    BEGIN;
    CREATE TABLE battles_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      发起用户名 TEXT NOT NULL,
      目标用户名 TEXT NOT NULL,
      状态 TEXT NOT NULL DEFAULT '等待中' CHECK (状态 IN ('等待中', '战局中', '已结束')),
      备注 TEXT,
      当前回合 INTEGER NOT NULL DEFAULT 0,
      回合数 INTEGER NOT NULL DEFAULT 0,
      发起时间 TEXT NOT NULL,
      结束时间 TEXT
    );
    INSERT INTO battles_new (id, 发起用户名, 目标用户名, 状态, 备注, 当前回合, 回合数, 发起时间, 结束时间)
    SELECT
      id,
      发起用户名,
      目标用户名,
      CASE
        WHEN 状态 IN ('等待中', '战局中', '已结束') THEN 状态
        ELSE '已结束'
      END AS 新状态,
      CASE
        WHEN 状态 IN ('等待中', '战局中', '已结束') THEN NULL
        ELSE 状态
      END AS 新备注,
      COALESCE(当前回合, 0) AS 当前回合,
      COALESCE(当前回合, 0) AS 回合数,
      发起时间,
      结束时间
    FROM battles;
    DROP TABLE battles;
    ALTER TABLE battles_new RENAME TO battles;
    CREATE INDEX IF NOT EXISTS idx_battles_status ON battles (状态);
    CREATE INDEX IF NOT EXISTS idx_battles_time ON battles (发起时间 DESC);
    COMMIT;
  `)
  console.log('[sqlite] migrated battles: 状态三值 + 备注 + 回合数')
}

/** 战局内冻结双方配置 JSON，避免战斗中改配影响本局 */
function migrateBattlesSchemaV4(db) {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='battles'`).get()
  if (!row?.sql) return
  const sql = String(row.sql)
  if (sql.includes('发起方配置快照')) return
  db.exec(`
    ALTER TABLE battles ADD COLUMN 发起方配置快照 TEXT;
    ALTER TABLE battles ADD COLUMN 目标方配置快照 TEXT;
  `)
  console.log('[sqlite] migrated battles: 双方配置快照')
}

function migrateBattlesSchemaV5(db) {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='battle_rounds'`).get()
  if (!row?.sql) return
  const sql = String(row.sql)
  if (sql.includes('战斗过程')) return
  db.exec(`ALTER TABLE battle_rounds ADD COLUMN 战斗过程 TEXT NOT NULL DEFAULT '[]'`)
  console.log('[sqlite] migrated battle_rounds: 战斗过程')
}

function migrateBattlesSchemaV3(db) {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='battle_rounds'`).get()
  if (row) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      battle_id INTEGER NOT NULL,
      回合数 INTEGER NOT NULL DEFAULT 1,
      发起方出招 TEXT NOT NULL DEFAULT '[]',
      目标方出招 TEXT NOT NULL DEFAULT '[]',
      战斗日志 TEXT NOT NULL DEFAULT '[]',
      创建时间 TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_battle_rounds_battle ON battle_rounds(battle_id, 回合数);
  `)
  console.log('[sqlite] created battle_rounds table')
}

/**
 * WAL + busy_timeout：Node 进程与 DB Browser / sqlite3 CLI 等可同时只读打开；
 * 写入仍会短暂互斥，超时内会重试而非立刻 SQLITE_BUSY。
 */
export function openSqlite() {
  if (dbInstance) return dbInstance
  const filePath = env.sqlitePath
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 8000')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  dbInstance = db
  console.log(`[sqlite] ${filePath} (WAL)`)
  return dbInstance
}

export function getDb() {
  if (!dbInstance) throw new Error('SQLite 未初始化，请先调用 openSqlite()')
  return dbInstance
}
