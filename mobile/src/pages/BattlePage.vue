<template>
  <div class="page battle-page">
    <template v-if="(战局中 || showBattleEndPopup) && 对手用户名">
      <!-- 第一栏：对阵信息 -->
      <div class="battle-header">
        <div class="side-name opponent-name">{{ 对手用户名 }}</div>
        <div class="system-msg">{{ 系统提示词 }}</div>
        <div class="side-name self-name">{{ 当前用户名 }}</div>
      </div>

      <!-- 横幅（倒计时+状态） -->
      <div class="battle-banner" :class="bannerTone">{{ bannerText }}</div>

      <!-- 第二栏：战斗主区域 -->
      <div class="battle-main" :style="battleAnimStyle" @click.self="onAreaClick">
        <!-- 左侧：对手队伍 -->
        <div class="team-side opponent-team">
          <div
            v-for="(unit, idx) in opponentTeam"
            :key="'opp-' + idx"
            class="unit-card"
            :class="[unitCardClass(unit, idx), unitActiveClass(unit)]"
            @click="onUnitClick(unit, 'enemy')"
          >
            <template v-if="unit.type === 'mount'">
              <div class="mount-box">{{ unit.坐骑名 }}</div>
            </template>
            <template v-else-if="unit.type === 'unit' && !isDeadDeputyHidden(unit)">
              <div class="status-box" :style="unitBorderStyle(unit)">
                <div v-if="idx !== 1" class="unit-name">{{ unit.名称 }}</div>
                <div class="bar-wrap" :class="{ 'bar-masked': isUnitInfoHidden(unit) }">
                  <div class="bar hp-bar" :style="{ width: unitHpBarWidthPct(unit) + '%' }"></div>
                  <span class="bar-text">{{ unitHpMpText(unit, 'hp') }}</span>
                </div>
                <div class="bar-wrap" :class="{ 'bar-masked': isUnitInfoHidden(unit) }">
                  <div class="bar mp-bar" :style="{ width: unitHpBarWidthPct(unit, 'mp') + '%' }"></div>
                  <span class="bar-text">{{ unitHpMpText(unit, 'mp') }}</span>
                </div>
                <div class="meta-line" :class="{ 'meta-masked': isUnitInfoHidden(unit) }">
                  <span class="job-tag">{{ isUnitInfoHidden(unit) ? '·' : unit.职业 }}</span>
                  <span class="speed-rank">{{ isUnitInfoHidden(unit) ? '·' : `速${unit.速度排名}` }}</span>
                </div>
                <div class="buff-line">{{ displayUnitBuff(unit) }}</div>
              </div>
            </template>
            <div v-else class="empty-box"></div>
          </div>
        </div>

        <!-- 中间：操作按钮 + 物品弹框 -->
        <div class="action-center" ref="actionCenterRef">
          <button
            class="action-btn"
            :class="{ active: currentActionMode === '攻击' && selectingTarget.value }"
            type="button"
            :disabled="!canAct"
            @click="onAction('攻击')"
          >攻击</button>
          <button
            class="action-btn"
            :class="{ active: currentActionMode === '技能' && selectingTarget.value }"
            type="button"
            :disabled="!canAct"
            ref="skillBtnRef"
            @click="onAction('技能')"
          >技能</button>
          <button
            class="action-btn"
            :class="{ active: showSummonPopup || currentActionMode === '招将' }"
            type="button"
            :disabled="!canSummonNow"
            ref="summonBtnRef"
            @click="onAction('招将')"
          >招将</button>
          <button
            class="action-btn item-btn"
            :class="{ active: showItemPopup || (currentActionMode === '物品' && selectingTarget.value) }"
            type="button"
            :disabled="!canAct"
            ref="itemBtnRef"
            @click="onAction('物品')"
          >物品</button>
          <button
            class="action-btn"
            :class="{ active: currentActionMode === '防御' }"
            type="button"
            :disabled="!canAct"
            @click="onAction('防御')"
          >防御</button>

          <!-- 物品选择弹框（二级联动） -->
          <div v-if="showItemPopup" class="item-popup" :style="popupPosition">
            <div
              v-for="item in 可用物品列表"
              :key="item.名称"
              class="item-option"
              @click="onSelectItem(item)"
            >{{ item.名称 }}</div>
          </div>
          <div v-if="showSummonPopup" class="item-popup summon-popup" :style="popupPosition">
            <div
              v-for="d in 可招将候选"
              :key="d.人物 + '-' + d.slot"
              class="item-option"
              @click="onSelectSummon(d)"
            >{{ d.显示名 || d.人物 }}</div>
            <div
              v-for="i in Math.max(0, 7 - 可招将候选.length)"
              :key="'summon-empty-' + i"
              class="item-option item-option-empty"
            > </div>
          </div>
          <div v-if="showSkillPopup" class="item-popup" :style="popupPosition">
            <div
              v-for="s in 当前单位可用技能"
              :key="s.名称 + '-' + s.等级"
              class="item-option"
              @click="onSelectSkill(s)"
            >{{ s.显示名称 || s.名称 }}</div>
            <div v-if="!当前单位可用技能.length" class="item-option muted">无可用技能</div>
          </div>
        </div>

        <!-- 右侧：自己队伍 -->
        <div class="team-side self-team">
          <div
            v-for="(unit, idx) in selfTeam"
            :key="'self-' + idx"
            class="unit-card"
            :class="[unitCardClass(unit, idx), unitActiveClass(unit)]"
            @click="onUnitClick(unit, 'self')"
          >
            <template v-if="unit.type === 'mount'">
              <div class="mount-box">{{ unit.坐骑名 }}</div>
            </template>
            <template v-else-if="unit.type === 'unit' && !isDeadDeputyHidden(unit)">
              <div class="status-box" :style="unitBorderStyle(unit)">
                <div v-if="idx !== 1" class="unit-name">{{ unit.名称 }}</div>
                <div class="bar-wrap" :class="{ 'bar-masked': isUnitInfoHidden(unit) }">
                  <div class="bar hp-bar" :style="{ width: unitHpBarWidthPct(unit) + '%' }"></div>
                  <span class="bar-text">{{ unitHpMpText(unit, 'hp') }}</span>
                </div>
                <div class="bar-wrap" :class="{ 'bar-masked': isUnitInfoHidden(unit) }">
                  <div class="bar mp-bar" :style="{ width: unitHpBarWidthPct(unit, 'mp') + '%' }"></div>
                  <span class="bar-text">{{ unitHpMpText(unit, 'mp') }}</span>
                </div>
                <div class="meta-line" :class="{ 'meta-masked': isUnitInfoHidden(unit) }">
                  <span class="job-tag">{{ isUnitInfoHidden(unit) ? '·' : unit.职业 }}</span>
                  <span class="speed-rank">{{ isUnitInfoHidden(unit) ? '·' : `速${unit.速度排名}` }}</span>
                </div>
                <div class="buff-line">{{ displayUnitBuff(unit) }}</div>
              </div>
            </template>
            <div v-else class="empty-box"></div>
          </div>
        </div>
      </div>

      <!-- 第三栏：聊天框 -->
      <div class="battle-footer">
        <div class="battle-toolbar">
          <button
            class="toolbar-btn"
            type="button"
            :class="{ 'auto-toggle-on': autoAttackEnabled }"
            :disabled="!战局中"
            @click="toggleAutoAttack"
          >自动攻击</button>
          <button class="toolbar-btn danger" type="button" :disabled="fleeing" @click="onFlee">
            {{ fleeing ? '逃跑中…' : '逃跑' }}
          </button>
          <button class="toolbar-btn" type="button" :disabled="!战局中" @click="toggleBattleSpeed">
            速度×{{ battleSpeed }}
          </button>
        </div>
        <div class="chat-panel">
          <div class="chat-panel-head">
            <div class="chat-tabs">
              <button
                class="chat-tab"
                :class="{ active: chatTab === 'chat' }"
                type="button"
                @click="chatTab = 'chat'"
              >聊天</button>
              <button
                class="chat-tab"
                :class="{ active: chatTab === 'system' }"
                type="button"
                @click="chatTab = 'system'"
              >系统</button>
            </div>
            <button
              v-if="chatTab === 'system'"
              class="copy-debug-btn"
              type="button"
              @click="copyDebugInfo"
            >复制调试信息</button>
          </div>
          <div class="chat-box">
            <div v-if="chatTab === 'system'" class="tab-pane system-pane">
              <div v-for="(msg, i) in roundSystemLog" :key="'sys-' + i" class="chat-line">
                {{ msg }}
              </div>
              <div v-if="!roundSystemLog.length" class="sys-empty muted">暂无系统消息</div>
            </div>
            <div v-else class="tab-pane chat-pane">
              <div v-for="(msg, i) in chatMessages" :key="'chat-' + i" class="chat-line">
                <span :class="{ 'chat-self': msg.from === 当前用户名, 'chat-other': msg.from !== 当前用户名 }">{{ msg.from }}</span>: {{ msg.text }}
              </div>
              <div v-if="!chatMessages.length" class="sys-empty muted">暂无消息</div>
            </div>
          </div>
          <div v-if="chatTab === 'chat'" class="chat-input-bar">
            <input
              v-model="chatInput"
              class="chat-input"
              type="text"
              placeholder="输入消息…"
              maxlength="1024"
              @keydown.enter="sendChatMessage"
            />
            <button class="chat-send-btn" type="button" @click="sendChatMessage">发送</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showBattleEndPopup" class="popup-overlay">
      <div class="popup-card battle-end-popup">
        <h3 class="popup-title">战局已结束</h3>
        <p class="battle-end-text">{{ battleEndMessage }}</p>
        <button class="popup-confirm-btn" type="button" @click="onBattleEndConfirm">
          确定
        </button>
      </div>
    </div>

    <div v-if="!战局中 && !showBattleEndPopup" class="no-battle">
      <div class="no-battle-content">
        <p>{{ 战局状态文案 }}</p>
        <router-link to="/hall" class="btn secondary">去大厅发起挑战</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick } from 'vue'
