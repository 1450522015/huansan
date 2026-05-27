<template>
  <div class="shell">
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component v-if="route.meta.fullscreen" :is="Component" key="battle-cache" />
      </keep-alive>
      <component v-if="!route.meta.fullscreen" :is="Component" :key="route.fullPath" />
    </router-view>
    <nav v-if="!isFullscreen" class="tabs">
      <router-link to="/">主页</router-link>
      <router-link to="/hall">大厅</router-link>
      <router-link to="/ai">人机</router-link>
      <router-link to="/more">更多</router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getToken } from '@/shared/auth/storage.js'
import { loadPlayerConfig } from '@/shared/config/usePlayerConfig.js'
import { useBattleStore } from '@/stores/battleStore.js'

const route = useRoute()
const pkStore = useBattleStore()

const isFullscreen = computed(() => route.meta.fullscreen === true)

onMounted(() => {
  if (!getToken()) return
  loadPlayerConfig()
  pkStore.init()
})

onUnmounted(() => {
  pkStore.destroy()
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  padding-bottom: 4px;
}
</style>
