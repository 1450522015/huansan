import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { env } from '#src/config/env.js'

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
      id TEXT PRIMARY KEY,
      红方用户名 TEXT NOT NULL,
      黑方用户名 TEXT NOT NULL,
      状态 TEXT NOT NULL DEFAULT '等待中' CHECK (状态 IN ('等待中', '战局中', '已结束')),
      当前回合 INTEGER NOT NULL DEFAULT 0,
      战胜方玩家名称 TEXT,
      战局数据 TEXT,
      创建时间 TEXT NOT NULL,
      结束时间 TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_battles_红方 ON battles(红方用户名);
    CREATE INDEX IF NOT EXISTS idx_battles_黑方 ON battles(黑方用户名);
    CREATE INDEX IF NOT EXISTS idx_battles_状态 ON battles(状态);

    CREATE TABLE IF NOT EXISTS ai_opponents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      名称 TEXT NOT NULL,
      类型 TEXT NOT NULL,
      配置 TEXT NOT NULL DEFAULT '{}',
      创建时间 TEXT NOT NULL
    );
  `)
}

function migrateUsersTokenVersion(db) {
  const row = db.prepare(`PRAGMA table_info(users)`).all()
  const hasColumn = row.some(r => r.name === 'token_version')
  if (hasColumn) return
  db.exec(`ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0`)
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
  migrateUsersTokenVersion(db)
  dbInstance = db
  return dbInstance
}

export function getDb() {
  if (!dbInstance) throw new Error('SQLite 未初始化，请先调用 openSqlite()')
  return dbInstance
}
