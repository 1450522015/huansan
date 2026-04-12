import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../../..')
dotenv.config({ path: path.resolve(projectRoot, '.env') })

const port = Number(process.env.NODEJS_PORT || process.env.PORT || 3000)

const rawSqlite = process.env.SQLITE_PATH || ''
const sqlitePath = rawSqlite.trim()
  ? path.isAbsolute(rawSqlite)
    ? rawSqlite
    : path.resolve(projectRoot, rawSqlite)
  : path.join(projectRoot, 'data', 'huansan.sqlite')

export const env = {
  port,
  sqlitePath,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  nodeEnv: process.env.NODE_ENV || 'development',
}

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-me') {
  console.warn('[config] 生产环境请设置 JWT_SECRET')
}