import { useSocketClient } from '@/shared/socket/socketClient.js'
import { http } from '@/shared/api/http.js'
import { 当前角色分类, 主将战斗职业轴, format副将显示名 } from '@/shared/config/defaults.js'

const { currentOpponent, setCurrentOpponent, connectionStatus,
  onRoundStarted, offRoundStarted,
  onRoundResult, offRoundResult,
  onActionsSubmitted, offActionsSubmitted,
  onBattleError, offBattleError,
  emitBattleRoundStart, emitBattleActionsSubmit,
  emitBattleChat, onBattleChat, offBattleChat,
} = useSocketClient()

const 当前用户名 = computed(() => localStorage.getItem('huansan_用户名') || '')
const 对手用户名 = ref('')
const 战局状态 = ref('')
const round = ref(0)
const selfTeam = ref([])
const opponentTeam = ref([])
const fleeing = ref(false)

const 出招阶段 = ref(false)
const currentUnitKey = ref('')
const pendingAction = ref(null)
const selectedItem = ref(null)
const selectedSkill = ref(null)
const selectingTarget = ref(false)
const targetSide = ref('')
const showItemPopup = ref(false)
const showSummonPopup = ref(false)
const showSkillPopup = ref(false)
const showBattleEndPopup = ref(false)
const battleEndMessage = ref('')
const battleEndIWon = ref(false)
const pendingBattleEndPopup = ref(false)
const dismissedBattleId = ref('')
const currentActionMode = ref('')
const bannerText = ref('')
const bannerTone = ref('')
const roundSystemLog = ref([])
const chatMessages = ref([])
const chatInput = ref('')
const chatTab = ref('system')
const lastBattleSnapshot = ref(null)
const lastRoundResult = ref(null)
/** 避免 `round-result` 与 `actions-submitted` 携带相同 payload 时重复结算 UI */
const lastAppliedRoundResultNum = ref(-1)

const autoMode = ref(false)
/** 开关：战局中持续有效；开启后每回合出招阶段自动全员攻对方最快单位 */
const autoAttackEnabled = ref(false)
const actionsMap = ref({})
/** 已提交本方出招，等待对方提交（仅影响横幅与倒计时展示） */
const waitingOpponentAfterSubmit = ref(false)
const 已阵亡副将名 = ref(new Set())
const animActorKey = ref('')
const animTargetKey = ref('')
const animExtraTargetKeys = ref(new Set())
const animMountHealKey = ref('')
const battleSpeed = ref(1)
const 重连后跳过动画 = ref(false)
const animating = ref(false)

/** 与后端 battleEngine.getRoundTimeoutMs 对齐；round-started 会覆盖 */
const roundTimeoutMs = ref(9999 * 1000)
let roundStartTime = 0
let countdownTimer = null
const 剩余秒数 = ref(9999)

const 可用物品列表 = [
  { 名称: '九转丹', 效果: '恢复100%气血（主将可复活；副将阵亡不可用）' },
  { 名称: '龙涎露', 效果: '恢复100%精力（主将阵亡仍可用；副将阵亡不可用）' },
]
const 技能指向映射 = {
  固若金汤: 'self',
  凌波微步: 'self',
  金蝉脱壳: 'self',
  暗渡陈仓: 'self',
}

const 战局中 = computed(() => 战局状态.value === '战局中')
const battleAnimStyle = computed(() => {
  const actor = battleSpeed.value === 1 ? 600 : battleSpeed.value === 2 ? 350 : 200
  const target = battleSpeed.value === 1 ? 450 : battleSpeed.value === 2 ? 250 : 150
  return {
    '--anim-melee-actor-ms': `${actor}ms`,
    '--anim-melee-target-ms': `${target}ms`,
  }
})
const 系统提示词 = computed(() => (战局中.value ? `第${round.value || 1}回合` : 'hello'))
const canAct = computed(() => 出招阶段.value && currentUnitKey.value && currentUnitKey.value.startsWith('self:'))
const canSummonNow = computed(() => canAct.value && currentUnitKey.value === 'self:主将')
const 可招将候选 = computed(() => {
  const list = Array.isArray(lastBattleSnapshot.value?.我方?.配置?.副将列表)
    ? lastBattleSnapshot.value.我方.配置.副将列表
    : []
  const 在场副将名 = new Set(
    selfTeam.value
      .filter((u) => u.type === 'unit' && u.key && u.key !== 'self:主将')
      .map((u) => deputyBaseName(u.名称))
      .filter(Boolean),
  )
  const candidates = []
  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    const 名 = String(d?.人物 || '').trim()
    if (!d?.已配置 || !名) continue
    if (在场副将名.has(名)) continue
    if (已阵亡副将名.value.has(名)) continue
    candidates.push({ slot: i, 人物: 名, 显示名: format副将显示名(d?.人物, d?.真), 副将: d })
  }
  return candidates
})
const 当前单位可用技能 = computed(() => {
  const cfg = getSelfUnitConfigByKey(currentUnitKey.value)
  const raw = Array.isArray(cfg?.技能) ? cfg.技能 : []
  const 神将技 = cfg?.神将技 || ''
  return raw
    .filter(Boolean)
    .map((s) => {
      if (typeof s === 'string') return { 名称: s, 显示名称: s, 等级: '' }
      const n = String(s?.名称 || '').trim()
      return { 名称: n, 显示名称: n === 神将技 ? n + '(神)' : n, 等级: String(s?.等级 || '') }
    })
    .filter((s) => s.名称 || s.显示名称)
})
const 当前单位显示名 = computed(() => {
  if (!currentUnitKey.value) return ''
  const unit = selfTeam.value.find(u => u.key === currentUnitKey.value)
  const 单位类型 = currentUnitKey.value.replace('self:', '')
  if (单位类型 === '主将') return `${当前用户名.value}-主将`
  if (!unit) return `${当前用户名.value}-${单位类型}`
  return `${当前用户名.value}-${unit.名称}`
})
const 战局状态文案 = computed(() => {
  if (战局状态.value === '失去连接') return '战局已结束（失去连接）'
  if (战局状态.value === '已结束') return '战局已结束'
  return '未在战局中'
})

function barPct(cur, max) {
  const m = Number(max) || 0
  if (m <= 0) return 0
  const c = Math.max(0, Number(cur) || 0)
  return Math.min(100, (c / m) * 100)
}

/** 去掉无双/真前缀，与配置「人物」字段比对 */
function deputyBaseName(显示) {
  let s = String(显示 || '').trim()
  if (!s) return ''
  s = s.replace(/^无双-/, '')
  s = s.replace(/^\(真\)/, '')
  return s
}

function unitHpBarWidthPct(unit, kind = 'hp') {
  if (isUnitInfoHidden(unit)) return 0
  return kind === 'mp' ? barPct(unit.curMp, unit.maxMp) : barPct(unit.curHp, unit.maxHp)
}

function unitHpMpText(unit, kind) {
  if (isUnitInfoHidden(unit)) return '· · ·'
  return kind === 'mp' ? `${unit.curMp} / ${unit.maxMp}` : `${unit.curHp} / ${unit.maxHp}`
}

/** 服务端战局单位 key：发起方 = self、目标方 = enemy；与界面「当前用户 = self」不一致时互换 */
function swapBattleSideKey(key) {
  if (!key) return key
  if (key.startsWith('self:')) return key.replace(/^self:/, 'enemy:')
  if (key.startsWith('enemy:')) return key.replace(/^enemy:/, 'self:')
  return key
}

function viewerIsBattleStarter(extra) {
  const starter = extra?.发起用户名 || lastBattleSnapshot.value?.战局?.发起用户名
  return !!(starter && starter === 当前用户名.value)
}

/** 将服务端 canonical key 转为当前客户端队伍上的 key（selfTeam / opponentTeam） */
function serverUnitKeyToViewerKey(serverKey, extra) {
  if (!serverKey) return serverKey
  return viewerIsBattleStarter(extra) ? serverKey : swapBattleSideKey(serverKey)
}

/** 当前客户端 self 侧 key → 服务端 canonical key（读 data.units 用） */
function viewerSelfKeyToServerKey(viewerKey, extra) {
  if (!viewerKey) return viewerKey
  return viewerIsBattleStarter(extra) ? viewerKey : swapBattleSideKey(viewerKey)
}

function 轴简称(配置单位) {
  const raw = 当前角色分类(配置单位)
  return 主将战斗职业轴(raw)
}

function unitCardClass(unit, idx) {
  if (unit?.type === 'mount') return 'mount-card'
  if (idx === 1) return 'main-card'
  return ''
}

