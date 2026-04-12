import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken, getStoredCredentials } from '@/shared/auth/storage.js'
import { http } from '@/shared/api/http.js'

import LoginPage from '@/pages/LoginPage.vue'
import ShellLayout from '@/layouts/ShellLayout.vue'
import HomePage from '@/pages/HomePage.vue'
import ConfigMainPage from '@/pages/ConfigMainPage.vue'
import ConfigDeputyPage from '@/pages/ConfigDeputyPage.vue'
import HallPage from '@/pages/HallPage.vue'
import BattlePage from '@/pages/BattlePage.vue'
import ChannelPage from '@/pages/ChannelPage.vue'
import MorePage from '@/pages/MorePage.vue'

function isPublicRoute(to) {
  return to.matched.some((r) => r.meta.public === true)
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true },
    },
    {
      path: '/',
      component: ShellLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'home', component: HomePage, meta: { requiresAuth: true } },
        { path: 'hall', name: 'hall', component: HallPage, meta: { requiresAuth: true } },
        { path: 'battle', name: 'battle', component: BattlePage, meta: { requiresAuth: true } },
        { path: 'channel', name: 'channel', component: ChannelPage, meta: { requiresAuth: true } },
        { path: 'config/main', name: 'config-main', component: ConfigMainPage, meta: { requiresAuth: true } },
        {
          path: 'config/deputy',
          name: 'config-deputy',
          component: ConfigDeputyPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'config',
          redirect: (to) => {
            const s = to.query?.slot
            if (s != null && String(s).trim() !== '') {
              return { name: 'config-deputy', query: { slot: String(s) } }
            }
            return { name: 'config-main' }
          },
        },
        { path: 'more', name: 'more', component: MorePage, meta: { requiresAuth: true } },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'catch-all',
      redirect: (to) => {
        if (getToken()) return { path: '/', replace: true }
        return {
          name: 'login',
          replace: true,
          query: to.path && to.path !== '/login' ? { redirect: to.path } : {},
        }
      },
    },
  ],
})

async function tryAutoLoginFromStorage() {
  const { 用户名, 密码 } = getStoredCredentials()
  if (!用户名 || !密码) return false
  try {
    const { data } = await http.post('/api/login', { 用户名, 密码 })
    if (data?.token) {
      localStorage.setItem('huansan_token', data.token)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

router.beforeEach(async (to) => {
  if (isPublicRoute(to)) {
    return true
  }

  if (getToken()) {
    return true
  }

  const ok = await tryAutoLoginFromStorage()
  if (ok) {
    return true
  }

  const q = {}
  if (to.name && !isPublicRoute(to) && to.path !== '/login') {
    q.redirect = to.fullPath || to.path || '/'
  }
  return { name: 'login', replace: true, query: q }
})

export default router
