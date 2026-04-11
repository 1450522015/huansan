const K = {
  token: 'huansan_token',
  用户名: 'huansan_用户名',
  密码: 'huansan_密码',
}

export function saveSession({ token, 用户名, 密码 }) {
  if (token) localStorage.setItem(K.token, token)
  if (用户名) localStorage.setItem(K.用户名, 用户名)
  if (密码) localStorage.setItem(K.密码, 密码)
}

export function clearSession() {
  localStorage.removeItem(K.token)
  localStorage.removeItem(K.用户名)
  localStorage.removeItem(K.密码)
}

export function getToken() {
  return localStorage.getItem(K.token)
}

export function getStoredCredentials() {
  const 用户名 = localStorage.getItem(K.用户名) || ''
  const 密码 = localStorage.getItem(K.密码) || ''
  return { 用户名, 密码 }
}
