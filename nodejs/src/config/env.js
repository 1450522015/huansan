import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const port = Number(process.env.NODEJS_PORT || process.env.PORT || 3000)

export const env = {
  port,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/huansan',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  nodeEnv: process.env.NODE_ENV || 'development',
}

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-me') {
  console.warn('[config] 生产环境请设置 JWT_SECRET')
}
