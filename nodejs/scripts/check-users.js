/**
 * 列出 SQLite 中的用户（需与 node 服务使用同一 SQLITE_PATH / 默认 data/huansan.sqlite）。
 * 用法：在 nodejs 目录执行 npm run check-users
 */
import { env } from '../src/config/env.js'
import { openSqlite, getDb } from '../src/db/sqlite.js'

openSqlite()
const rows = getDb().prepare('SELECT id, 用户名, 创建时间, 最近登录时间, 配置已认证 FROM users ORDER BY id').all()
console.log(`库文件: ${env.sqlitePath}`)
console.log(`共 ${rows.length} 个用户:\n`)
for (const u of rows) {
  console.log(`  #${u.id} ${u.用户名}  创建:${u.创建时间}  最近登录:${u.最近登录时间 || '—'}  配置已认证:${u.配置已认证}`)
}
