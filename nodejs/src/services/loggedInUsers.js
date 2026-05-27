const loggedInUsers = new Map()

export function addLoggedInUser(userId, 用户名, token, 登录时间 = Date.now()) {
  loggedInUsers.set(String(userId), {
    userId,
    用户名,
    token,
    登录时间
  })
}

export function removeLoggedInUser(userId) {
  loggedInUsers.delete(String(userId))
}

export function isLoggedIn(userId) {
  return loggedInUsers.has(String(userId))
}

export function isLoggedInByUsername(用户名) {
  for (const [, u] of loggedInUsers) {
    if (u.用户名 === 用户名) return true
  }
  return false
}

export function removeLoggedInByUsername(用户名) {
  for (const [userId, u] of loggedInUsers) {
    if (u.用户名 === 用户名) {
      loggedInUsers.delete(userId)
      return true
    }
  }
  return false
}

export function getLoggedInUser(userId) {
  return loggedInUsers.get(String(userId)) || null
}

export function getAllLoggedInUsers() {
  return Array.from(loggedInUsers.values())
}
