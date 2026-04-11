<template>
  <div class="admin-root">
    <aside class="sidebar">
      <div class="brand">幻三 · 后台</div>
      <nav class="nav">
        <router-link to="/" class="nav-item" :class="{ active: route.name === 'home' }">首页</router-link>
        <router-link to="/users" class="nav-item" :class="{ active: route.name === 'users' }">
          用户管理
        </router-link>
      </nav>
    </aside>
    <div class="main-wrap">
      <header class="topbar">
        <span class="crumb">{{ title }}</span>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || '管理后台')
</script>

<style scoped>
.admin-root {
  display: flex;
  min-height: 100vh;
  background: var(--bg-page);
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  color: #e2e8f0;
  border-right: 1px solid var(--border);
}

.brand {
  padding: 20px 18px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  letter-spacing: 0.02em;
}

.nav {
  padding: 12px 0;
}

.nav-item {
  display: block;
  padding: 12px 18px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: rgba(59, 130, 246, 0.25);
  border-right: 3px solid #3b82f6;
}

.main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border);
}

.crumb {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
