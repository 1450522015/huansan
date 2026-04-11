import axios from 'axios'

const http = axios.create({
  baseURL: typeof window !== 'undefined' && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : '',
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
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('huansan_token')
      const h = typeof window !== 'undefined' ? window.location.hash || '' : ''
      if (!h.startsWith('#/login')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(err)
  }
)

export { http }
