import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const envRoot = path.resolve(__dirname, '..')
  const env = loadEnv(mode, envRoot, '')
  const backendBaseUrl = `${env.NODEJS_PROTOCOL || 'http'}://${env.NODEJS_IP || '127.0.0.1'}:${env.NODEJS_PORT || 3000}`
  const mobilePort = Number(env.VUE3_MOBILE_PORT || 9001)
  const base = env.VUE3_MOBILE_BASE || '/'
  const backendUrl = mode === 'development' ? '' : backendBaseUrl

  return {
    root: __dirname,
    base,
    plugins: [
      vue(),
      {
        name: 'inject-backend-url',
        transformIndexHtml(html) {
          return html.replace('__BACKEND_URL_PLACEHOLDER__', backendUrl)
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@data': path.resolve(__dirname, '../data'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: mobilePort,
      proxy: {
        '/api': {
          target: backendBaseUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendBaseUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
  }
})
