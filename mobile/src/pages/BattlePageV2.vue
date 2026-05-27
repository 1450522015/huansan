<template>
  <teleport to="body">
    <div class="debug-3d-overlay">
      <header class="debug-3d-header">
        <button class="back-btn" type="button" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="location">{{ locationName }}</span>
      </header>

      <div class="battle-top-bar">
        <div class="bar-side left">{{ rightTeamName }}</div>
        <div class="bar-center">{{ barCenterText }}</div>
        <div class="bar-side right">{{ leftTeamName }}</div>
      </div>

      <div class="round-banner">
        <span class="round-text">{{ roundBannerText }}</span>
      </div>

      <div class="battle-scene">
        <img class="horse-img horse-left" src="@/assets/坐骑.png" alt="马" style="transform: scaleX(-1)"/>
        <span class="horse-name horse-name-left">{{ leftCharacters[1]?.mountName }}</span>
        <img class="horse-img horse-right" src="@/assets/坐骑.png" alt="马"/>
        <span class="horse-name horse-name-right">{{ rightCharacters[0]?.mountName }}</span>
        <div class="team team-left">
          <div
              v-for="(char, index) in leftCharacters"
              :key="'left-' + index"
              :ref="el => setCharEl(el, 'left-' + index)"
              class="character character-left"
              :class="{
              'char-empty': !char,
              'selectable-target': selectingTarget && isSelectableTarget('left-' + index, char)
            }"
              @click="char && (selectingTarget ? selectTarget(char, 'left-' + index) : onCharClick(char))"
          >
            <div v-if="char" class="char-inner" :ref="el => setCharInner(el, 'left-' + index)"
                 :class="{ 'current-actor': isCurrentActor('left-' + index) }">
              <div class="char-name-tag deputy-name" v-if="!char?.isHero && char?.deputyName">{{
                  char.deputyName
                }}
              </div>
              <div class="buff-tags" v-if="char?.buffs?.length">
                <span v-for="b in getTopBuffs(char.buffs)" :key="b.key"
                      class="buff-tag" :class="'buff-' + b.key">{{ b.label }}</span>
              </div>
              <div class="floating-numbers">
                <div v-for="(num, idx) in getFloatingNumbers('left-' + index)" :key="num.id" class="float-num"
                     :class="num.type" :style="{ animationDelay: (idx * 0.15) + 's' }">{{ num.text }}
                </div>
              </div>
              <div class="char-sprite">
                <div v-if="isCurrentActor('left-' + index)" class="actor-ring"></div>
                <div v-if="char?.isWushuang" class="wushuang-aura"></div>
                <canvas :ref="el => setCharCanvas(el, 'left-' + index)" class="char-canvas" width="64"
                        height="72"></canvas>
                <div class="buff-destroy" v-if="hasDestroyBuff(char)">
                  <span class="bomb-icon">
                    <span class="bomb-count">{{ getDestroyCountdown(char) }}</span>
                  </span>
                </div>
              </div>
              <div class="char-hud" v-if="char">
                <div class="bar-row hp">
                  <div class="bar-fill" :style="{ width: char.hpPct + '%' }"></div>
                </div>
                <div class="bar-row mp">
                  <div class="bar-fill" :style="{ width: char.mpPct + '%' }"></div>
                </div>
                <span class="corner-label">
                  <span class="char-class" :class="char.classColor">{{ char.class }}</span>
                  <span class="char-speed">{{ char.speed }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons" ref="actionButtonsRef" v-show="!animating && canAct">
          <div class="action-col col-a">
            <button class="action-btn" :class="{ active: currentActionMode === '攻击' && selectingTarget }"
                    type="button" :disabled="!canAct" @click="onAction('攻击')"><span class="btn-text">攻击</span>
            </button>
            <button class="action-btn disabled" disabled><span class="btn-text">招降</span></button>
            <button class="action-btn" ref="summonBtnRef"
                    :class="{ active: showSummonPopup || currentActionMode === '招将', disabled: !canSummonNow }" type="button"
                    :disabled="!canSummonNow" @click="onAction('招将')"><span class="btn-text">招将</span></button>
            <button class="action-btn disabled" disabled><span class="btn-text">逃跑</span></button>
          </div>
          <div class="action-col col-b">
            <button class="action-btn" :class="{ active: currentActionMode === '技能' && selectingTarget }"
                    type="button" :disabled="!canAct" ref="skillBtnRef" @click="onAction('技能')"><span
                class="btn-text">技能</span></button>
            <button class="action-btn"
                    :class="{ active: showItemPopup || (currentActionMode === '物品' && selectingTarget) }"
                    type="button" :disabled="!canAct" ref="itemBtnRef" @click="onAction('物品')"><span class="btn-text">物品</span></button>
            <button class="action-btn" :class="{ active: currentActionMode === '防御' }" type="button"
                    :disabled="!canAct" @click="onAction('防御')"><span class="btn-text">防御</span></button>
          </div>
        </div>

        <div v-if="showItemPopup" class="item-popup" :style="popupPosition" @click.stop>
          <div v-for="item in availableItems" :key="item.name" class="item-option" @click="onSelectItem(item)">
            {{ item.name }}
          </div>
        </div>
        <div v-if="showSummonPopup" class="item-popup summon-popup centered-popup" :style="popupPosition" @click.stop>
          <div v-for="d in candidateRecruits" :key="d.name + '-' + d.slot" class="item-option recruit-item"
               @click="onSelectSummon(d)">
            <div class="recruit-line1">{{ d.line1 }}</div>
            <div class="recruit-line2">{{ d.line2 }}</div>
          </div>
          <div v-for="i in Math.max(0, 7 - candidateRecruits.length)" :key="'summon-empty-' + i"
               class="item-option item-option-empty"></div>
        </div>
        <div v-if="showSkillPopup" class="item-popup" :style="popupPosition" @click.stop>
          <div v-for="s in currentUnitSkills" :key="s.name + '-' + s.level" class="item-option"
               @click="onSelectSkill(s)">{{ s.displayName || s.name }}
          </div>
          <div v-if="!currentUnitSkills.length" class="item-option muted">无可用技能</div>
        </div>

        <div class="team team-right">
          <div
              v-for="(char, index) in rightCharacters"
              :key="'right-' + index"
              :ref="el => setCharEl(el, 'right-' + index)"
              class="character character-right"
              :class="{
              'char-empty': !char,
              'selectable-target': selectingTarget && isSelectableTarget('right-' + index, char)
            }"
              @click="char && (selectingTarget ? selectTarget(char, 'right-' + index) : onCharClick(char))"
          >
            <div v-if="char" class="char-inner" :ref="el => setCharInner(el, 'right-' + index)"
                 :class="{ 'current-actor': isCurrentActor('right-' + index) }">
              <div class="char-name-tag deputy-name" v-if="!char?.isHero && char?.deputyName">{{
                  char.deputyName
                }}
              </div>
              <div class="buff-tags" v-if="char?.buffs?.length">
                <span v-for="b in getTopBuffs(char.buffs)" :key="b.key"
                      class="buff-tag" :class="'buff-' + b.key">{{ b.label }}</span>
              </div>
              <div class="floating-numbers">
                <div v-for="(num, idx) in getFloatingNumbers('right-' + index)" :key="num.id" class="float-num"
                     :class="num.type" :style="{ animationDelay: (idx * 0.15) + 's' }">{{ num.text }}
                </div>
              </div>
              <div class="char-sprite">
                <div v-if="isCurrentActor('right-' + index)" class="actor-ring"></div>
                <div v-if="char?.isWushuang" class="wushuang-aura"></div>
                <canvas :ref="el => setCharCanvas(el, 'right-' + index)" class="char-canvas" width="64"
                        height="72"></canvas>
                <div class="buff-destroy" v-if="hasDestroyBuff(char)">
                  <span class="bomb-icon">
                    <span class="bomb-count">{{ getDestroyCountdown(char) }}</span>
                  </span>
                </div>
              </div>
              <div class="char-hud" v-if="char">
                <div class="bar-row hp">
                  <div class="bar-fill" :style="{ width: char.hpPct + '%' }"></div>
                </div>
                <div class="bar-row mp">
                  <div class="bar-fill" :style="{ width: char.mpPct + '%' }"></div>
                </div>
                <span class="corner-label">
                  <span class="char-class" :class="char.classColor">{{ char.class }}</span>
                  <span class="char-speed">{{ char.speed }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="scene-bottom-controls">
          <button class="ctrl-btn" type="button" :class="{ active: autoEnabled }" @click="toggleAuto">自动</button>
          <button class="ctrl-btn danger" type="button" @click="onFlee">逃跑</button>
          <button class="ctrl-btn" type="button" @click="toggleSpeed">{{ speedText }}</button>
        </div>
      </div>

      <section class="chat-area">
        <div class="chat-tabs">
          <button
              v-for="tab in tabs"
              :key="tab.id"
              class="chat-tab"
              :class="['tab-' + tab.id, { active: activeTab === tab.id }]"
              @click="activeTab = tab.id"
          >{{ tab.label }}
          </button>
        </div>

        <div class="chat-content">
          <div v-if="activeTab === 'chat'" class="chat-messages">
            <div v-for="(msg, i) in chatMessages" :key="i" class="chat-msg" :class="{ self: msg.from === myUsername }">
              <span class="msg-sender">{{ msg.from }}</span>
              <span class="msg-text">{{ msg.text }}</span>
            </div>
          </div>
          <div v-else-if="activeTab === 'debug'" class="debug-panel">
            <pre class="debug-event-text">{{ debugEventText }}</pre>
          </div>
          <div v-else-if="activeTab === 'dev'" class="dev-panel">
            <div class="dev-row compact">
              <span class="dev-label">武将</span>
              <select v-model="charForm.subject">
                <option value="">主体</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <select v-model="charForm.action" :disabled="!charForm.subject">
                <option value="">操作</option>
                <option value="死亡">死亡</option>
                <option value="复活">复活</option>
                <option value="无双开启">无双开启</option>
                <option value="无双关闭">无双关闭</option>
                <option value="气血伤害">气血伤害</option>
                <option value="气血回复">气血回复</option>
                <option value="精力回复">精力回复</option>
              </select>
              <input type="number" v-model.number="charForm.value" min="0" placeholder="数值" class="damage-input"/>
              <button class="demo-btn" type="button" @click="onCharAction" :disabled="!charForm.subject || !charForm.action">演示</button>
            </div>

            <div class="dev-row compact">
              <span class="dev-label">攻击</span>
              <select v-model="attackForm.subject">
                <option value="">主体</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <select v-model="attackForm.animation">
                <option value="">动画</option>
                <option value="普通攻击">普通攻击</option>
                <option value="暴击攻击">暴击攻击</option>
                <option value="致命攻击">致命攻击</option>
                <option value="未命中">未命中</option>
              </select>
              <select v-model="attackForm.target">
                <option value="">目标</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <input type="number" v-model.number="attackForm.damage" min="0" placeholder="伤害" class="damage-input"/>
              <button class="demo-btn" type="button" @click="onAttackDemo" :disabled="!canAttackDemo">演示</button>
            </div>

            <div class="dev-row compact">
              <span class="dev-label">技能</span>
              <select v-model="skillForm.subject">
                <option value="">主体</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <select v-model="skillForm.action">
                <option value="">操作</option>
                <option v-for="s in skillList" :key="s" :value="s">{{ s }}</option>
              </select>
              <select v-model="skillForm.target">
                <option value="">目标</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <input type="number" v-model.number="skillForm.damage" min="0" placeholder="伤害" class="damage-input"/>
              <button class="demo-btn" type="button" @click="onSkillDemo" :disabled="!canSkillDemo">演示</button>
            </div>

            <div class="dev-row compact">
              <span class="dev-label">Buff</span>
              <select v-model="buffForm.subject">
                <option value="">主体</option>
                <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
              </select>
              <label v-for="b in buffList" :key="b.key" class="buff-checkbox">
                <input type="checkbox" v-model="buffForm.buffs" :value="b.key" />
                <span :style="{ color: b.color }">{{ b.label }}</span>
              </label>
              <button class="demo-btn" type="button" @click="onBuffDemo" :disabled="!buffForm.subject">演示</button>
            </div>
          </div>
        </div>

        <div class="chat-input-bar">
          <button class="ib-btn ib-plus" type="button">+</button>
          <button class="ib-btn ib-emoji" type="button">😊</button>
          <input class="ib-input" type="text" v-model="chatInput" @keydown="handleOnInputKeydown"
                 placeholder="输入消息..."/>
          <button class="ib-send" type="button" @click="sendChat">发送</button>
        </div>
      </section>

      <div class="char-detail-modal" v-if="selectedChar" @click="selectedChar = null">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <span class="modal-title">{{
                selectedChar.isHero ? (selectedChar.name || '主将') : (selectedChar.deputyName || '副将')
              }}</span>
          </div>
          <div class="modal-body">
            <div class="stat-row">
              <div class="stat-bar-container hp-bar">
                <div class="stat-bar-fill" :style="{ width: selectedChar.hpPct + '%' }"></div>
                <span class="stat-bar-text">{{ selectedChar.currentHp }}/{{ selectedChar.maxHp }}</span>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat-bar-container mp-bar">
                <div class="stat-bar-fill" :style="{ width: selectedChar.mpPct + '%' }"></div>
                <span class="stat-bar-text">{{ selectedChar.currentMp }}/{{ selectedChar.maxMp }}</span>
              </div>
            </div>
            <div class="stat-row center">
              <span class="stat-value speed">速度第{{ selectedChar.speed }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="battle-end-overlay" v-if="localBattleEndInfo" @click="onBattleEndConfirm">
        <div class="battle-end-content" @click.stop>
          <div class="end-title">{{ endTitle }}</div>
          <div class="end-reason" v-if="endReasonText">{{ endReasonText }}</div>
          <button class="end-confirm-btn" type="button" @click="onBattleEndConfirm">确认</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import {computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useBattleStore} from '@/stores/battleStore.js'
import {drawStickman, stopBreathing} from '@/shared/canvas/stickman'

import {useBattleState} from '@/features/battle/composables/useBattleState.js'
import {useBattleActions} from '@/features/battle/composables/useBattleActions.js'
import {useBattleAnimation} from '@/features/battle/composables/useBattleAnimation.js'
import {useBattleEventPlayer} from '@/features/battle/composables/useBattleEventPlayer.js'

import './BattlePageV2.css'
import './BattlePageV2.animations.css'

const router = useRouter()
const battleStore = useBattleStore()

const charCanvases = new Map()
const charEls = new Map()
const charInners = new Map()
const battleSpeed = ref(1)

const positions = ['左主将', '左副将1', '左副将2', '左副将3', '右主将', '右副将1', '右副将2', '右副将3']

const charForm = reactive({subject: '', action: '', value: 0})
const attackForm = reactive({subject: '', animation: '', target: '', damage: 0})
const skillForm = reactive({subject: '', action: '', target: '', damage: 0})
const buffForm = reactive({subject: '', buffs: []})

const buffList = [
  { key: '固', label: '固', color: '#FFD700' },
  { key: '速', label: '速', color: '#B0D4FF' },
  { key: '围', label: '围', color: '#CC66FF' },
  { key: '乱', label: '乱', color: '#FF4444' },
  { key: '封', label: '封', color: '#FF4444' },
  { key: '隐', label: '隐', color: '#333333' },
  { key: '毒', label: '毒', color: '#44DD44' },
  { key: '毁', label: '毁', color: '#333333' },
]
const skillList = [
  '舍命一击', '力劈华山', '排山倒海', '固若金汤', '凌波微步',
  '画地为牢', '趁火打劫', '四面楚歌', '金蝉脱壳', '暗渡陈仓',
  '呼风唤雨', '妖火燎原', '五雷轰顶', '巫蛊极毒', '毁天灭地'
]

const battleState = useBattleState(charCanvases)

const {
  leftCharacters, rightCharacters, round, remainingSeconds,
  eventBannerText, syncCharactersFromSnapshot, startCountdown, stopCountdown,
  initBattleDrawing, positionMap, createChar, debugEventText,
} = battleState

const battleAnimation = useBattleAnimation(charCanvases, charInners, charEls)

const {
  animating, playAttackAnimation, onSkillDemoForAnimation,
} = battleAnimation

const battleActions = useBattleActions(
    leftCharacters, rightCharacters, remainingSeconds, eventBannerText, battleSpeed
)

const {
  currentUnitKey, selectingTarget,
  showItemPopup, showSummonPopup, showSkillPopup, currentActionMode,
  myUsername, canAct, canSummonNow, candidateRecruits, currentUnitSkills, availableItems,
  chatInput, chatMessages, activeTab, tabs,
  autoEnabled, selectedChar,
  actionButtonsRef, skillBtnRef, summonBtnRef, itemBtnRef, popupPosition,
  getFloatingNumbers, isSelectableTarget, isCurrentActor,
  onAction, onSelectSkill, onSelectItem, onSelectSummon, selectTarget,
  onCharClick, toggleAuto, toggleSpeed, onFlee,
  sendChat, handleOnInputKeydown, onGlobalPointerDown,
} = battleActions

const eventPlayer = useBattleEventPlayer(
    battleState, battleActions, battleAnimation, battleSpeed
)

const {
  updateCharsFromRoundInitial,
  updateCharsFromSnapshot,
  enterActingPhase,
  setPageActive,
  stopWatch,
} = eventPlayer

const localBattleEndInfo = ref(null)
let 上次回合初状态 = null
let pageActive = true

const isVictory = computed(() => {
  if (!localBattleEndInfo.value) return false
  return localBattleEndInfo.value.战胜方玩家名称 === myUsername.value
})

const endTitle = computed(() => {
  if (!localBattleEndInfo.value) return ''
  const 战胜方 = localBattleEndInfo.value.战胜方玩家名称
  if (!战胜方) return '战局结束'
  return isVictory.value ? '胜利' : '战败'
})

const endReasonText = computed(() => {
  const reason = localBattleEndInfo.value?.原因 || ''
  if (!reason) return ''
  if (reason.includes('逃跑')) {
    return reason.startsWith(myUsername.value) ? '你已逃跑' : '对方已逃跑'
  }
  return reason
})

const locationName = computed(() => {
  const s = battleStore.battleSnapshot
  if (!s || !s.战局描述) return '许昌郊外'
  return s.战局描述.场景名称 || s.战局描述.位置 || '许昌郊外'
})

const leftTeamName = computed(() => {
  const s = battleStore.battleSnapshot
  if (!s || !s.战局描述) return '敌方'
  return s.是红方 ? (s.战局描述.黑方用户名 || '敌方') : (s.战局描述.红方用户名 || '敌方')
})

const rightTeamName = computed(() => {
  const s = battleStore.battleSnapshot
  if (!s || !s.战局描述) return '我方'
  return s.是红方 ? (s.战局描述.红方用户名 || '我方') : (s.战局描述.黑方用户名 || '我方')
})

const barCenterText = computed(() => {
  if (eventBannerText.value) return eventBannerText.value
  if (localBattleEndInfo.value) return '战局结束'
  if (battleAnimation.animating.value) return '结算中...'
  if (!currentUnitKey.value) {
    return `等待对方出招中(${remainingSeconds.value})`
  }
  const unit = battleActions.selfUnits.value.find(u => u.key === currentUnitKey.value)
  const name = unit?.name || '?'
  return `${name}-出招(${remainingSeconds.value})`
})

const speedText = computed(() => {
  if (battleSpeed.value === 0) return '无动画'
  return `速度×${battleSpeed.value}`
})

const roundBannerText = computed(() => {
  return `第${round.value}回合`
})

const canAttackDemo = computed(() => {
  if (!attackForm.animation) return false
  return !!(attackForm.subject && attackForm.target)
})

const canSkillDemo = computed(() => {
  if (!skillForm.action) return false
  return !!(skillForm.subject && skillForm.target)
})

function onCharAction() {
  if (!charForm.subject || !charForm.action) return
  const info = positionMap[charForm.subject]
  if (!info) return
  const {side, idx} = info
  const charArray = side === 'left' ? leftCharacters.value : rightCharacters.value
  const pos = (side === 'left' ? 'left-' : 'right-') + idx
  if (charForm.action === '死亡') {
    charArray[idx] = null
  } else if (charForm.action === '复活') {
    charArray[idx] = {
      ...createChar(idx, side),
      isHero: (side === 'right' && idx === 0) || (side === 'left' && idx === 1)
    }
  } else if (charForm.action === '无双开启') {
    if (charArray[idx]) {
      charArray[idx] = {...charArray[idx], isWushuang: true, deputyName: '无双-' + charArray[idx].deputyName}
    }
  } else if (charForm.action === '无双关闭') {
    if (charArray[idx] && charArray[idx].isWushuang) {
      const oldName = charArray[idx].deputyName
      const cleanName = oldName.replace('无双-', '')
      charArray[idx] = {...charArray[idx], isWushuang: false, deputyName: cleanName}
    }
  } else if (charForm.action === '气血伤害') {
    const val = charForm.value || 0
    if (charArray[idx] && val > 0) {
      battleActions.addFloatingNumber(pos, 'damage', val)
    }
  } else if (charForm.action === '气血回复') {
    const val = charForm.value || 0
    if (charArray[idx] && val > 0) {
      battleActions.addFloatingNumber(pos, 'heal', val)
    }
  } else if (charForm.action === '精力回复') {
    const val = charForm.value || 0
    if (charArray[idx] && val > 0) {
      battleActions.addFloatingNumber(pos, 'mp', val)
    }
  }
  charForm.action = ''
}

function onBuffDemo() {
  if (!buffForm.subject) return
  const info = positionMap[buffForm.subject]
  if (!info) return
  const {side, idx} = info
  const charArray = side === 'left' ? leftCharacters.value : rightCharacters.value
  if (!charArray[idx]) return
  charArray[idx] = {...charArray[idx], buffs: [...buffForm.buffs]}
}

const buffColorMap = {
  '固': '#FFD700', '速': '#B0D4FF', '围': '#CC66FF', '乱': '#FF4444',
  '封': '#FF4444', '隐': '#333333', '毒': '#44DD44', '毁': '#333333',
}

function getTopBuffs(buffs) {
  if (!buffs) return []
  return buffs.filter(b => b !== '毁').slice(0, 4).map(b => ({ key: b, label: b, color: buffColorMap[b] || '#fff' }))
}

function getDestroyBuff(char) {
  const details = Array.isArray(char?.buffDetails) ? char.buffDetails : []
  return details.find(b => b?.名称 === '毁') || (char?.buffs?.includes('毁') ? { 名称: '毁' } : null)
}

function hasDestroyBuff(char) {
  return !!getDestroyBuff(char)
}

function getDestroyCountdown(char) {
  const buff = getDestroyBuff(char)
  const total = Number(buff?.总回合数)
  const start = Number(buff?.开始回合数)
  if (!Number.isFinite(total) || !Number.isFinite(start)) return ''
  return Math.max(0, total - round.value + start)
}

function setCharCanvas(el, key) {
  if (el) charCanvases.set(key, el)
  else charCanvases.delete(key)
}

function setCharEl(el, key) {
  if (el) charEls.set(key, el)
  else charEls.delete(key)
}

function setCharInner(el, key) {
  if (el) charInners.set(key, el)
  else charInners.delete(key)
}

async function onAttackDemo() {
  if (animating.value || !canAttackDemo.value) return
  animating.value = true
  try {
    const {animation, subject, target, damage} = attackForm
    const isHit = animation !== '未命中'
    await playAttackAnimation(subject, target, isHit, damage || 0, animation)
  } finally {
    animating.value = false
  }
}

async function onSkillDemo() {
  if (animating.value || !canSkillDemo.value) return
  animating.value = true
  try {
    const {action, subject, target, damage} = skillForm
    await onSkillDemoForAnimation(action, subject, target, damage || 0, battleSpeed.value)
  } finally {
    animating.value = false
  }
}

function goBack() {
  router.back()
}

function onBattleEndConfirm() {
  battleStore.clearBattle()
  localBattleEndInfo.value = null
  router.back()
}

watch([leftCharacters, rightCharacters], () => {
  nextTick(() => {
    for (let i = 0; i < 4; i++) {
      drawStickman(charCanvases.get('left-' + i), 'left-' + i)
      drawStickman(charCanvases.get('right-' + i), 'right-' + i)
    }
  })
}, {deep: true})

async function 渲染战局快照(snapshot) {
  if (!snapshot) return
  const 回合信息 = snapshot.回合信息
  const 已结束 = snapshot.战局描述?.状态 === '已结束'
  const 当前回合 = Number(snapshot.战局描述?.当前回合 || 0)

  round.value = 当前回合

  if (已结束 && 回合信息) {
    上次回合初状态 = null
    updateCharsFromRoundInitial(回合信息)
    await nextTick()
    await new Promise(r => setTimeout(r, 800))
    updateCharsFromSnapshot()
    localBattleEndInfo.value = {
      战胜方玩家名称: snapshot.战局描述?.战胜方玩家名称,
      原因: snapshot.战局描述?.结束原因 || '',
    }
  } else {
    updateCharsFromSnapshot()
    if (已结束) {
      localBattleEndInfo.value = {
        战胜方玩家名称: snapshot.战局描述?.战胜方玩家名称,
        原因: snapshot.战局描述?.结束原因 || '',
      }
    } else {
      if (snapshot._红方已出招 !== undefined || snapshot._黑方已出招 !== undefined) {
        enterActingPhase()
      }
    }
  }
}

watch(() => battleStore.battleSnapshot, (snapshot) => {
  if (!pageActive) return
  if (!snapshot) return
  渲染战局快照(snapshot)
}, {deep: true, immediate: false})

onMounted(async () => {
  pageActive = true
  setPageActive(true)
  if (battleStore.battleSnapshot) {
    syncCharactersFromSnapshot()
    await nextTick()
    initBattleDrawing()
    await 渲染战局快照(battleStore.battleSnapshot)
  }
})

onActivated(async () => {
  pageActive = true
  setPageActive(true)
  if (battleStore.battleSnapshot) {
    syncCharactersFromSnapshot()
    await nextTick()
    initBattleDrawing()
    await 渲染战局快照(battleStore.battleSnapshot)
  }
})

onDeactivated(() => {
  pageActive = false
  setPageActive(false)
  stopBreathing()
  stopCountdown()
})

onBeforeUnmount(() => {
  pageActive = false
  setPageActive(false)
  stopBreathing()
  stopCountdown()
  if (stopWatch) stopWatch?.()
})
</script>