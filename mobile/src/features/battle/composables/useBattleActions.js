import { ref, reactive, computed, nextTick } from 'vue'
import { useSocketClient } from '@/shared/socket/socketClient.js'
import { useBattleStore } from '@/stores/battleStore.js'

export function useBattleActions(leftCharacters, rightCharacters, remainingSeconds, eventBannerText, battleSpeed) {
  const battleStore = useBattleStore()

  const currentUnitKey = ref('')
  const pendingAction = ref(null)
  const selectedItem = ref(null)
  const selectedSkill = ref(null)
  const selectingTarget = ref(false)
  const targetSide = ref('')
  const showItemPopup = ref(false)
  const showSummonPopup = ref(false)
  const showSkillPopup = ref(false)
  const popupClosing = ref(false)
  const currentActionMode = ref('')
  const actionsMap = reactive({})
  const floatingNumbers = reactive({})
  const actionLog = ref([])
  const selectedChar = ref(null)
  const autoEnabled = ref(false)
  const chatInput = ref('')
  const activeTab = ref('chat')
  const tabs = [
    { id: 'chat', label: '聊天' },
    { id: 'debug', label: '调试' },
    { id: 'dev', label: '开发' },
  ]
  const actionButtonsRef = ref(null)
  const skillBtnRef = ref(null)
  const summonBtnRef = ref(null)
  const itemBtnRef = ref(null)
  const popupPosition = ref({ top: '0px', left: '0px' })
  let floatingNumberId = 0

  const myUsername = computed(() => localStorage.getItem('huansan_用户名') || '')
  const playerIsRed = computed(() => battleStore.battleSnapshot?.是红方 ?? true)
  const selfUsername = computed(() => {
    const s = battleStore.battleSnapshot
    return playerIsRed.value ? s?.战局描述?.红方用户名 : s?.战局描述?.黑方用户名
  })
  const opponentUsername = computed(() => {
    const s = battleStore.battleSnapshot
    return playerIsRed.value ? s?.战局描述?.黑方用户名 : s?.战局描述?.红方用户名
  })

  const skill指向映射 = {
    '固若金汤': 'self',
    '凌波微步': 'self',
    '金蝉脱壳': 'self',
    '暗渡陈仓': 'self',
  }

  const selfUnits = computed(() => {
    return rightCharacters.value.flatMap((c, i) => {
      if (!c) return []
      return {
        ...c,
        key: c.isHero ? 'self:主将' : `self:副将${c.武将下标}`,
        side: 'right',
        index: i,
        pos: 'right-' + i,
        武将下标: c.武将下标 ?? -1,
        name: c.isHero ? (c.name || '主将') : (c.deputyName || '副将'),
      }
    })
  })

  const opponentUnits = computed(() => {
    return leftCharacters.value.flatMap((c, i) => {
      if (!c) return []
      return {
        ...c,
        key: c.isHero ? 'enemy:主将' : `enemy:副将${c.武将下标}`,
        side: 'left',
        index: i,
        pos: 'left-' + i,
        武将下标: c.武将下标 ?? -1,
        name: c.isHero ? (c.name || '主将') : (c.deputyName || '副将'),
      }
    })
  })

  const canAct = computed(() => currentUnitKey.value && currentUnitKey.value.startsWith('self:'))
  const canSummonNow = computed(() => canAct.value && currentUnitKey.value === 'self:主将')

  const candidateRecruits = computed(() => {
    const s = battleStore.battleSnapshot
    if (!s) return []
    const selfCfg = playerIsRed.value ? s.红方?.配置 : s.黑方?.配置
    const selfState = playerIsRed.value ? s.红方?.状态 : s.黑方?.状态
    const selfAttr = playerIsRed.value ? s.红方?.属性 : s.黑方?.属性
    const list = Array.isArray(selfCfg?.副将列表) ? selfCfg.副将列表 : []
    const attrList = Array.isArray(selfAttr?.副将列表) ? selfAttr.副将列表 : []
    const 在场下标 = new Set()
    for (const fs of (selfState?.副将列表 || [])) {
      if (fs && Number.isFinite(fs.武将下标)) 在场下标.add(fs.武将下标)
    }
    const 死亡下标 = new Set(Array.isArray(selfState?.副将死亡列表) ? selfState.副将死亡列表 : [])
    const candidates = []
    for (let i = 0; i < list.length; i++) {
      const d = list[i]
      const 名 = String(d?.人物 || '').trim()
      if (!名) continue
      if (在场下标.has(i)) continue
      if (死亡下标.has(i)) continue
      const 星级 = d?.星级 || 0
      const 转数 = d?.转数 || 0
      const 等级 = d?.等级 || 0
      const 职业经历 = Array.isArray(d?.职业经历) ? d.职业经历 : []
      const 分类尾字 = 职业经历.map(e => e.slice(-1)).join('')
      const attr = attrList[i] || {}
      const 风格 = attr?.风格 || ''
      const 速度 = attr?.速度 || 0
      const line1 = `${名} ${星级}星 ${转数}转${等级}级`
      const line2 = `${分类尾字} ${风格} 速度:${速度}`
      candidates.push({ slot: i, name: 名, displayName: 名, line1, line2 })
    }
    return candidates
  })

  const availableItems = [
    { name: '九转丹' },
    { name: '龙涎露' },
  ]

  function getSelfUnitConfigByKey(key) {
    const s = battleStore.battleSnapshot
    if (!s || !key || !key.startsWith('self:')) return null
    const selfCfg = playerIsRed.value ? s.红方?.配置 : s.黑方?.配置
    if (!selfCfg) return null
    const type = key.replace('self:', '')
    if (type === '主将') return selfCfg.主将 || null
    const list = Array.isArray(selfCfg.副将列表) ? selfCfg.副将列表 : []
    const m = type.match(/副将(\d+)/)
    if (m) return list[parseInt(m[1])] || null
    return null
  }

  const currentUnitSkills = computed(() => {
    const cfg = getSelfUnitConfigByKey(currentUnitKey.value)
    const raw = Array.isArray(cfg?.技能) ? cfg.技能 : []
    const 神将技 = cfg?.神将技 || ''
    return raw
      .filter(Boolean)
      .map(s => {
        if (typeof s === 'string') return { name: s, displayName: s, level: '' }
        const n = String(s?.名称 || '').trim()
        return { name: n, displayName: n === 神将技 ? n + '(神)' : n, level: String(s?.等级 || '') }
      })
      .filter(s => s.name || s.displayName)
  })

  function addFloatingNumber(pos, type, value) {
    const now = Date.now()
    const current = floatingNumbers[pos] || []
    floatingNumbers[pos] = current.filter(n => now - n.timestamp < 3000)
    floatingNumbers[pos].push({
      id: ++floatingNumberId,
      type,
      value,
      text: type === 'damage' ? '-' + value : '+' + value,
      timestamp: now,
    })
  }

  function getFloatingNumbers(pos) {
    const nums = floatingNumbers[pos] || []
    const now = Date.now()
    return nums.filter(n => now - n.timestamp < 3000)
  }

  function isSelectableTarget(pos, char) {
    if (!selectingTarget.value || !char) return false
    if (char.currentHp <= 0 && !char.isHero) return false
    const charSide = pos.startsWith('right') ? 'right' : 'left'
    if (targetSide.value === 'enemy') {
      return charSide === 'left'
    }
    if (targetSide.value === 'self') {
      return charSide === 'right'
    }
    return false
  }

  function isCurrentActor(pos) {
    if (!currentUnitKey.value || !pos) return false
    if (!pos.startsWith('right')) return false
    const unit = selfUnits.value.find(u => u.pos === pos)
    return unit && unit.key === currentUnitKey.value
  }

  function startActingPhase() {
    const aliveUnits = selfUnits.value.filter(u => u.currentHp > 0 || u.isHero)
    if (aliveUnits.length === 0) return
    currentUnitKey.value = aliveUnits[0].key
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
  }

  function saveCurrentAction(action, targetKey, extra = {}) {
    if (currentUnitKey.value) {
      actionsMap[currentUnitKey.value] = { 操作: action, 目标: targetKey, ...extra }
      const unit = selfUnits.value.find(u => u.key === currentUnitKey.value)
      const targetName = extra.技能 || extra.物品 || extra.招将 || (opponentUnits.value.find(u => u.key === targetKey)?.name) || ''
      actionLog.value.push({
        name: unit?.name || currentUnitKey.value,
        action: action,
        target: targetName,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      })
    }
  }

  function moveToNextUnit() {
    const aliveUnits = selfUnits.value.filter(u => u.currentHp > 0 || u.isHero)
    const currentIndex = aliveUnits.findIndex(u => u.key === currentUnitKey.value)
    let nextIndex = currentIndex + 1

    for (let i = nextIndex; i < aliveUnits.length; i++) {
      const key = aliveUnits[i].key
      if (!actionsMap[key]) {
        currentUnitKey.value = key
        return
      }
    }

    for (let i = 0; i < currentIndex; i++) {
      const key = aliveUnits[i].key
      if (!actionsMap[key]) {
        currentUnitKey.value = key
        return
      }
    }

    submitAllActions()
  }

  function setBanner(text) {
    eventBannerText.value = text
  }

  function updateBannerFromState() {
    const sec = remainingSeconds.value
    const name = 当前单位显示名.value || '?'
    setBanner(`${name}-出招(${sec})`)
  }

  const 当前单位显示名 = computed(() => {
    if (!currentUnitKey.value) return ''
    const unit = selfUnits.value.find(u => u.key === currentUnitKey.value)
    if (!unit) return '?'
    return unit.name
  })

  function calculatePopupPosition(btnRef) {
    nextTick(() => {
      const btn = btnRef?.value
      const scene = document.querySelector('.battle-scene')
      if (!btn || !scene) return
      const btnRect = btn.getBoundingClientRect()
      const sceneRect = scene.getBoundingClientRect()
      const top = btnRect.top - sceneRect.top
      const left = btnRect.right - sceneRect.left
      popupPosition.value = { top: `${top}px`, left: `${left + 4}px`, transform: '' }
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
      if (!canSummonNow.value) return
      showSummonPopup.value = true
      calculatePopupPosition(summonBtnRef)
      return
    }

    if (actionType === '攻击') {
      pendingAction.value = '攻击'
      selectingTarget.value = true
      targetSide.value = 'enemy'
      return
    }

    if (actionType === '技能') {
      showSkillPopup.value = true
      calculatePopupPosition(skillBtnRef)
    }
  }

  function onSelectSkill(skill) {
    if (!skill?.name) return
    selectedSkill.value = skill
    showSkillPopup.value = false
    pendingAction.value = '技能'
    selectingTarget.value = true
    targetSide.value = skill指向映射[skill.name] || 'enemy'
  }

  function onSelectItem(item) {
    if (!item) return
    selectedItem.value = item
    showItemPopup.value = false
    pendingAction.value = '物品'
    selectingTarget.value = true
    targetSide.value = 'self'
  }

  function onSelectSummon(item) {
    if (!item || !canSummonNow.value) return
    showSummonPopup.value = false
    saveCurrentAction('招将', null, { 招将: item.name, 招将槽位: item.slot })
    moveToNextUnit()
  }

  function selectTarget(char, pos) {
    if (!selectingTarget.value || !currentUnitKey.value) return
    const unit = selfUnits.value.find(u => u.pos === pos) || opponentUnits.value.find(u => u.pos === pos)
    if (!unit || !isSelectableTarget(pos, char)) return

    let extraData = {}
    if (pendingAction.value === '物品' && selectedItem.value) extraData.物品 = selectedItem.value.name
    if (pendingAction.value === '技能' && selectedSkill.value?.name) extraData.技能 = selectedSkill.value.name

    saveCurrentAction(pendingAction.value, unit.key, extraData)
    exitSelectionMode()
    moveToNextUnit()
  }

  function onCharClick(char) {
    if (popupClosing.value) return
    if (showItemPopup.value || showSummonPopup.value || showSkillPopup.value) {
      showItemPopup.value = false
      showSummonPopup.value = false
      showSkillPopup.value = false
      if (!selectingTarget.value) currentActionMode.value = ''
      popupClosing.value = true
      setTimeout(() => { popupClosing.value = false }, 50)
      return
    }
    if (!char) return
    selectedChar.value = char
  }

  function toggleAuto() {
    autoEnabled.value = !autoEnabled.value
    if (autoEnabled.value && currentUnitKey.value) {
      fillAutoActions()
    }
  }

  function fillAutoActions() {
    const aliveUnits = selfUnits.value.filter(u => u.currentHp > 0 || u.isHero)
    for (const u of aliveUnits) {
      if (!actionsMap[u.key]) {
        actionsMap[u.key] = { 操作: '攻击', 目标: 'enemy:主将' }
      }
    }
    submitAllActions()
  }

  function toggleSpeed() {
    if (battleSpeed.value === 1) battleSpeed.value = 2
    else if (battleSpeed.value === 2) battleSpeed.value = 3
    else if (battleSpeed.value === 3) battleSpeed.value = 0
    else battleSpeed.value = 1
  }

  async function onFlee() {
    await battleStore.fleeBattle()
  }

  async function sendChat() {
    const text = chatInput.value.trim()
    if (!text) return
    const { emit } = useSocketClient()
    emit('pk-plan', { type: 'chat', text })
    chatInput.value = ''
  }

  function handleOnInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChat()
    }
  }

  async function submitAllActions() {
    currentUnitKey.value = ''
    eventBannerText.value = ''
    exitSelectionMode()

    const actionList = []
    for (const u of selfUnits.value) {
      const saved = actionsMap[u.key]
      if (!saved) continue
      const action = {
        出招方玩家名: myUsername.value,
        出招方武将下标: u.武将下标,
        操作: saved.操作 || '防御',
      }
      if (saved.操作 === '攻击' || saved.操作 === '技能' || saved.操作 === '物品') {
        const targetUnit = opponentUnits.value.find(t => t.key === saved.目标) || selfUnits.value.find(t => t.key === saved.目标)
        action.接招方玩家名 = targetUnit?.side === 'right' ? selfUsername.value : opponentUsername.value
        action.接招方武将下标 = targetUnit?.武将下标 ?? -1
      }
      if (saved.操作 === '技能' && saved.技能) action.技能 = saved.技能
      if (saved.操作 === '招将' && saved.招将槽位 !== undefined) action.招将 = saved.招将槽位
      if (saved.操作 === '物品' && saved.物品) action.物品 = saved.物品
      actionList.push(action)
    }

    await battleStore.submitPlan(actionList)
  }

  function onGlobalPointerDown(e) {
    if (!showItemPopup.value && !showSummonPopup.value && !showSkillPopup.value) return
    const root = actionButtonsRef.value
    if (!root) return
    const t = e.target
    const el = t && t.closest ? t.closest('.item-popup, .action-btn') : null
    if (el) return
    showItemPopup.value = false
    showSummonPopup.value = false
    showSkillPopup.value = false
    popupClosing.value = true
    if (!selectingTarget.value) currentActionMode.value = ''
    setTimeout(() => { popupClosing.value = false }, 50)
  }

  function resetActions() {
    Object.keys(actionsMap).forEach(k => delete actionsMap[k])
    currentUnitKey.value = ''
    exitSelectionMode()
  }

  return {
    currentUnitKey,
    pendingAction,
    selectedItem,
    selectedSkill,
    selectingTarget,
    targetSide,
    showItemPopup,
    showSummonPopup,
    showSkillPopup,
    popupClosing,
    currentActionMode,
    actionsMap,
    floatingNumbers,
    actionLog,
    selectedChar,
    autoEnabled,
    chatInput,
    activeTab,
    tabs,
    actionButtonsRef,
    skillBtnRef,
    summonBtnRef,
    itemBtnRef,
    popupPosition,
    myUsername,
    playerIsRed,
    skill指向映射,
    selfUnits,
    opponentUnits,
    canAct,
    canSummonNow,
    candidateRecruits,
    availableItems,
    currentUnitSkills,
    当前单位显示名,
    addFloatingNumber,
    getFloatingNumbers,
    isSelectableTarget,
    isCurrentActor,
    startActingPhase,
    exitSelectionMode,
    saveCurrentAction,
    moveToNextUnit,
    setBanner,
    updateBannerFromState,
    getSelfUnitConfigByKey,
    calculatePopupPosition,
    onAction,
    onSelectSkill,
    onSelectItem,
    onSelectSummon,
    selectTarget,
    onCharClick,
    toggleAuto,
    toggleSpeed,
    onFlee,
    sendChat,
    handleOnInputKeydown,
    submitAllActions,
    onGlobalPointerDown,
    resetActions,
    fillAutoActions,
  }
}
