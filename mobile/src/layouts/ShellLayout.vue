<template>
  <div class="shell">
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component v-if="route.name === 'battle'" :is="Component" key="battle-cache" />
      </keep-alive>
      <component v-if="route.name !== 'battle'" :is="Component" :key="route.fullPath" />
    </router-view>
    <nav class="tabs">
      <router-link to="/">主页</router-link>
      <router-link to="/hall">大厅</router-link>
      <router-link to="/battle">战局</router-link>
      <router-link to="/ai">人机</router-link>
      <router-link to="/more">更多</router-link>
    </nav>

    <PkDialog
      :visible="store.isDialogVisible"
      :mode="store.dialogMode"
      :发起用户名="store.starterName"
      :发起转数="store.starterInfo.转数"
      :发起等级="store.starterInfo.等级"
      :发起职业串="store.starterInfo.职业串"
      :目标用户名="store.opponent"
      :目标转数="store.opponentInfo.转数"
      :目标等级="store.opponentInfo.等级"
      :目标职业串="store.opponentInfo.职业串"
      :reject-reason="store.rejectReason"
      @accepted="store.acceptChallenge"
      @rejected="store.rejectChallenge"
      @cancel="store.cancelChallenge"
      @confirm-rejected="store.confirmRejected"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { getToken } from '@/shared/auth/storage.js'
import { loadPlayerConfig } from '@/shared/config/usePlayerConfig.js'
import { useBattleStore } from '@/stores/battleStore.js'
import PkDialog from '@/components/PkDialog.vue'

const store = useBattleStore()

onMounted(() => {
  if (!getToken()) return
  loadPlayerConfig()
  store.init()
})

onUnmounted(() => {
  store.destroy()
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  padding-bottom: 4px;
}
</style>
