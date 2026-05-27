<template>
  <div class="battle-scene" ref="battleSceneRef">
    <MountCard v-if="leftMountName" :mountName="leftMountName" side="left" />
    <MountCard v-if="rightMountName" :mountName="rightMountName" side="right" />

    <div class="team-column left-team">
      <div class="team-label">{{ leftTeamName }}</div>
      <div class="team-characters">
        <CharacterCard
          v-for="(char, index) in visibleLeftChars"
          :key="'left-' + index"
          :character="char"
          :positionKey="'left-' + index"
          :isCurrentActor="isActingPosition === 'left-' + index"
          :isSelectableTarget="selectingTarget && isSelectableTarget('left-' + index, char)"
          @target-click="(c) => $emit('select-target', c, 'left-' + index)"
          @click="(c) => $emit('char-click', c)"
          ref="leftCardRefs"
        />
      </div>
    </div>

    <div class="battle-divider"></div>

    <div class="team-column right-team">
      <div class="team-label">{{ rightTeamName }}</div>
      <div class="team-characters">
        <CharacterCard
          v-for="(char, index) in visibleRightChars"
          :key="'right-' + index"
          :character="char"
          :positionKey="'right-' + index"
          :isCurrentActor="isActingPosition === 'right-' + index"
          :isSelectableTarget="selectingTarget && isSelectableTarget('right-' + index, char)"
          @target-click="(c) => $emit('select-target', c, 'right-' + index)"
          @click="(c) => $emit('char-click', c)"
          ref="rightCardRefs"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CharacterCard from './CharacterCard.vue'
import MountCard from './MountCard.vue'

const props = defineProps({
  leftCharacters: { type: Array, required: true },
  rightCharacters: { type: Array, required: true },
  leftTeamName: { type: String, default: '敌方' },
  rightTeamName: { type: String, default: '我方' },
  leftMountName: { type: String, default: '' },
  rightMountName: { type: String, default: '' },
  isActingPosition: { type: String, default: '' },
  selectingTarget: { type: Boolean, default: false },
  isSelectableTarget: { type: Function, default: () => false },
})

defineEmits(['select-target', 'char-click'])

const battleSceneRef = ref(null)
const leftCardRefs = ref([])
const rightCardRefs = ref([])

const visibleLeftChars = computed(() => props.leftCharacters.filter(c => c !== null))
const visibleRightChars = computed(() => props.rightCharacters.filter(c => c !== null))

function getCardRef(pos) {
  if (!pos) return null
  const refs = pos.startsWith('left-') ? leftCardRefs.value : rightCardRefs.value
  const idx = pos.includes('left-')
    ? props.leftCharacters.findIndex((_, i) => 'left-' + i === pos)
    : props.rightCharacters.findIndex((_, i) => 'right-' + i === pos)
  return refs[idx] || null
}

defineExpose({ getCardRef, battleSceneRef })
</script>

<style scoped>
.battle-scene {
  flex: 1;
  position: relative;
  background: linear-gradient(180deg, #1a2a3a 0%, #2a3a4a 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 10px;
}

.team-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 2;
}

.team-label {
  font-size: 13px;
  font-weight: bold;
  color: #f5d36a;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  margin-bottom: 5px;
}

.team-characters {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.battle-divider {
  width: 2px;
  height: 80%;
  background: linear-gradient(to bottom, transparent, rgba(245, 211, 106, 0.2), transparent);
}
</style>