function unitActiveClass(unit) {
  if (!unit?.key) return ''
  if (unit.key === animActorKey.value) return 'anim-actor'
  if (unit.key === animMountHealKey.value) return 'anim-mount-heal'
  if (unit.key === animTargetKey.value || animExtraTargetKeys.value.has(unit.key)) return 'anim-target'
  if (!currentUnitKey.value) return ''
  if (unit.key === currentUnitKey.value) return 'active-unit'
  if (selectingTarget.value && isSelectableTarget(unit)) return 'selectable-target'
  return ''
}

function isDeadDeputyHidden(unit) {
  if (!unit || unit.type !== 'unit') return false
  const k = String(unit.key || '')
  if (!k.includes('副将')) return false
  return Number(unit.curHp) <= 0
}

function isSelectableTarget(unit) {
  if (!unit?.key || unit.type !== 'unit') return false
  const isMain = String(unit.key || '').endsWith(':主将')
  if (!isMain && unit.curHp <= 0) return false
  if (targetSide.value === 'enemy' && unit.key.startsWith('enemy:')) return true
  if (targetSide.value === 'self' && unit.key.startsWith('self:')) return true
  return false
}

function unitBorderStyle(unit) {
  if (unit?.key === currentUnitKey.value) {
    return { '--unit-border-color': '#22c55e' }
  }
  return {}
}

function mkUnit(attr, 配置单位, 速度排名, 名称, key) {
  if (!attr || !配置单位) return { type: 'empty' }
  const hp = Math.max(0, Math.round(attr.气血 || 0))
  const mp = Math.max(0, Math.round(attr.精力 || 0))
  return {
    type: 'unit',
    key,
    名称: 名称 || '?',
    maxHp: hp,
    curHp: hp,
    maxMp: mp,
    curMp: mp,
    职业: 轴简称(配置单位) || '?',
    速度排名,
    buff: '',
    buffTags: [],
  }
}

function parseBuffTags(raw) {
  if (!raw || typeof raw !== 'object') return []
  return Object.keys(raw).filter(Boolean)
}

function withUnitByKey(key, fn) {
  if (!key || typeof fn !== 'function') return
  const su = selfTeam.value.find((u) => u.key === key)
  if (su && su.type === 'unit') fn(su)
  const ou = opponentTeam.value.find((u) => u.key === key)
  if (ou && ou.type === 'unit') fn(ou)
}

function dedupeBuffTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : []).filter(Boolean))]
}

function addBuffTagByKey(key, tag) {
  if (!key || !tag) return
  withUnitByKey(key, (u) => {
    const tags = dedupeBuffTags([...(Array.isArray(u.buffTags) ? u.buffTags : []), tag])
    u.buffTags = Number(u.curHp) <= 0 ? [] : tags
    u.buff = u.buffTags.join(' ')
  })
}

function removeBuffTagByKey(key, tagsToRemove) {
  const rm = new Set((Array.isArray(tagsToRemove) ? tagsToRemove : [tagsToRemove]).filter(Boolean))
  if (!key || !rm.size) return
  withUnitByKey(key, (u) => {
    const tags = (Array.isArray(u.buffTags) ? u.buffTags : []).filter((t) => !rm.has(t))
    u.buffTags = Number(u.curHp) <= 0 ? [] : tags
    u.buff = u.buffTags.join(' ')
  })
}

function applyDamageByKey(key, hpDmg = 0, mpDmg = 0) {
  withUnitByKey(key, (u) => {
    const h = Math.max(0, Math.round(Number(hpDmg) || 0))
    const m = Math.max(0, Math.round(Number(mpDmg) || 0))
    if (h > 0) {
      u.curHp = Math.max(0, Math.round(Number(u.curHp || 0) - h))
      if (u.curHp <= 0) {
        u.buffTags = []
        u.buff = ''
      }
    }
    if (m > 0) {
      u.curMp = Math.max(0, Math.round(Number(u.curMp || 0) - m))
    }
  })
}

function applyHealByKey(key, hpHeal = 0, mpHeal = 0) {
  withUnitByKey(key, (u) => {
    const h = Math.max(0, Math.round(Number(hpHeal) || 0))
    const m = Math.max(0, Math.round(Number(mpHeal) || 0))
    if (h > 0) u.curHp = Math.min(Number(u.maxHp || 99999), Math.round(Number(u.curHp || 0) + h))
    if (m > 0) u.curMp = Math.min(Number(u.maxMp || 99999), Math.round(Number(u.curMp || 0) + m))
  })
}

function applySummonByStep(step, extra) {
  const tk = serverUnitKeyToViewerKey(step?.targetKey, extra) || ''
  if (!tk) return
  withUnitByKey(tk, (u) => {
    u.原始名称 = String(step?.deputyName || step?.显示名 || u.原始名称 || u.名称 || '').trim() || u.原始名称
    u.名称 = u.原始名称 || u.名称
    u.显示名 = u.名称
    if (Number.isFinite(Number(step?.气血))) u.curHp = Math.max(1, Math.round(Number(step.气血)))
    if (Number.isFinite(Number(step?.最大气血))) u.maxHp = Math.max(1, Math.round(Number(step.最大气血)))
    if (Number.isFinite(Number(step?.精力))) u.curMp = Math.max(0, Math.round(Number(step.精力)))
    if (Number.isFinite(Number(step?.最大精力))) u.maxMp = Math.max(0, Math.round(Number(step.最大精力)))
    u.buffTags = []
    u.buff = ''
  })
}

function displayUnitBuff(unit) {
  if (!unit || unit.type !== 'unit') return ''
  if (Number(unit.curHp) <= 0) return ''
  const tags = Array.isArray(unit.buffTags) ? unit.buffTags : []
  if (tags.includes('隐') && String(unit.key || '').startsWith('enemy:')) return '隐'
  return tags.join(' ')
}

function isUnitInfoHidden(unit) {
  if (!unit || unit.type !== 'unit') return false
  if (Number(unit.curHp) <= 0) return false
  if (!String(unit.key || '').startsWith('enemy:')) return false
  const tags = Array.isArray(unit.buffTags) ? unit.buffTags : []
  return tags.includes('隐')
}

function applyUnitStateRow(us, extra, opts) {
  const updateRank = opts?.updateRank !== false
  const vk = serverUnitKeyToViewerKey(us.key, extra)
  const applyOne = (u) => {
    if (!u) return
    const baseName = String(us.显示名 ?? u.名称 ?? '').trim()
    const 无双 = Math.max(0, Math.round(Number(us.无双剩余回合) || 0))
    u.原始名称 = baseName
    u.名称 = (无双 > 0 && vk && vk.includes('副将')) ? `无双-${baseName}` : baseName
    u.显示名 = u.名称
    u.无双剩余回合 = 无双
    u.curHp = Math.max(0, Math.round(us.气血 ?? u.curHp))
    u.curMp = Math.max(0, Math.round(us.精力 ?? u.curMp))
    if (updateRank && Number.isFinite(Number(us.排名))) {
      u.速度排名 = Math.max(1, Math.round(Number(us.排名)))
    }
    const tags = Number(u.curHp) <= 0 ? [] : parseBuffTags(us.buff)
    u.buffTags = tags
    u.buff = tags.join(' ')
  }
  const selfUnit = selfTeam.value.find(u => u.key === vk)
  const oppUnit = opponentTeam.value.find(u => u.key === vk)
  applyOne(selfUnit)
  applyOne(oppUnit)
  if (vk.startsWith('self:副将') && Number(us.气血) <= 0) {
    const dead = selfTeam.value.find((u) => u.key === vk)
    const name = String(dead?.名称 || '').trim()
    const base = deputyBaseName(name)
    if (base) 已阵亡副将名.value.add(base)
  }
}

function getSelfUnitConfigByKey(key) {
  const cfg = lastBattleSnapshot.value?.我方?.配置
  if (!cfg || !key || !key.startsWith('self:')) return null
  const type = key.replace('self:', '')
  if (type === '主将') return cfg.主将 || null
  const order = Array.isArray(cfg.副将上阵顺序) ? cfg.副将上阵顺序 : []
  const list = Array.isArray(cfg.副将列表) ? cfg.副将列表 : []
  if (type === '副将1') return list[order[0]] || null
  if (type === '副将2') return list[order[1]] || null
  if (type === '副将3') return list[order[2]] || null
  return null
}

function buildSpeedRankMap(selfData, enemyData) {
  const rows = []
  const pushRow = (tag, key, attr) => {
    if (!attr) return
    rows.push({ id: `${tag}:${key}`, 速度: Number(attr.速度) || 0 })
  }
  pushRow('self', '主将', selfData?.属性?.主将)
  pushRow('self', '副将1', selfData?.属性?.副将1)
  pushRow('self', '副将2', selfData?.属性?.副将2)
  pushRow('self', '副将3', selfData?.属性?.副将3)
  pushRow('enemy', '主将', enemyData?.属性?.主将)
  pushRow('enemy', '副将1', enemyData?.属性?.副将1)
  pushRow('enemy', '副将2', enemyData?.属性?.副将2)
  pushRow('enemy', '副将3', enemyData?.属性?.副将3)
  rows.sort((a, b) => b.速度 - a.速度)
  const map = new Map()
  rows.forEach((r, idx) => map.set(r.id, idx + 1))
  return map
}

