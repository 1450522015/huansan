import axios from 'axios'

const http = axios.create({
  baseURL: typeof window !== 'undefined' && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : '',
  timeout: 30000,
})

export { http }
