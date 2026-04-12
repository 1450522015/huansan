import axios from 'axios'
import { getStoredCredentials } from '@/shared/auth/storage.js'

const baseURL =
  typeof window !== 'undefined' && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : ''

const http = axios.create({
  baseURL,
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('huansan_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config
    const status = err.response?.status
    if (status !== 401 || !cfg) {
      return Promise.reject(err)
    }
    const url = String(cfg.url || '')
    if (url.includes('/login') || url.endsWith('login')) {
      return Promise.reject(err)
    }
    if (cfg._retryAfter401) {
      return Promise.reject(err)
    }

    localStorage.removeItem('huansan_token')
    const { 用户名, 密码 } = getStoredCredentials()
    if (!用户名 || !密码) {
      const h = typeof window !== 'undefined' ? window.location.hash || '' : ''
      if (!h.startsWith('#/login')) {
        const cur = h.startsWith('#') ? h.slice(1).split('?')[0] || '/' : '/'
        const q = cur !== '/' && cur !== '/login' ? `?redirect=${encodeURIComponent(cur)}` : ''
        window.location.hash = `#/login${q}`
      }
      return Promise.reject(err)
    }

    try {
      const { data } = await axios.post(`${baseURL}/api/login`, { 用户名, 密码 }, { timeout: 30000 })
      if (data?.token) {
        localStorage.setItem('huansan_token', data.token)
        cfg._retryAfter401 = true
        cfg.headers = cfg.headers || {}
        cfg.headers.Authorization = `Bearer ${data.token}`
        return http.request(cfg)
      }
    } catch {
      /* 自动登录失败 */
    }

    const h = typeof window !== 'undefined' ? window.location.hash || '' : ''
    if (!h.startsWith('#/login')) {
      const cur = h.startsWith('#') ? h.slice(1).split('?')[0] || '/' : '/'
      const q = cur !== '/' && cur !== '/login' ? `?redirect=${encodeURIComponent(cur)}` : ''
      window.location.hash = `#/login${q}`
    }
    return Promise.reject(err)
  }
)

export { http }