function toTeam(side, tag, rankMap) {
  const cfg = side?.配置
  const attr = side?.属性
  if (!cfg || !attr) return [{ type: 'mount', 坐骑名: '无坐骑' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }]
  const 出战顺序 = Array.isArray(cfg?.副将上阵顺序) ? cfg.副将上阵顺序 : []
  const 副将列表 = cfg?.副将列表 && typeof cfg.副将列表 === 'object' ? cfg.副将列表 : {}
  const 副将配置1 = 副将列表[出战顺序[0]]
  const 副将配置2 = 副将列表[出战顺序[1]]
  const 副将配置3 = 副将列表[出战顺序[2]]
  return [
    { type: 'mount', 坐骑名: cfg?.主将?.坐骑?.种类 || '无坐骑' },
    mkUnit(attr.主将, cfg.主将, rankMap.get(`${tag}:主将`) || 0, tag === 'self' ? (当前用户名.value || '我方主将') : (side?.用户名 || '敌方主将'), `${tag}:主将`),
    mkUnit(attr.副将1, 副将配置1, rankMap.get(`${tag}:副将1`) || 0, format副将显示名(副将配置1?.人物, 副将配置1?.真) || '副将1', `${tag}:副将1`),
    mkUnit(attr.副将2, 副将配置2, rankMap.get(`${tag}:副将2`) || 0, format副将显示名(副将配置2?.人物, 副将配置2?.真) || '副将2', `${tag}:副将2`),
    mkUnit(attr.副将3, 副将配置3, rankMap.get(`${tag}:副将3`) || 0, format副将显示名(副将配置3?.人物, 副将配置3?.真) || '副将3', `${tag}:副将3`),
  ]
}

function clearBattle() {
  stopCountdown()
  战局状态.value = ''
  round.value = 0
  selfTeam.value = []
  opponentTeam.value = []
  对手用户名.value = ''
  setCurrentOpponent('')
  出招阶段.value = false
  currentUnitKey.value = ''
  pendingAction.value = null
  selectedItem.value = null
  selectedSkill.value = null
  selectingTarget.value = false
  targetSide.value = ''
  showItemPopup.value = false
  showSummonPopup.value = false
  showSkillPopup.value = false
  currentActionMode.value = ''
  bannerText.value = ''
  chatMessages.value = []
  autoMode.value = false
  autoAttackEnabled.value = false
  actionsMap.value = {}
  waitingOpponentAfterSubmit.value = false
  已阵亡副将名.value = new Set()
  animActorKey.value = ''
  animTargetKey.value = ''
  animExtraTargetKeys.value = new Set()
  animMountHealKey.value = ''
  battleSpeed.value = 1
  重连后跳过动画.value = false
  roundSystemLog.value = []
  lastBattleSnapshot.value = null
  lastRoundResult.value = null
  lastAppliedRoundResultNum.value = -1
}

function setBanner(text, tone = '') {
  bannerText.value = text
  bannerTone.value = tone
}

function appendSystemLine(line) {
  if (line == null || line === '') return
  roundSystemLog.value = [...roundSystemLog.value, String(line)]
  const max = 200
  if (roundSystemLog.value.length > max) {
    roundSystemLog.value = roundSystemLog.value.slice(-max)
  }
}

function sendChatMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  emitBattleChat(text)
  chatInput.value = ''
}

function handleBattleChat(payload) {
  if (!payload?.from || !payload?.text) return
  chatMessages.value = [...chatMessages.value, { from: payload.from, text: payload.text, time: payload.time || Date.now() }]
  const max = 200
  if (chatMessages.value.length > max) {
    chatMessages.value = chatMessages.value.slice(-max)
  }
}

function setRoundHeader(n) {
  roundSystemLog.value = [`—— 第 ${n} 回合 ——`]
}

/** 与后端 `battleRepo.getBattleRoundRowKeyForLog` 一致；旧接口无 `日志回合键` 时本地推算 */
function clientLogRoundKey(战局) {
  if (战局 == null) return null
  const k = Number(战局.日志回合键)
  if (Number.isFinite(k) && k > 0) return k
  const cr = Number(战局.当前回合 || 0)
  const tr = Number(战局.回合数 ?? 0)
  if (cr > tr) return Math.max(1, tr)
  return Math.max(1, cr || tr || 1)
}

function mergeServerRoundLog(回合信息, 战局) {
  if (!回合信息 || 回合信息.回合数 == null || !战局) return
  const expected = clientLogRoundKey(战局)
  if (expected == null || Number(回合信息.回合数) !== expected) return
  const logs = Array.isArray(回合信息.战斗日志) ? 回合信息.战斗日志.filter(Boolean) : []
  if (!logs.length) return
  roundSystemLog.value = [`—— 第 ${回合信息.回合数} 回合 ——`, ...logs]
}

