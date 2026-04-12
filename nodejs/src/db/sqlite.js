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
  `)
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
