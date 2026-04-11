const cache = new Map()
const TTL_MS = 5 * 60 * 1000

export function getCached(userId) {
  const row = cache.get(String(userId))
  if (!row) return null
  if (Date.now() - row.时间 > TTL_MS) {
    cache.delete(String(userId))
    return null
  }
  return row
}

export function setCached(userId, 配置快照, 计算结果) {
  cache.set(String(userId), {
    配置: 配置快照,
    计算结果,
    时间: Date.now(),
  })
}

export function invalidateUser(userId) {
  cache.delete(String(userId))
}