function startCountdown(serverTimestamp) {
  stopCountdown()
  roundStartTime = serverTimestamp || Date.now()
  const totalSec = Math.max(1, Math.ceil(roundTimeoutMs.value / 1000))
  剩余秒数.value = totalSec
  updateBannerFromState()
  countdownTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - roundStartTime) / 1000)
    const total = Math.max(1, Math.ceil(roundTimeoutMs.value / 1000))
    剩余秒数.value = Math.max(0, total - elapsed)
    updateBannerFromState()
    if (剩余秒数.value <= 0) {
      stopCountdown()
      if (出招阶段.value && autoAttackEnabled.value && !waitingOpponentAfterSubmit.value) {
        runAutoAttackFillAndSubmit()
      }
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function updateBannerFromState() {
  if (waitingOpponentAfterSubmit.value && 战局中.value) {
    setBanner(`等待对方出招中...(${剩余秒数.value})`, 'info')
    return
  }
  if (!出招阶段.value) return
  const sec = 剩余秒数.value
  const name = 当前单位显示名.value || '?'
  if (selectingTarget.value) {
    if (currentActionMode.value === '攻击') {
      setBanner(`${name} 选择攻击目标中(${sec})`, 'warning')
    } else if (currentActionMode.value === '物品') {
      setBanner(`${name} 选择使用目标中(${sec})`, 'warning')
    } else {
      setBanner(`${name} 选择目标中(${sec})`, 'warning')
    }
  } else {
    setBanner(`${name} 出招中(${sec})`, 'info')
  }
}

function handleRoundStarted(data) {
  if (!data) return
  waitingOpponentAfterSubmit.value = false
  if (typeof data.超时毫秒 === 'number' && data.超时毫秒 > 0) {
    roundTimeoutMs.value = data.超时毫秒
  }
  round.value = data.回合数 || 1
  出招阶段.value = true
  autoMode.value = false
  actionsMap.value = {}
  showItemPopup.value = false
  showSummonPopup.value = false
  showSkillPopup.value = false
  currentActionMode.value = ''
  selectingTarget.value = false
  pendingAction.value = null
  selectedItem.value = null
  selectedSkill.value = null

  const selfUnitOrder = ['self:主将', 'self:副将1', 'self:副将2', 'self:副将3']
  const firstAliveKey = selfUnitOrder.find(key => {
    const serverKey = viewerSelfKeyToServerKey(key, data)
    const unit = (data.units || []).find(u => u.key === serverKey)
    return unit && (unit.气血 > 0 || key === 'self:主将')
  })
  if (firstAliveKey) {
    currentUnitKey.value = firstAliveKey
  } else {
    const fallback = selfTeam.value.find(
      (u) => u.type === 'unit' && (Number(u.curHp) > 0 || String(u.key || '').endsWith(':主将')),
    )
    currentUnitKey.value = fallback?.key || ''
  }

  startCountdown(data.服务器时间)
  if (autoAttackEnabled.value) {
    void nextTick(() => runAutoAttackFillAndSubmit())
  }
}

async function handleRoundResult(data) {
  if (!data) return
  const rn = Number(data.回合数)
  if (Number.isFinite(rn) && rn === lastAppliedRoundResultNum.value) return

  waitingOpponentAfterSubmit.value = false
  stopCountdown()

  lastRoundResult.value = data
  if (Number.isFinite(rn)) {
    lastAppliedRoundResultNum.value = rn
    round.value = rn
  }

  const logRn = Number.isFinite(rn) ? rn : (round.value || 1)
  if (Array.isArray(data.战斗日志)) {
    const lines = data.战斗日志.filter(Boolean)
    roundSystemLog.value = lines.length
      ? [`—— 第 ${logRn} 回合 ——`, ...lines]
      : [`—— 第 ${logRn} 回合 ——`, '（本轮无文字战报）']
  }
  if (!重连后跳过动画.value && Array.isArray(data.战斗过程) && data.战斗过程.length) {
    animating.value = true
    await 播放战斗过程动画(data.战斗过程)
    animating.value = false
    if (pendingBattleEndPopup.value) {
      pendingBattleEndPopup.value = false
      showBattleEndPopup.value = true
    }
  }

  if (data.单位状态 && Array.isArray(data.单位状态)) {
    for (const us of data.单位状态) {
      applyUnitStateRow(us, data)
    }
  }
  重连后跳过动画.value = false

  if (data.战局结束) {
    出招阶段.value = false
    currentUnitKey.value = ''
    selectingTarget.value = false
    showItemPopup.value = false
    showSkillPopup.value = false
    showSummonPopup.value = false
    currentActionMode.value = ''
    const iWon = data.胜利方用户名
      ? data.胜利方用户名 === 当前用户名.value
      : data.胜者 === '我方'
    battleEndIWon.value = iWon
    const winnerMsg = iWon ? '🎉 胜利！' : '💔 失败...'
    battleEndMessage.value = data.原因 || '一方全倒下'
    setBanner(winnerMsg, iWon ? 'success' : 'danger')
    appendSystemLine(`战局结束：${data.原因 || '（无原因）'}；胜者：${data.胜者 || '—'}`)
    战局状态.value = '已结束'
    autoAttackEnabled.value = false
    showBattleEndPopup.value = true
    return
  }

  出招阶段.value = false
  currentUnitKey.value = ''
  selectingTarget.value = false
  showItemPopup.value = false
  currentActionMode.value = ''
  pendingAction.value = null
  setBanner('双方出招完毕，等待下一回合...', 'info')
  void startNewRound()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function 播放战斗过程动画(steps) {
  const waitMs = battleSpeed.value === 1 ? 2000 : battleSpeed.value === 2 ? 1000 : 500
  const extra = lastRoundResult.value || lastBattleSnapshot.value
  let i = 0
  while (i < steps.length) {
    const s = steps[i]
    if (!s || !s.type) { i++; continue }

    if (s.type === 'melee') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animActorKey.value = actorKey
      animTargetKey.value = targetKey
      setBanner(s.attackKind || '攻击', 'warning')
      await sleep(waitMs)
      const dmg = Number.isFinite(Number(s.damage)) ? Math.max(1, Math.round(Number(s.damage))) : 0
      if (targetKey) applyDamageByKey(targetKey, dmg, 0)
      if (dmg > 0 && targetKey) removeBuffTagByKey(targetKey, '围')
      await sleep(waitMs)
      animActorKey.value = ''
      animTargetKey.value = ''
      i++
    } else if (s.type === 'shock') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animActorKey.value = actorKey
      animTargetKey.value = targetKey
      setBanner('反击攻击', 'warning')
      await sleep(waitMs)
      const shockDmg = Number.isFinite(Number(s.damage)) ? Math.max(1, Math.round(Number(s.damage))) : 0
      if (targetKey) applyDamageByKey(targetKey, shockDmg, 0)
      if (shockDmg > 0 && targetKey) removeBuffTagByKey(targetKey, '围')
      await sleep(waitMs)
      animActorKey.value = ''
      animTargetKey.value = ''
      i++
    } else if (s.type === 'counter') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animTargetKey.value = targetKey
      setBanner('反震', 'warning')
      await sleep(waitMs)
      const counterDmg = Number.isFinite(Number(s.damage)) ? Math.max(1, Math.round(Number(s.damage))) : 0
      if (targetKey) applyDamageByKey(targetKey, counterDmg, 0)
      if (counterDmg > 0 && targetKey) removeBuffTagByKey(targetKey, '围')
      await sleep(waitMs)
      animTargetKey.value = ''
      i++
    } else if (s.type === 'miss') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animActorKey.value = actorKey
      animTargetKey.value = targetKey
      setBanner('攻击未命中', 'info')
      await sleep(waitMs)
      animActorKey.value = ''
      animTargetKey.value = ''
      i++
    } else if (s.type === 'skill-cast' || s.type === 'skill-hit') {
      const batch = collectSkillBatch(steps, i)
      await playMultiTargetSkill(batch, waitMs)
      i += batch.steps.length
    } else if (s.type === 'skill-control') {
      const batch = collectSkillBatch(steps, i)
      if (batch.steps.length > 1) {
        await playMultiTargetSkill(batch, waitMs)
        i += batch.steps.length
      } else {
        const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
        const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
        const skillName = s.skillName || '技能'
        animActorKey.value = actorKey
        animTargetKey.value = targetKey
        setBanner(skillName, s.success ? 'ok' : 'error')
        await sleep(waitMs)
        if (s.success && s.buffName && targetKey) addBuffTagByKey(targetKey, s.buffName)
        if (s.skillName === '金蝉脱壳' && s.success && targetKey) removeBuffTagByKey(targetKey, ['围', '乱', '封'])
        if (s.healAmount > 0 && targetKey) applyHealByKey(targetKey, s.healAmount, 0)
        await sleep(waitMs)
        animActorKey.value = ''
        animTargetKey.value = ''
        i++
      }
    } else if (s.type === 'buff-tick') {
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animTargetKey.value = targetKey
      setBanner('毒发', 'error')
      await sleep(waitMs)
      const poisonDmg = Number.isFinite(Number(s.damage)) ? Math.max(1, Math.round(Number(s.damage))) : 0
      if (targetKey) applyDamageByKey(targetKey, poisonDmg, 0)
      await sleep(waitMs)
      animTargetKey.value = ''
      i++
    } else if (s.type === 'buff-detonate' || s.type === 'buff-detonate-splash') {
      const detonateSteps = [s]
      let j = i + 1
      while (j < steps.length && steps[j]?.type === 'buff-detonate-splash') {
        detonateSteps.push(steps[j])
        j++
      }
      const allTargetKeys = new Set()
      for (const ds of detonateSteps) {
        const tk = serverUnitKeyToViewerKey(ds.targetKey, extra)
        if (tk) allTargetKeys.add(tk)
      }
      animActorKey.value = ''
      animTargetKey.value = ''
      const iter = allTargetKeys.values()
      const firstTk = iter.next().value
      animTargetKey.value = firstTk || ''
      for (const tk of allTargetKeys) {
        if (tk !== firstTk) animExtraTargetKeys.value.add(tk)
      }
      setBanner('爆炸', 'danger')
      await sleep(waitMs)
      for (const ds of detonateSteps) {
        const tk = serverUnitKeyToViewerKey(ds.targetKey, extra)
        const dmg = Number.isFinite(Number(ds.damage)) ? Math.max(1, Math.round(Number(ds.damage))) : 0
        if (tk) applyDamageByKey(tk, dmg, 0)
      }
      await sleep(waitMs)
      animTargetKey.value = ''
      animExtraTargetKeys.value = new Set()
      i = j
    } else if (s.type === 'mount-heal') {
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animMountHealKey.value = targetKey
      setBanner('木牛流马', 'ok')
      if (s.healType === 'hp' && targetKey) applyHealByKey(targetKey, s.amount, 0)
      else if (s.healType === 'mp' && targetKey) applyHealByKey(targetKey, 0, s.amount)
      animMountHealKey.value = ''
      i++
    } else if (s.type === 'musou-activate-batch') {
      const items = Array.isArray(s.items) ? s.items : []
      animExtraTargetKeys.value = new Set()
      for (let k = 0; k < items.length; k++) {
        const it = items[k]
        const targetKey = serverUnitKeyToViewerKey(it.targetKey, extra) || ''
        const targetUnit = selfTeam.value.find(u => u.key === targetKey) || opponentTeam.value.find(u => u.key === targetKey)
        if (targetUnit && targetUnit.type === 'unit') {
          const baseName = targetUnit.原始名称 || targetUnit.名称 || ''
          targetUnit.名称 = `无双-${baseName}`
          targetUnit.显示名 = targetUnit.名称
          targetUnit.无双剩余回合 = 3
          if (it.newMaxHp) targetUnit.maxHp = Math.max(1, Math.round(Number(it.newMaxHp) || targetUnit.maxHp))
          if (it.newMaxMp) targetUnit.maxMp = Math.max(1, Math.round(Number(it.newMaxMp) || targetUnit.maxMp))
          if (it.newCurHp != null) targetUnit.curHp = Math.max(0, Math.round(Number(it.newCurHp)))
          if (it.newCurMp != null) targetUnit.curMp = Math.max(0, Math.round(Number(it.newCurMp)))
        }
        if (k === 0) animTargetKey.value = targetKey
        else if (targetKey) animExtraTargetKeys.value.add(targetKey)
      }
      setBanner('无双开启', 'warning')
      await sleep(waitMs)
      await sleep(waitMs)
      animTargetKey.value = ''
      animExtraTargetKeys.value = new Set()
      i++
    } else if (s.type === 'musou-activate') {
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      const targetUnit = selfTeam.value.find(u => u.key === targetKey) || opponentTeam.value.find(u => u.key === targetKey)
      if (targetUnit && targetUnit.type === 'unit') {
        const baseName = targetUnit.原始名称 || targetUnit.名称 || ''
        targetUnit.名称 = `无双-${baseName}`
        targetUnit.显示名 = targetUnit.名称
        targetUnit.无双剩余回合 = 3
        if (s.newMaxHp) targetUnit.maxHp = Math.max(1, Math.round(Number(s.newMaxHp) || targetUnit.maxHp))
        if (s.newMaxMp) targetUnit.maxMp = Math.max(1, Math.round(Number(s.newMaxMp) || targetUnit.maxMp))
        if (s.newCurHp != null) targetUnit.curHp = Math.max(0, Math.round(Number(s.newCurHp)))
        if (s.newCurMp != null) targetUnit.curMp = Math.max(0, Math.round(Number(s.newCurMp)))
      }
      animTargetKey.value = targetKey
      setBanner('无双', 'warning')
      await sleep(waitMs)
      await sleep(waitMs)
      animTargetKey.value = ''
      i++
    } else if (s.type === 'musou-end') {
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      const targetUnit = selfTeam.value.find(u => u.key === targetKey) || opponentTeam.value.find(u => u.key === targetKey)
      if (targetUnit && targetUnit.type === 'unit') {
        const orig = targetUnit.原始名称
        targetUnit.名称 = orig ? String(orig) : String(targetUnit.名称 || '').replace(/^无双-/, '')
        targetUnit.显示名 = targetUnit.名称
        targetUnit.无双剩余回合 = 0
        if (s.newMaxHp) targetUnit.maxHp = Math.max(1, Math.round(Number(s.newMaxHp) || targetUnit.maxHp))
        if (s.newMaxMp) targetUnit.maxMp = Math.max(1, Math.round(Number(s.newMaxMp) || targetUnit.maxMp))
      }
      i++
    } else if (s.type === 'buff-block') {
      i++
    } else if (s.type === 'item') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animActorKey.value = actorKey
      animTargetKey.value = targetKey
      setBanner(`使用${s.itemName || '物品'}`, 'ok')
      if (targetKey) {
        if (s.recoverType === '气血') applyHealByKey(targetKey, s.recover, 0)
        else if (s.recoverType === '精力') applyHealByKey(targetKey, 0, s.recover)
      }
      await sleep(waitMs)
      await sleep(waitMs)
      animActorKey.value = ''
      animTargetKey.value = ''
      i++
    } else if (s.type === 'summon') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      const targetKey = serverUnitKeyToViewerKey(s.targetKey, extra) || ''
      animActorKey.value = actorKey
      animTargetKey.value = targetKey
      setBanner('招将', 'ok')
      applySummonByStep(s, extra)
      await sleep(waitMs)
      await sleep(waitMs)
      animActorKey.value = ''
      animTargetKey.value = ''
      i++
    } else if (s.type === 'summon-fail') {
      const actorKey = serverUnitKeyToViewerKey(s.actorKey, extra) || ''
      animActorKey.value = actorKey
      setBanner('招将失败', 'error')
      await sleep(waitMs)
      await sleep(waitMs)
      animActorKey.value = ''
      i++
    } else { i++ }
  }
}

