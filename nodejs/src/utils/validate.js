const 安全用户名字符 = /^[\u4e00-\u9fa5a-zA-Z0-9]{1,5}$/
const 安全密码字符 = /^[a-zA-Z0-9]{1,20}$/

export function validateCredentials(用户名, 密码) {
  if (typeof 用户名 !== 'string' || typeof 密码 !== 'string') {
    return { ok: false, 消息: '用户名或密码格式无效' }
  }
  const u = 用户名.trim()
  const p = 密码
  if (u.length < 1 || u.length > 5) {
    return { ok: false, 消息: '用户名长度须为 1-5 个字符' }
  }
  if (p.length < 1 || p.length > 20) {
    return { ok: false, 消息: '密码长度须为 1-20 个字符' }
  }
  if (!安全用户名字符.test(u)) {
    return { ok: false, 消息: '用户名仅允许中文、英文字母、数字' }
  }
  if (!安全密码字符.test(p)) {
    return { ok: false, 消息: '密码仅允许英文字母、数字' }
  }
  return { ok: true, 用户名: u, 密码: p }
}

export function validatePassword(密码) {
  if (typeof 密码 !== 'string') {
    return { ok: false, 消息: '密码格式无效' }
  }
  const p = 密码
  if (p.length < 1 || p.length > 20) {
    return { ok: false, 消息: '密码长度须为 1-20' }
  }
  if (/[<>'"&]/.test(p)) {
    return { ok: false, 消息: '密码包含不允许的字符' }
  }
  return { ok: true, 密码: p }
}
