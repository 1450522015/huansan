import { ref, computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battleStore.js'
import { drawStickman, startBreathing } from '@/shared/canvas/stickman'
import { getDeputyName } from '@/shared/battle/getDeputyName.js'

export function useBattleState(charCanvases) {
  const battleStore = useBattleStore()
  const leftCharacters = ref([null, null, null, null])
  const rightCharacters = ref([null, null, null, null])
  const round = ref(1)
  const remainingSeconds = ref(9999)
  const countdownTimer = ref(null)
  const eventBannerText = ref('')
  const debugEventText = ref('')

  const positionMap = {
    '左主将': { side: 'left', idx: 1 },
    '左副将1': { side: 'left', idx: 0 },
    '左副将2': { side: 'left', idx: 2 },
    '左副将3': { side: 'left', idx: 3 },
    '右主将': { side: 'right', idx: 0 },
    '右副将1': { side: 'right', idx: 1 },
    '右副将2': { side: 'right', idx: 2 },
    '右副将3': { side: 'right', idx: 3 },
  }

  function normalizeBuffs(rawBuffs) {
    if (!Array.isArray(rawBuffs)) return []
    const buffSet = new Set()
    for (const buff of rawBuffs) {
      const name = typeof buff === 'string' ? buff : buff?.名称
      if (name) buffSet.add(name)
    }
    return Array.from(buffSet)
  }

  function normalizeBuffDetails(rawBuffs) {
    if (!Array.isArray(rawBuffs)) return []
    return rawBuffs
      .map(buff => typeof buff === 'string' ? { 名称: buff } : { ...buff })
      .filter(buff => buff?.名称)
  }

  function toPercent(current, max) {
    const currentValue = Number(current) || 0
    const maxValue = Number(max) || 0
    if (maxValue <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((currentValue / maxValue) * 100)))
  }

  function numberOrNull(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  function failBattleData(message) {
    throw new Error(`[battle] ${message}`)
  }

  function getDisplayDeputyOrderIndex(副将索引, 是右侧) {
    if (是右侧) {
      if (副将索引 === 1) return 0
      if (副将索引 === 2) return 1
      if (副将索引 === 3) return 2
    } else {
      if (副将索引 === 0) return 0
      if (副将索引 === 2) return 1
      if (副将索引 === 3) return 2
    }
    return -1
  }

  function buildCharData(侧数据, 副将索引, 是右侧) {
    if (!侧数据 || !侧数据.状态) failBattleData('缺少玩家状态数据')

    const config = 侧数据.配置 || {}
    const attrs = 侧数据.属性 || {}
    const state = 侧数据.状态 || {}

    const 是主将 = 是右侧 ? 副将索引 === 0 : 副将索引 === 1

    let 状态数据, 属性数据, 配置数据

    if (是主将) {
      状态数据 = state.主将
      属性数据 = attrs.主将
      配置数据 = config.主将
    } else {
      const 副将位置 = getDisplayDeputyOrderIndex(副将索引, 是右侧)
      if (副将位置 < 0) failBattleData(`非法副将显示索引: ${副将索引}`)
      const 副将状态列表 = state.副将列表
      if (!Array.isArray(副将状态列表)) failBattleData('缺少副将状态列表')
      状态数据 = 副将状态列表[副将位置]

      if (!状态数据) return null
      if (状态数据.武将下标 === undefined) failBattleData(`副将位置${副将位置}缺少武将下标`)

      const 实际武将下标 = 状态数据.武将下标
      属性数据 = (attrs.副将列表 || [])[实际武将下标]
      配置数据 = (config.副将列表 || [])[实际武将下标]
    }

    if (!状态数据) failBattleData('缺少武将状态')
    if (!属性数据) failBattleData(`武将${状态数据.武将下标}缺少属性数据`)

    // 如果气血为0，返回null，不渲染
    if (numberOrNull(状态数据.气血) === 0) {
      return null
    }
    if (!配置数据) failBattleData(`武将${状态数据.武将下标}缺少配置数据`)

    let 最大气血, 最大精力

    if (!是主将 && 状态数据.无双?.是否开启 && 属性数据.无双属性) {
      最大气血 = 属性数据.无双属性.气血 || 属性数据.气血 || 1
      最大精力 = 属性数据.无双属性.精力 || 属性数据.精力 || 1
    } else {
      最大气血 = 属性数据.气血 || 1
      最大精力 = 属性数据.精力 || 1
    }

    最大气血 = 状态数据.最大气血 || 最大气血
    最大精力 = 状态数据.最大精力 || 最大精力

    const 当前气血 = 状态数据.气血 || 0
    const 当前精力 = 状态数据.精力 || 0

    const 角色分类 = 状态数据.角色分类 || 属性数据.角色分类 || '男武'
    const 分类尾字 = 角色分类.slice(-1)

    const 速度排名 = 状态数据.速度排名 || 99

    const 武将下标 = 是主将 ? -1 : (状态数据?.武将下标 ?? 0)
    const 显示名称 = getDeputyName(侧数据, 武将下标)

    let 坐骑名称 = ''
    if (是主将 && 配置数据?.坐骑?.种类) {
      坐骑名称 = 配置数据.坐骑.种类
    }

    return {
      hpPct: toPercent(当前气血, 最大气血),
      mpPct: toPercent(当前精力, 最大精力),
      class: 分类尾字,
      classColor: 分类尾字 === '武' ? 'class-warrior' : 分类尾字 === '文' ? 'class-scholar' : 'class-strategist',
      speed: 速度排名,
      isHero: 是主将,
      deputyName: 显示名称,
      animState: null,
      currentHp: 当前气血,
      maxHp: 最大气血,
      currentMp: 当前精力,
      maxMp: 最大精力,
      name: 是主将 ? (配置数据?.人物 || '') : '',
      mountName: 坐骑名称,
      武将下标,
      isWushuang: !是主将 && 状态数据.无双?.是否开启,
      buffs: normalizeBuffs(状态数据.buff),
      buffDetails: normalizeBuffDetails(状态数据.buff),
    }
  }

  function syncCharactersFromSnapshot() {
    const snap = battleStore.battleSnapshot
    if (!snap) return

    const 红方 = snap.红方
    const 黑方 = snap.黑方
    const 玩家是红方 = snap.是红方

    const 我方 = 玩家是红方 ? 红方 : 黑方
    const 敌方 = 玩家是红方 ? 黑方 : 红方

    for (let i = 0; i < 4; i++) {
      leftCharacters.value[i] = buildCharData(敌方, i, false)
      rightCharacters.value[i] = buildCharData(我方, i, true)
    }
  }

  function startCountdown() {
    stopCountdown()
    const timeoutMs = Number(battleStore.battleSnapshot?.超时毫秒)
    const serverNow = Number(battleStore.battleSnapshot?.服务器时间)
    const deadline = Number(battleStore.battleSnapshot?.出招截止时间)
    const totalSeconds = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.ceil(timeoutMs / 1000) : 9999
    const serverOffset = Number.isFinite(serverNow) ? serverNow - Date.now() : 0

    const updateRemaining = () => {
      if (Number.isFinite(deadline) && deadline > 0) {
        remainingSeconds.value = Math.max(0, Math.ceil((deadline - (Date.now() + serverOffset)) / 1000))
      } else {
        remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
      }
      if (remainingSeconds.value <= 0) stopCountdown()
    }

    if (Number.isFinite(deadline) && deadline > 0) {
      updateRemaining()
    } else {
      remainingSeconds.value = totalSeconds
    }
    countdownTimer.value = setInterval(updateRemaining, 1000)
  }

  function stopCountdown() {
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }
  }

  function drawAllCharacters() {
    for (let i = 0; i < 4; i++) {
      drawStickman(charCanvases.get('left-' + i), 'left-' + i)
      drawStickman(charCanvases.get('right-' + i), 'right-' + i)
    }
  }

  function initBattleDrawing() {
    startBreathing(charCanvases)
    drawAllCharacters()
  }

  function getCharByPosition(pos) {
    const info = positionMap[pos]
    if (!info) return null
    const charArray = info.side === 'left' ? leftCharacters.value : rightCharacters.value
    return charArray[info.idx]
  }

  function createChar(idx, side) {
    const isHero = (side === 'right' && idx === 0) || (side === 'left' && idx === 1)
    return {
      hpPct: 100,
      mpPct: 100,
      class: '武',
      classColor: 'class-warrior',
      speed: 1,
      isHero,
      deputyName: isHero ? '' : `副将${idx}`,
      animState: null,
      currentHp: 9999,
      maxHp: 9999,
      currentMp: 9999,
      maxMp: 9999,
      name: isHero ? '主将' : '',
      mountName: '',
      武将下标: isHero ? -1 : idx,
      buffs: [],
      isWushuang: false,
    }
  }

  return {
    leftCharacters,
    rightCharacters,
    round,
    remainingSeconds,
    eventBannerText,
    debugEventText,
    positionMap,
    buildCharData,
    normalizeBuffs,
    normalizeBuffDetails,
    toPercent,
    syncCharactersFromSnapshot,
    startCountdown,
    stopCountdown,
    drawAllCharacters,
    initBattleDrawing,
    getCharByPosition,
    createChar,
  }
}