function collectSkillBatch(steps, startIndex) {
  const first = steps[startIndex]
  if (!first || !first.actorKey) return { steps: [first], skillName: first.skillName || '', castStep: first }
  const actorKey = first.actorKey
  const skillName = first.skillName || ''
  const batch = [first]
  let j = startIndex + 1
  while (j < steps.length) {
    const cur = steps[j]
    if (!cur) break
    if ((cur.type === 'skill-hit' || cur.type === 'skill-control') && cur.actorKey === actorKey && cur.skillName === skillName) {
      batch.push(cur)
      j++
    } else { break }
  }
  return { steps: batch, skillName, castStep: first }
}

async function playMultiTargetSkill(batch, waitMs) {
  const extra = lastRoundResult.value || lastBattleSnapshot.value
  const castStep = batch.castStep
  const skillName = batch.skillName
  const actorKey = serverUnitKeyToViewerKey(castStep.actorKey, extra) || ''
  const targetKeys = new Set()
  const hitSteps = []
  for (const s of batch.steps) {
    if (s.type === 'skill-hit' || s.type === 'skill-control') {
      const tk = serverUnitKeyToViewerKey(s.targetKey, extra)
      if (tk) targetKeys.add(tk)
      hitSteps.push(s)
    }
  }

  animActorKey.value = actorKey
  animTargetKey.value = ''
  const iter = targetKeys.values()
  const firstTarget = iter.next().value
  animTargetKey.value = firstTarget || ''
  for (const tk of targetKeys) {
    if (tk !== firstTarget) animExtraTargetKeys.value.add(tk)
  }

  let bannerType = 'warning'
  const onlyStep = hitSteps[0]
  if (onlyStep?.type === 'skill-control' && !onlyStep.success) {
    bannerType = 'error'
  }
  const hasCrit = hitSteps.some((hs) => hs.crit)
  const bannerLabel = hasCrit ? `${skillName}(暴)` : skillName
  setBanner(bannerLabel, bannerType)

  await sleep(waitMs)
  const castCost = Math.max(0, Math.round(Number(castStep?.mpCost) || 0))
  if (castCost > 0 && actorKey) applyDamageByKey(actorKey, 0, castCost)

  for (const hs of hitSteps) {
    if (hs.type === 'skill-hit') {
      const tk = serverUnitKeyToViewerKey(hs.targetKey, extra)
      const dmg = Number.isFinite(Number(hs.damage)) ? Math.max(1, Math.round(Number(hs.damage))) : null
      if (dmg != null && tk) {
        applyDamageByKey(tk, dmg, hs.mpDamage)
        removeBuffTagByKey(tk, '围')
      }
    } else if (hs.type === 'skill-control') {
      const tk = serverUnitKeyToViewerKey(hs.targetKey, extra)
      if (hs.success && hs.buffName && tk) addBuffTagByKey(tk, hs.buffName)
      if (hs.skillName === '金蝉脱壳' && hs.success && tk) removeBuffTagByKey(tk, ['围', '乱', '封'])
      const healAmt = Math.max(0, Math.round(Number(hs.healAmount) || 0))
      if (healAmt > 0 && tk) {
        applyHealByKey(tk, healAmt, 0)
      }
    }
  }

  await sleep(waitMs)

  animActorKey.value = ''
  animTargetKey.value = ''
  animExtraTargetKeys.value = new Set()
}

function toggleBattleSpeed() {
  if (!战局中.value) return
  if (battleSpeed.value === 1) battleSpeed.value = 2
  else if (battleSpeed.value === 2) battleSpeed.value = 3
  else battleSpeed.value = 1
}

function handleError(data) {
  const msg = data?.错误 || '未知错误'
  waitingOpponentAfterSubmit.value = false
  stopCountdown()
  setBanner(msg, 'error')
  appendSystemLine(`[错误] ${msg}`)
}

function handleActionsSubmitted(data) {
  if (!data?.ok) return
  if (data.双方就绪) {
    waitingOpponentAfterSubmit.value = false
    if (Number.isFinite(Number(data.回合数))) {
      void handleRoundResult(data)
    }
    return
  }
  waitingOpponentAfterSubmit.value = true
  setBanner(`等待对方出招中...(${剩余秒数.value})`, 'info')
}

async function copyDebugInfo() {
  const unitSnap = (arr) =>
    (arr || []).map((u) => ({
      type: u.type,
      key: u.key,
      名称: u.名称,
      curHp: u.curHp,
      curMp: u.curMp,
      maxHp: u.maxHp,
      maxMp: u.maxMp,
    }))
  const payload = {
    生成时间: new Date().toISOString(),
    说明: '战局调试包：含最近一次 /api/battle/current 快照、最近一次回合结算事件、以及客户端关键状态。',
    战局与回合快照: lastBattleSnapshot.value,
    最近回合结算事件: lastRoundResult.value,
    客户端状态: {
      战局状态: 战局状态.value,
      回合数显示: round.value,
      出招阶段: 出招阶段.value,
      剩余秒数: 剩余秒数.value,
      回合超时毫秒: roundTimeoutMs.value,
      currentUnitKey: currentUnitKey.value,
      selectingTarget: selectingTarget.value,
      currentActionMode: currentActionMode.value,
      autoMode: autoMode.value,
      autoAttackEnabled: autoAttackEnabled.value,
      actionsMap: { ...actionsMap.value },
      selfTeam: unitSnap(selfTeam.value),
      opponentTeam: unitSnap(opponentTeam.value),
      系统战况文本: [...roundSystemLog.value],
    },
  }
  const text = JSON.stringify(payload, null, 2)
  try {
    await navigator.clipboard.writeText(text)
    appendSystemLine('[调试] 已复制调试信息到剪贴板')
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      appendSystemLine('[调试] 已复制调试信息（兼容模式）')
    } catch {
      appendSystemLine('[调试] 复制失败：请手动全选系统文本或检查浏览器权限')
    }
  }
}

function calculatePopupPosition(btnRef) {
  nextTick(() => {
    const btn = btnRef?.value
    const container = actionCenterRef.value
    if (!btn || !container) return

    const btnRect = btn.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const top = btnRect.top - containerRect.top
    const left = btnRect.right - containerRect.left

    popupPosition.value = {
      top: `${top}px`,
      left: `${left + 4}px`
    }
  })
}

function onAction(actionType) {
  if (!canAct.value) return

  showItemPopup.value = false
  showSummonPopup.value = false
  showSkillPopup.value = false
  currentActionMode.value = actionType
  selectingTarget.value = false
  pendingAction.value = null
  selectedItem.value = null
  selectedSkill.value = null

  if (actionType === '防御') {
    saveCurrentAction('防御', null)
    moveToNextUnit()
    return
  }

  if (actionType === '物品') {
    showItemPopup.value = true
    calculatePopupPosition(itemBtnRef)
    return
  }

  if (actionType === '招将') {
    if (!canSummonNow.value) {
      setBanner('仅主将可招将', 'warning')
      return
    }
    showSummonPopup.value = true
    calculatePopupPosition(summonBtnRef)
    return
  }

  if (actionType === '攻击') {
    pendingAction.value = '攻击'
    selectingTarget.value = true
    targetSide.value = 'enemy'
    updateBannerFromState()
    return
  }

  if (actionType === '技能') {
    showSkillPopup.value = true
    calculatePopupPosition(skillBtnRef)
  }
}

function onSelectSkill(skill) {
  if (!skill?.名称) return
  selectedSkill.value = skill
  showSkillPopup.value = false
  pendingAction.value = '技能'
  selectingTarget.value = true
  targetSide.value = 技能指向映射[skill.名称] || 'enemy'
  updateBannerFromState()
}

