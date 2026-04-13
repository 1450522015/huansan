import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router/index.js'
import { initVersionGate } from '@/shared/version/versionGate.js'

import './styles/base.css'

async function bootstrap() {
  await initVersionGate()
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
