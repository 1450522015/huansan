<template>
  <router-view />
  <div v-if="gate.locked" class="force-update-mask">
    <div class="force-update-card">
      <h2>检测到新版本</h2>
      <p>{{ gate.reason }}</p>
      <p class="version-line">
        当前版本：{{ gate.currentVersionName || '-' }}（{{ gate.currentVersionCode || '-' }}）
      </p>
      <p class="version-line">
        最新版本：{{ gate.latestVersionName || '-' }}（{{ gate.latestVersionCode || '-' }}）
      </p>
      <button type="button" @click="onRetryDownload">重新下载最新版</button>
    </div>
  </div>
</template>

<script setup>
import { retryDownloadApk, versionGateState as gate } from '@/shared/version/versionGate.js'

function onRetryDownload() {
  retryDownloadApk()
}
</script>

<style scoped>
.force-update-mask {
  position: fixed;
  z-index: 99999;
  inset: 0;
  background: rgba(0, 0, 0, 0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.force-update-card {
  width: 100%;
  max-width: 420px;
  background: #141821;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 20px 16px;
  color: #fff;
  text-align: center;
}

.force-update-card h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.force-update-card p {
  margin: 8px 0;
  opacity: 0.95;
}

.version-line {
  font-size: 13px;
  color: #cfd6e6;
}

.force-update-card button {
  margin-top: 14px;
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 8px;
  background: #2f7dff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