function onSelectItem(item) {
  if (!item) return
  selectedItem.value = item
  showItemPopup.value = false
  pendingAction.value = '物品'
  selectingTarget.value = true
  targetSide.value = 'self'
  updateBannerFromState()
}

function onSelectSummon(item) {
  if (!item || !canSummonNow.value) return
  showSummonPopup.value = false
  saveCurrentAction('招将', null, { 招将: item.人物, 招将槽位: item.slot })
  moveToNextUnit()
}

function onUnitClick(unit, side) {
  if (!selectingTarget.value) return
  if (!isSelectableTarget(unit)) return

  let finalAction = pendingAction.value
  let extraData = {}

  if (finalAction === '物品' && selectedItem.value) {
    extraData.物品 = selectedItem.value.名称
  }
  if (finalAction === '技能' && selectedSkill.value?.名称) {
    extraData.技能 = selectedSkill.value.名称
  }

  saveCurrentAction(finalAction, unit.key, extraData)
  exitSelectionMode()
  moveToNextUnit()
}

function onAreaClick() {
  if (showItemPopup.value || showSummonPopup.value || showSkillPopup.value) {
    showItemPopup.value = false
    showSummonPopup.value = false
    showSkillPopup.value = false
    currentActionMode.value = ''
    selectingTarget.value = false
    pendingAction.value = null
    selectedItem.value = null
    selectedSkill.value = null
    updateBannerFromState()
  }
}

function exitSelectionMode() {
  selectingTarget.value = false
  targetSide.value = ''
  pendingAction.value = null
  selectedItem.value = null
  selectedSkill.value = null
  showItemPopup.value = false
  showSummonPopup.value = false
  showSkillPopup.value = false
  currentActionMode.value = ''
  updateBannerFromState()
}

function saveCurrentAction(action, targetKey, extra = {}) {
  if (currentUnitKey.value) {
    actionsMap.value[currentUnitKey.value] = { 操作: action, 目标: targetKey, ...extra }
  }
}

function moveToNextUnit() {
  const allSelfUnits = selfTeam.value.filter(u => u.type === 'unit')
  const aliveUnits = allSelfUnits.filter(
    (u) => u.curHp > 0 || String(u.key || '').endsWith(':主将'),
  )

  const currentIndex = aliveUnits.findIndex(u => u.key === currentUnitKey.value)
  let nextIndex = currentIndex + 1

  for (let i = nextIndex; i < aliveUnits.length; i++) {
    const key = aliveUnits[i].key
    if (!actionsMap.value[key]) {
      currentUnitKey.value = key
      return
    }
  }

  for (let i = 0; i < currentIndex; i++) {
    const key = aliveUnits[i].key
    if (!actionsMap.value[key]) {
      currentUnitKey.value = key
      return
    }
  }

  submitAllActions()
}

async function submitAllActions() {
  currentUnitKey.value = ''
  exitSelectionMode()
  waitingOpponentAfterSubmit.value = true
  setBanner(`等待对方出招中...(${剩余秒数.value})`, 'info')

  const actionList = []
  const selfUnits = selfTeam.value.filter(u => u.type === 'unit')
  for (const u of selfUnits) {
    const saved = actionsMap.value[u.key]
    actionList.push({
      unitKey: u.key,
      操作: saved?.操作 || null,
      目标: saved?.目标 || null,
      物品: saved?.物品 || null,
      招将: saved?.招将 || null,
      招将槽位: saved?.招将槽位 ?? null,
      技能: saved?.技能 || null,
      已自动: !!autoMode.value && !saved?.操作,
    })
  }

  try {
    const ok = emitBattleActionsSubmit({
      回合数: round.value,
      出招列表: actionList,
      使用自动: autoMode.value,
    })
    if (!ok) {
      waitingOpponentAfterSubmit.value = false
      stopCountdown()
      setBanner('连接已断开，提交失败，请重试', 'error')
    }
  } catch (e) {
    waitingOpponentAfterSubmit.value = false
    stopCountdown()
    setBanner('提交失败，请重试', 'error')
    console.error(e)
  }
}

function runAutoAttackFillAndSubmit() {
  if (!出招阶段.value || waitingOpponentAfterSubmit.value) return
  autoMode.value = true
  exitSelectionMode()

  const selfUnits = selfTeam.value.filter(
    (u) => u.type === 'unit' && (u.curHp > 0 || String(u.key || '').endsWith(':主将')),
  )
  const enemyUnits = opponentTeam.value.filter(eu => eu.type === 'unit' && eu.curHp > 0)
  const fastestEnemy = [...enemyUnits].sort((a, b) => a.速度排名 - b.速度排名)[0] || null
  const nextMap = { ...actionsMap.value }
  for (const u of selfUnits) {
    nextMap[u.key] = { 操作: '攻击', 目标: fastestEnemy?.key || null }
  }
  actionsMap.value = nextMap

  void submitAllActions()
}

function toggleAutoAttack() {
  if (!战局中.value) return
  autoAttackEnabled.value = !autoAttackEnabled.value
  if (autoAttackEnabled.value && 出招阶段.value && !waitingOpponentAfterSubmit.value) {
    void nextTick(() => runAutoAttackFillAndSubmit())
  }
}

async function loadBattleSnapshot() {
  if (connectionStatus.value === 'offline') return
  try {
    const { data } = await http.get('/api/battle/current')
    if (!data?.战局) {
      clearBattle()
      return
    }
    if (String(data?.战局?.id || '') && String(data.战局.id) === String(dismissedBattleId.value || '')) {
      clearBattle()
      return
    }
    lastBattleSnapshot.value = data
    战局状态.value = data.战局.状态 || ''
    if (data.战局.状态 === '已结束') {
      autoAttackEnabled.value = false
      battleEndIWon.value = data.战局.备注?.includes('已逃跑') ? true : (data.胜者 === '我方')
      battleEndMessage.value = data.战局.备注 || '一方已逃跑'
      if (animating.value) {
        pendingBattleEndPopup.value = true
      } else {
        pendingBattleEndPopup.value = false
        nextTick(() => { showBattleEndPopup.value = true })
      }
    }
    const cr = Number(data.战局.当前回合 || 0)
    const tr = Number(data.战局.回合数 ?? 0)
    /** 与后端战局字段一致：当前回合 为「进行中的回合序号」，勿在「已进阶、日志仍在上一回合」时用 tr 覆盖 */
    round.value = cr || tr || 1
    对手用户名.value = data?.敌方?.用户名 || ''
    if (对手用户名.value) setCurrentOpponent(对手用户名.value)

    const isFirstLoad = selfTeam.value.length === 0 && opponentTeam.value.length === 0
    if (isFirstLoad) {
      const rankMap = buildSpeedRankMap(data.我方, data.敌方)
      selfTeam.value = toTeam(data.我方, 'self', rankMap)
      opponentTeam.value = toTeam(data.敌方, 'enemy', rankMap)
    }
    if (Array.isArray(data.单位状态) && !animating.value) {
      for (const us of data.单位状态) {
        applyUnitStateRow(us, data, { updateRank: false })
      }
    }

    mergeServerRoundLog(data.回合信息, data.战局)
    // 战局页偶发错过 `round-started`（如切页/重连）时，主动补发开回合请求恢复可操作状态
    if (战局状态.value === '战局中' && !出招阶段.value && !waitingOpponentAfterSubmit.value) {
      scheduleBootstrapRoundIfIdle()
    }
  } catch {
    clearBattle()
  }
}

async function startNewRound() {
  try {
    emitBattleRoundStart()
  } catch (e) {
    setBanner('开始回合失败', 'error')
    console.error(e)
  }
}

let bootstrapRoundTimer = null
function scheduleBootstrapRoundIfIdle() {
  clearTimeout(bootstrapRoundTimer)
  bootstrapRoundTimer = setTimeout(() => {
    if (战局状态.value !== '战局中' || 出招阶段.value) return
    void startNewRound()
  }, 200)
}

async function onFlee() {
  if (!战局中.value || fleeing.value) return
  fleeing.value = true
  try {
    dismissedBattleId.value = String(lastBattleSnapshot.value?.战局?.id || '')
    await http.post('/api/battle/flee')
    clearBattle()
  } finally {
    fleeing.value = false
  }
}

function onBattleEndConfirm() {
  dismissedBattleId.value = String(lastBattleSnapshot.value?.战局?.id || '')
  showBattleEndPopup.value = false
  pendingBattleEndPopup.value = false
  battleEndMessage.value = ''
  battleEndIWon.value = false
  战局状态.value = ''
  autoAttackEnabled.value = false
  autoMode.value = false
  showItemPopup.value = false
  showSkillPopup.value = false
  showSummonPopup.value = false
  selectingTarget.value = false
  currentActionMode.value = ''
  currentUnitKey.value = ''
  pendingAction.value = null
}

