<template>
  <header class="debug-3d-header">
    <button class="back-btn" type="button" @click="$emit('back')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span class="location">{{ locationName }}</span>
  </header>

  <div class="battle-top-bar">
    <div class="bar-side left">{{ leftTeamName }}</div>
    <div class="bar-center">{{ barCenterText }}</div>
    <div class="bar-side right">{{ rightTeamName }}</div>
  </div>

  <div class="round-banner">
    <span class="round-text">{{ roundBannerText }}</span>
  </div>
</template>

<script setup>
defineProps({
  locationName: { type: String, default: '' },
  leftTeamName: { type: String, default: '' },
  rightTeamName: { type: String, default: '' },
  barCenterText: { type: String, default: '' },
  roundBannerText: { type: String, default: '' },
})

defineEmits(['back'])
</script>
