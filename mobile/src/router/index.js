import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken, getStoredCredentials } from '@/shared/auth/storage.js'
import { http } from '@/shared/api/http.js'

import LoginPage from '@/pages/LoginPage.vue'
import ShellLayout from '@/layouts/ShellLayout.vue'
import ConfigPage from '@/pages/ConfigPage.vue'
import AttrsPage from '@/pages/AttrsPage.vue'
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
        { path: '', name: 'config', component: ConfigPage, meta: { requiresAuth: true } },
        { path: 'attrs', name: 'attrs', component: AttrsPage, meta: { requiresAuth: true } },
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

let autoLoginAttempted = false

router.beforeEach(async (to) => {
  if (isPublicRoute(to)) {
    return true
  }

  if (getToken()) {
    return true
  }

  if (!autoLoginAttempted) {
    autoLoginAttempted = true
    const { 用户名, 密码 } = getStoredCredentials()
    if (用户名 && 密码) {
      try {
        const { data } = await http.post('/api/login', { 用户名, 密码 })
        if (data?.token) {
          localStorage.setItem('huansan_token', data.token)
          return true
        }
      } catch {
        /* 自动登录失败则去登录页 */
      }
    }
  }

  const q = {}
  if (to.name && !isPublicRoute(to) && to.path !== '/login') {
    q.redirect = to.path || '/'
  }
  return { name: 'login', replace: true, query: q }
})

export default router