let pollTimer = null
let socketsBound = false
const actionCenterRef = ref(null)
const skillBtnRef = ref(null)
const summonBtnRef = ref(null)
const itemBtnRef = ref(null)
const popupPosition = ref({ top: '0px', left: '0px' })
function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(loadBattleSnapshot, 3000)
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
function bindSocketListeners() {
  if (socketsBound) return
  onRoundStarted(handleRoundStarted)
  onRoundResult(handleRoundResult)
  onActionsSubmitted(handleActionsSubmitted)
  onBattleError(handleError)
  onBattleChat(handleBattleChat)
  socketsBound = true
}
function unbindSocketListeners() {
  if (!socketsBound) return
  offRoundStarted(handleRoundStarted)
  offRoundResult(handleRoundResult)
  offActionsSubmitted(handleActionsSubmitted)
  offBattleError(handleError)
  offBattleChat(handleBattleChat)
  socketsBound = false
}
onMounted(async () => {
  if (currentOpponent.value) 对手用户名.value = currentOpponent.value
  await loadBattleSnapshot()
  scheduleBootstrapRoundIfIdle()
  bindSocketListeners()
  startPolling()
})

watch(connectionStatus, async (val, oldVal) => {
  if (val === 'offline') {
    重连后跳过动画.value = true
    return
  }
  if (val === 'online') {
    if (oldVal === 'offline') 重连后跳过动画.value = true
    await loadBattleSnapshot()
    scheduleBootstrapRoundIfIdle()
  }
})

onUnmounted(() => {
  stopCountdown()
  stopPolling()
  clearTimeout(bootstrapRoundTimer)
  unbindSocketListeners()
  window.removeEventListener('pointerdown', onGlobalPointerDown, true)
})

onActivated(async () => {
  bindSocketListeners()
  startPolling()
  await loadBattleSnapshot()
})

onDeactivated(() => {
  stopPolling()
})

function onGlobalPointerDown(e) {
  if (!showItemPopup.value && !showSummonPopup.value && !showSkillPopup.value) return
  const root = actionCenterRef.value
  if (!root) return
  const t = e.target
  const el = t && t.closest ? t.closest('.item-popup, .action-btn') : null
  if (el) return
  showItemPopup.value = false
  showSummonPopup.value = false
  showSkillPopup.value = false
  if (!selectingTarget.value) currentActionMode.value = ''
}

onMounted(() => {
  window.addEventListener('pointerdown', onGlobalPointerDown, true)
})
</script>

<style scoped>
.battle-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f172a;
  color: #e8eef5;
  overflow: hidden;
  padding-bottom: 60px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 36px);
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  min-height: 46px;
  background: rgba(30, 41, 59, 0.8);
  margin-top: 10px;
  border-radius: 10px;
}
.side-name {
  font-size: 14px;
  font-weight: 600;
  max-width: 30%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.opponent-name { color: #f07178; }
.self-name { color: #7fd99a; }
.system-msg { font-size: 12px; color: #8b9cb3; }

.battle-banner {
  min-height: 24px;
  line-height: 24px;
  padding: 0 8px;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
}
.battle-banner.info { color: #38bdf8; }
.battle-banner.warning { color: #fbbf24; }
.battle-banner.success { color: #22c55e; }
.battle-banner.danger { color: #f07178; }
.battle-banner.error { color: #ef4444; }

.battle-main {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  padding: 8px 8px 6px;
  gap: 6px;
  overflow: hidden;
  position: relative;
}

.team-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: flex-start;
}

.unit-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: default;
  transition: transform 0.15s ease;
}
.unit-card:active { transform: scale(0.98); }

.mount-card {
  min-height: auto;
}

.mount-box {
  background: #1e293b;
  border-radius: 8px;
  padding: 5px;
  border: 1px solid #334155;
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-box {
  min-height: 104px;
  border-radius: 8px;
  border: 2px solid transparent;
}

.status-box {
  background: #1e293b;
  border-radius: 8px;
  padding: 5px;
  border: 2px solid var(--unit-border-color, #1e293b);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.2s ease;
}

.active-unit > .status-box {
  --unit-border-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
}

.selectable-target > .status-box {
  cursor: pointer;
  --unit-border-color: #fbbf24;
}
.selectable-target > .status-box:hover {
  --unit-border-color: #f59e0b;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.3);
}

.anim-actor > .status-box {
  --unit-border-color: #3b82f6;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.7);
  animation: melee-actor-lunge var(--anim-melee-actor-ms, 360ms) ease;
}

.anim-target > .status-box {
  --unit-border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.75);
  animation: melee-target-hit var(--anim-melee-target-ms, 280ms) ease;
}

.anim-mount-heal > .status-box {
  --unit-border-color: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
}

@keyframes melee-actor-lunge {
  0% { transform: translateX(0) scale(1); }
  45% { transform: translateX(10px) scale(1.02); }
  100% { transform: translateX(0) scale(1); }
}

@keyframes melee-target-hit {
  0% { transform: scale(1); }
  40% { transform: scale(0.97); }
  100% { transform: scale(1); }
}

.unit-name {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  text-align: center;
  padding-bottom: 2px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
}

.bar-wrap {
  position: relative;
  height: 14px;
  background: #0f172a;
  border-radius: 5px;
  overflow: hidden;
}
.bar {
  height: 100%;
  transition: width 0.3s ease;
}
.hp-bar { background: #ef4444; }
.mp-bar { background: #3b82f6; }
.bar-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 0 2px #000;
}

.bar-masked .bar-text {
  visibility: hidden;
}

.bar-masked .bar {
  opacity: 0.2;
}

.meta-masked {
  visibility: hidden;
}

.meta-line {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 0 2px;
}
.job-tag { color: #fbbf24; }
.speed-rank { color: #38bdf8; }

.buff-line {
  font-size: 12px;
  color: #c084fc;
  height: 16px;
  padding-left: 2px;
}

.action-center {
  width: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  align-self: stretch;
  position: relative;
}
.action-btn {
  background: #334155;
  border: 1px solid #475569;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 6px 0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.action-btn:not(:disabled):hover { background: #475569; }
.action-btn:not(:disabled):active { background: #1e293b; }
.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.action-btn.active {
  background: #1e3a5f;
  border-color: #38bdf8;
  color: #38bdf8;
}

.item-popup {
  position: absolute;
  z-index: 50;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 90px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.item-option {
  padding: 8px 14px;
  font-size: 13px;
  color: #e2e8f0;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.item-option:hover { background: #334155; }
.item-option:first-child { border-radius: 7px 7px 0 0; }
.item-option:last-child { border-radius: 0 0 7px 7px; }
.summon-popup {
  min-height: calc(7 * 34px);
}
.item-option-empty {
  color: transparent;
  pointer-events: none;
}

.battle-footer {
  flex: 1;
  min-height: 0;
  margin-top: 0;
  padding: 6px 8px 4px;
  background: #1e293b;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}

.battle-toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.toolbar-btn {
  min-height: 38px;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #334155;
  color: #e2e8f0;
  font-size: 13px;
  transition: background 0.15s;
}
.toolbar-btn:not(:disabled):hover { background: #475569; }
.toolbar-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.toolbar-btn.danger {
  background: #7f1d1d;
  border-color: #991b1b;
}
.toolbar-btn.danger:not(:disabled):hover { background: #991b1b; }

.toolbar-btn.auto-toggle-on {
  background: #166534;
  border-color: #22c55e;
  color: #ecfdf5;
}
.toolbar-btn.auto-toggle-on:not(:disabled):hover {
  background: #15803d;
}

.chat-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-tabs {
  display: flex;
  gap: 4px;
}

.chat-tab {
  border: 1px solid #475569;
  background: #0f172a;
  color: #94a3b8;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.chat-tab.active {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #64748b;
}

.copy-debug-btn {
  border: 1px solid #475569;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
.copy-debug-btn:active {
  background: #1e293b;
}

.chat-box {
  flex: 1;
  min-height: 80px;
  background: #0f172a;
  border-radius: 6px;
  border: 1px solid #334155;
  padding: 8px;
  overflow-y: auto;
}

.tab-pane {
  min-height: 100%;
}

.system-pane {
  font-size: 12px;
  line-height: 1.55;
  color: #e2e8f0;
}

.sys-line {
  padding: 2px 0;
  word-break: break-word;
}

.sys-empty {
  font-size: 12px;
  padding: 6px 2px;
}

.chat-line {
  padding: 2px 0;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.55;
  color: #e2e8f0;
}

.chat-self {
  color: #22c55e;
  font-weight: 600;
}

.chat-other {
  color: #3b82f6;
  font-weight: 600;
}

.chat-input-bar {
  display: flex;
  gap: 6px;
  align-items: center;
}

.chat-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  color: #e2e8f0;
  outline: none;
}
.chat-input:focus {
  border-color: #3b82f6;
}
.chat-input::placeholder {
  color: #64748b;
}

.chat-send-btn {
  border: 1px solid #1d4ed8;
  background: #1e40af;
  color: #e2e8f0;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.chat-send-btn:active {
  background: #1e3a8a;
}

.muted {
  color: #94a3b8;
}

.no-battle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.no-battle-content p {
  font-size: 18px;
  color: #8b9cb3;
  margin-bottom: 20px;
}

.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.popup-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 28px 24px;
  max-width: 320px;
  width: 90%;
  text-align: center;
}

.battle-end-popup .popup-title {
  font-size: 20px;
  color: #f1f5f9;
  margin: 0 0 16px;
}

.battle-end-text {
  font-size: 15px;
  color: #94a3b8;
  margin: 0 0 24px;
  line-height: 1.5;
}

.popup-confirm-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 32px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
}

.popup-confirm-btn:active {
  background: #2563eb;
}
</style>
