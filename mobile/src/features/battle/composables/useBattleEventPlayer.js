import { nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleStore } from '@/stores/battleStore.js'

const ANIMATION_MAPPING = {
  '普通攻击': { type: 'attack', anim: '普通攻击' },
  '暴击攻击': { type: 'attack', anim: '暴击攻击' },
  '致命攻击': { type: 'attack', anim: '致命攻击' },
  '攻击未命中': { type: 'attack', anim: '未命中' },
  '舍命一击': { type: 'skill', anim: '舍命一击' },
  '力劈华山': { type: 'skill', anim: '力劈华山' },
  '排山倒海': { type: 'skill', anim: '排山倒海' },
  '固若金汤': { type: 'skill', anim: '固若金汤' },
  '凌波微步': { type: 'skill', anim: '凌波微步' },
  '画地为牢': { type: 'skill', anim: '画地为牢' },
  '趁火打劫': { type: 'skill', anim: '趁火打劫' },
  '四面楚歌': { type: 'skill', anim: '四面楚歌' },
  '金蝉脱壳': { type: 'skill', anim: '金蝉脱壳' },
  '暗渡陈仓': { type: 'skill', anim: '暗渡陈仓' },
  '呼风唤雨': { type: 'skill', anim: '呼风唤雨' },
  '妖火燎原': { type: 'skill', anim: '妖火燎原' },
  '五雷轰顶': { type: 'skill', anim: '五雷轰顶' },
  '巫蛊极毒': { type: 'skill', anim: '巫蛊极毒' },
  '毁天灭地': { type: 'skill', anim: '毁天灭地' },
  '招将': { type: 'summon' },
  '防御': { type: 'defend' },
  '九转丹': { type: 'item', anim: '金蝉脱壳' },
  '龙涎露': { type: 'item', anim: '金蝉脱壳' },
  '无双开启': { type: 'doubleOn' },
  '无双关闭': { type: 'doubleOff' },
  '反震': { type: 'counter' },
  '木牛流马': { type: 'item', anim: '金蝉脱壳' },
  '毒发': { type: 'damageTick' },
  '爆炸': { type: 'explosion' },
}

export function useBattleEventPlayer(battleState, battleActions, battleAnimation, battleSpeed) {
  const router = useRouter()
  const battleStore = useBattleStore()
  let initialSyncPending = true
  let pageActive = true
  let lastPlayedSettlementRound = 0
  let globalPointerListenerBound = false

  const { leftCharacters, rightCharacters, round, remainingSeconds, eventBannerText, debugEventText } = battleState
  const { addFloatingNumber, setBanner, resetActions, startActingPhase } = battleActions
  const {
    sleep,
    playAttackAnimation,
    onSkillDemoForAnimation,
    playEnterAnimation,
    playLeaveAnimation,
    getPositionInfo,
    getCharInner,
    flashWhite,
    shakeScreen,
  } = battleAnimation

  function failBattleData(message) {
    throw new Error(`[battle] ${message}`)
  }

  function eventKeyToPos(玩家名, 武将下标) {
    const s = battleStore.battleSnapshot
    if (!s || !s.战局描述) failBattleData('缺少战局快照')
    const 红方用户名 = s.战局描述.红方用户名 || ''
    const 黑方用户名 = s.战局描述.黑方用户名 || ''
    let 是红方
    if (玩家名 === 红方用户名) {
      是红方 = true
    } else if (玩家名 === 黑方用户名) {
      是红方 = false
    } else {
      failBattleData(`事件玩家不存在: ${玩家名}`)
    }
    const 玩家是红方 = s.是红方 ?? true
    const isSelf = 是红方 === 玩家是红方
    const side = isSelf ? 'right' : 'left'

    if (武将下标 === -1) {
      return side === 'right' ? '右主将' : '左主将'
    }

    const rendered = side === 'right' ? rightCharacters.value : leftCharacters.value
    const renderedIndex = rendered.findIndex(c => c && c.武将下标 === 武将下标)
    return renderedIndex === -1 ? null : sideIndexToPosition(side, renderedIndex)
  }

  function sideIndexToPosition(side, idx) {
    if (side === 'right') {
      if (idx === 0) return '右主将'
      if (idx >= 1 && idx <= 3) return `右副将${idx}`
      failBattleData(`右侧位置索引非法: ${idx}`)
    }
    if (idx === 1) return '左主将'
    if (idx === 0) return '左副将1'
    if (idx === 2) return '左副将2'
    if (idx === 3) return '左副将3'
    failBattleData(`左侧位置索引非法: ${idx}`)
  }

  function getCharArrayBySide(side) {
    return side === 'left' ? leftCharacters.value : rightCharacters.value
  }

  function extractBuffs(payload) {
    if (!payload) return undefined
    if (Array.isArray(payload.buff)) return payload.buff
    if (Array.isArray(payload.新状态?.buff)) return payload.新状态.buff
    return undefined
  }

  function hasBuffUpdate(payload) {
    return extractBuffs(payload) !== undefined
  }

  function numberOrNull(value) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function getSideSnapshot(side) {
    const s = battleStore.battleSnapshot
    if (!s) failBattleData('缺少战局快照')
    const playerIsRed = s.是红方 ?? true
    const selfSide = playerIsRed ? s.红方 : s.黑方
    const enemySide = playerIsRed ? s.黑方 : s.红方
    return side === 'right' ? selfSide : enemySide
  }

  function createCharFromSnapshot(pos) {
    const { side, idx } = getPositionInfo(pos)
    const sideData = getSideSnapshot(side)
    const char = battleState.buildCharData(sideData, idx, side === 'right')
    if (!char) failBattleData(`${pos}没有对应的场上武将`)
    return char
  }

  function getFirstTargetValue(targets, field) {
    const target = targets.find(t => Number(t?.[field]) > 0)
    return Number(target?.[field]) || 0
  }

  function getFallbackTargetPos(actorPos) {
    if (!actorPos) return null
    const { side } = getPositionInfo(actorPos)
    const targetSide = side === 'right' ? 'left' : 'right'
    const list = targetSide === 'right' ? rightCharacters.value : leftCharacters.value
    const idx = list.findIndex(c => c && (c.isHero || c.currentHp > 0))
    return idx >= 0 ? sideIndexToPosition(targetSide, idx) : null
  }

  function posToFloatingKey(pos) {
    const { side, idx } = getPositionInfo(pos)
    return `${side}-${idx}`
  }

  function addNumberAtBattlePos(pos, type, value) {
    if (!pos || !Number(value)) return
    addFloatingNumber(posToFloatingKey(pos), type, value)
  }

  function addRecoveryFloatingNumbers(event, targets) {
    if (event?.气血回复 && event.玩家名 !== undefined && event.武将下标 !== undefined) {
      const pos = eventKeyToPos(event.玩家名, event.武将下标)
      addNumberAtBattlePos(pos, 'heal', event.气血回复)
    }
    if (event?.精力回复 && event.玩家名 !== undefined && event.武将下标 !== undefined) {
      const pos = eventKeyToPos(event.玩家名, event.武将下标)
      addNumberAtBattlePos(pos, 'mp', event.精力回复)
    }
    for (const t of targets) {
      const tPos = eventKeyToPos(t.玩家名, t.武将下标)
      if (!tPos) continue
      addNumberAtBattlePos(tPos, 'heal', t.气血回复)
      addNumberAtBattlePos(tPos, 'mp', t.精力回复)
    }
  }

  function getDamagedTargets(targets) {
    return targets
      .map(t => ({
        pos: eventKeyToPos(t.玩家名, t.武将下标),
        damage: Number(t?.气血伤害) || 0,
      }))
      .filter(t => t.pos && t.damage > 0)
  }

  function addDamageFloatingNumbers(damagedTargets) {
    for (const target of damagedTargets) {
      addNumberAtBattlePos(target.pos, 'damage', target.damage)
    }
  }

  async function playExplosionEffects(positions) {
    const tasks = positions
      .filter(Boolean)
      .map(async (pos) => {
        const inner = getCharInner(pos)
        if (!inner) return
        const el = document.createElement('div')
        el.className = 'battle-explosion-effect'
        inner.appendChild(el)
        setTimeout(() => el.remove(), 650)
      })
    await Promise.all(tasks)
    await sleep(420)
  }

  async function shakeDamagedTargets(damagedTargets, actorPos) {
    if (!damagedTargets.length) return
    addDamageFloatingNumbers(damagedTargets)
    shakeScreen()
    const actorInfo = actorPos ? getPositionInfo(actorPos) : null
    const tasks = damagedTargets.map(async ({ pos }) => {
      const inner = getCharInner(pos)
      if (!inner) return
      flashWhite(inner)
      const targetInfo = getPositionInfo(pos)
      const dir = actorInfo ? (actorInfo.side === targetInfo.side ? 1 : actorInfo.side === 'left' ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1)
      inner.style.transition = 'transform 0.06s ease-out'
      inner.style.transform = `translateX(${dir * 14}px)`
      await sleep(70)
      inner.style.transform = `translateX(${-dir * 8}px)`
      await sleep(60)
      inner.style.transition = 'transform 0.16s ease-in'
      inner.style.transform = ''
      await sleep(170)
      inner.style.transition = ''
      inner.style.transform = ''
    })
    await Promise.all(tasks)
  }

  async function applyTargetBuffUpdates(targets) {
    for (const t of targets) {
      if (!hasBuffUpdate(t)) continue
      const tPos = eventKeyToPos(t.玩家名, t.武将下标)
      if (!tPos) continue
      applyStateToPosition(tPos, undefined, extractBuffs(t))
    }
    await nextTick()
  }

  function applyStateToPosition(pos, newState, rawBuffs, options = {}) {
    if (!pos) failBattleData('缺少场上位置')
    const { side, idx } = getPositionInfo(pos)
    const charArray = getCharArrayBySide(side)
    let char = charArray[idx]

    const nextHp = numberOrNull(newState?.气血)
    if (!char && nextHp !== null && nextHp > 0) {
      char = createCharFromSnapshot(pos)
      charArray[idx] = char
    }
    if (!char) failBattleData(`${pos}没有已渲染武将`)

    // 复活时恢复角色样式
    if (nextHp !== null && nextHp > 0) {
      const inner = getCharInner(pos)
      if (inner) {
        inner.style.opacity = '1'
        inner.style.filter = ''
        inner.style.transform = ''
        inner.style.transition = ''
      }
    }

    const next = { ...char }
    const nextMp = numberOrNull(newState?.精力)
    const nextMaxHp = numberOrNull(newState?.最大气血)
    const nextMaxMp = numberOrNull(newState?.最大精力)
    const nextSpeed = numberOrNull(newState?.速度排名)

    if (nextHp !== null) next.currentHp = nextHp
    if (nextMp !== null) next.currentMp = nextMp
    if (nextMaxHp !== null) next.maxHp = nextMaxHp
    if (nextMaxMp !== null) next.maxMp = nextMaxMp
    if (nextSpeed !== null) next.speed = nextSpeed
    if (rawBuffs !== undefined) {
      next.buffs = battleState.normalizeBuffs(rawBuffs)
      next.buffDetails = battleState.normalizeBuffDetails(rawBuffs)
    }
    if (options.isWushuang !== undefined) next.isWushuang = options.isWushuang

    next.hpPct = battleState.toPercent(next.currentHp, next.maxHp)
    next.mpPct = battleState.toPercent(next.currentMp, next.maxMp)

    charArray[idx] = next
    return next
  }

  async function playLeaveIfDead(pos, newState) {
    const hp = numberOrNull(newState?.气血)
    if (hp === 0) {
      await playLeaveAnimation(pos, leftCharacters, rightCharacters)
    }
  }

  async function playEventAnimation(event) {
    const 动画 = event.动画名称
    const hasActor = event.玩家名 !== undefined && event.武将下标 !== undefined
    const actorPos = hasActor ? eventKeyToPos(event.玩家名, event.武将下标) : null
    const targets = Array.isArray(event.目标) ? event.目标 : []

    if (!actorPos && targets.length === 0) {
      setBanner(event.横幅显示 || 动画)
      await sleep(500)
      return
    }

    setBanner(event.横幅显示 || 动画)

    const waitMs = battleSpeed.value === 0 ? 100 : battleSpeed.value === 1 ? 1200 : battleSpeed.value === 2 ? 700 : 300
    const mapping = ANIMATION_MAPPING[动画]
    const damagedTargets = getDamagedTargets(targets)
    addRecoveryFloatingNumbers(event, targets)

    if (!mapping) {
      await sleep(waitMs)

    } else if (mapping.type === 'attack') {
      const targetPos = targets.length > 0 ? eventKeyToPos(targets[0].玩家名, targets[0].武将下标) : getFallbackTargetPos(actorPos)
      if (actorPos && targetPos) {
        const damage = getFirstTargetValue(targets, '气血伤害')
        await playAttackAnimation(actorPos, targetPos, mapping.anim !== '未命中', damage, mapping.anim)
      } else { await sleep(waitMs) }
    } else if (mapping.type === 'skill') {
      const targetPos = targets.length > 0 ? eventKeyToPos(targets[0].玩家名, targets[0].武将下标) : null
      if (actorPos && targetPos) {
        const damage = getFirstTargetValue(targets, '气血伤害')
        const isGroupDamage = damagedTargets.length > 1
        await onSkillDemoForAnimation(mapping.anim, actorPos, targetPos, isGroupDamage ? 0 : damage)
        await shakeDamagedTargets(isGroupDamage ? damagedTargets : damagedTargets.filter(t => t.pos !== targetPos), actorPos)
      } else { await sleep(waitMs) }
    } else if (mapping.type === 'summon') {
      for (const t of targets) {
        const targetPos = eventKeyToPos(t.玩家名, t.武将下标)
        if (targetPos && t.新状态 && Number(t.新状态.气血) > 0) {
          applyStateToPosition(targetPos, t.新状态, extractBuffs(t))
          await nextTick()
          await playEnterAnimation(targetPos, leftCharacters, rightCharacters)
        } else if (t.新状态 && Number(t.新状态.气血) <= 0) {
          if (targetPos) { await playLeaveAnimation(targetPos, leftCharacters, rightCharacters) }
        }
      }
    } else if (mapping.type === 'item') {
      const targetPos = targets.length > 0 ? eventKeyToPos(targets[0].玩家名, targets[0].武将下标) : actorPos
      if (targetPos) { await onSkillDemoForAnimation(mapping.anim, actorPos, targetPos, 0) }
      else { await sleep(waitMs) }
    } else if (mapping.type === 'defend') {
      await sleep(waitMs)
    } else if (mapping.type === 'doubleOn') {
      if (actorPos) {
        applyStateToPosition(actorPos, event.新状态, extractBuffs(event), { isWushuang: true })
        await onSkillDemoForAnimation('无双开启', actorPos, actorPos, 0)
      }
      else { await sleep(waitMs) }
    } else if (mapping.type === 'doubleOff') {
      await sleep(waitMs)
    } else if (mapping.type === 'counter') {
      if (actorPos && targets.length > 0) {
        const targetPos = eventKeyToPos(targets[0].玩家名, targets[0].武将下标)
        if (targetPos) { await onSkillDemoForAnimation('反震', actorPos, targetPos, event.气血伤害 || 0) }
        else { await sleep(waitMs) }
      } else { await sleep(waitMs) }
    } else if (mapping.type === 'damageTick') {
      await Promise.all([
        applyTargetBuffUpdates(targets),
        shakeDamagedTargets(damagedTargets, actorPos),
      ])
    } else if (mapping.type === 'explosion') {
      await Promise.all([
        applyTargetBuffUpdates(targets),
        playExplosionEffects(damagedTargets.map(t => t.pos)),
        shakeDamagedTargets(damagedTargets, actorPos),
      ])
    }

    if (!mapping) {
      await shakeDamagedTargets(damagedTargets, actorPos)
    }

    if (actorPos) {
      applyStateToPosition(actorPos, event.新状态, extractBuffs(event), {
        isWushuang: mapping?.type === 'doubleOn' ? true : mapping?.type === 'doubleOff' ? false : undefined,
      })
      await playLeaveIfDead(actorPos, event.新状态)
    }

    for (const t of targets) {
      const tPos = eventKeyToPos(t.玩家名, t.武将下标)
      if (!tPos) continue
      applyStateToPosition(tPos, t.新状态, extractBuffs(t))
      await playLeaveIfDead(tPos, t.新状态)
    }
    await nextTick()
  }

  function updateCharsFromSnapshot() {
    const s = battleStore.battleSnapshot
    if (!s || !s.红方 || !s.黑方) return

    const { buildCharData } = battleState
    const playerIsRed = s.是红方 ?? true
    const 红方 = s.红方
    const 黑方 = s.黑方
    const 我方 = playerIsRed ? 红方 : 黑方
    const 敌方 = playerIsRed ? 黑方 : 红方

    for (let i = 0; i < 4; i++) {
      leftCharacters.value[i] = buildCharData(敌方, i, false)
      rightCharacters.value[i] = buildCharData(我方, i, true)
    }
  }

  function updateCharsFromRoundInitial(回合信息) {
    if (!回合信息?.回合初状态) failBattleData('缺少回合初状态')
    const s = battleStore.battleSnapshot
    if (!s) failBattleData('缺少战局快照')
    const playerIsRed = s.是红方 ?? true
    const 初红方 = 回合信息.回合初状态.红方
    const 初黑方 = 回合信息.回合初状态.黑方
    if (!初红方 || !初黑方) failBattleData('回合初状态缺少红方或黑方')

    const { buildCharData } = battleState
    const 红方初 = { ...s.红方, 状态: 初红方 }
    const 黑方初 = { ...s.黑方, 状态: 初黑方 }
    const 我方初 = playerIsRed ? 红方初 : 黑方初
    const 敌方初 = playerIsRed ? 黑方初 : 红方初

    for (let i = 0; i < 4; i++) {
      leftCharacters.value[i] = buildCharData(敌方初, i, false)
      rightCharacters.value[i] = buildCharData(我方初, i, true)
    }
  }

  function enterActingPhase() {
    const s = battleStore.battleSnapshot
    if (!s) return

    eventBannerText.value = ''
    resetActions()

    if (s.可否出招 === false || s.本方是否已出招 || s.我方已出招) {
      battleActions.currentUnitKey.value = ''
    } else {
      const aliveUnits = battleActions.selfUnits.value.filter(u => u.currentHp > 0 || u.isHero)
      if (aliveUnits.length > 0) {
        battleActions.currentUnitKey.value = aliveUnits[0].key
      }
    }

    battleState.startCountdown()

    if (!s.我方已出招 && battleActions.autoEnabled.value) {
      battleActions.fillAutoActions()
    }
  }

  async function playSettlement(回合信息) {
    const events = Array.isArray(回合信息?.战况事件序列) ? 回合信息.战况事件序列 : []

    battleState.stopCountdown()
    battleActions.currentUnitKey.value = ''
    debugEventText.value = ''

    if (events.length === 0) {
      setBanner('（本轮无战况）')
      return
    }

    if (battleSpeed.value === 0) {
      for (const event of events) {
        if (event?.简要文本) debugEventText.value += `${event.简要文本}\n`
      }
      setBanner(events[events.length - 1]?.横幅显示 || '回合结束')
      return
    }

    battleAnimation.animating.value = true
    for (const event of events) {
      if (!battleAnimation.animating.value) break
      if (event?.简要文本) debugEventText.value += `${event.简要文本}\n`
      await playEventAnimation(event)
    }
    battleAnimation.animating.value = false
  }

  function leaveBattlePage() {
    battleStore.clearBattle()
    router.replace('/hall')
  }

  async function playUnplayedSettlement(data, afterPlay) {
    const settlementRound = Number(data?.最近结算回合号 ?? data?.回合信息?.回合数 ?? 0)
    if (settlementRound > lastPlayedSettlementRound && data?.回合信息) {
      updateCharsFromRoundInitial(data.回合信息)
      await playSettlement(data.回合信息)
      lastPlayedSettlementRound = settlementRound
      updateCharsFromSnapshot()
      afterPlay?.()
      return true
    }
    return false
  }

  function handleStateData(data) {
    if (!data || !data.战局描述) return
    if (!pageActive) return

    const desc = data.战局描述
    const serverRound = desc.当前回合
    const 战局状态 = desc.状态
    const settlementRound = Number(data?.最近结算回合号 ?? data?.回合信息?.回合数 ?? 0)

    if (战局状态 === '已结束') {
      const 战胜方 = desc.战胜方玩家名称
      if (!战胜方 && String(desc.结束原因 || '').includes('离线')) {
        leaveBattlePage()
        return
      }
      if (String(desc.结束原因 || '').includes('逃跑')) {
        if (String(desc.结束原因 || '').startsWith(battleStore.myUsername)) {
          leaveBattlePage()
          return
        }
        showBattleEnd(战胜方, desc.结束原因)
        return
      }
      playUnplayedSettlement(data, () => {
          showBattleEnd(战胜方, desc.结束原因)
      }).then((played) => {
        if (!played) showBattleEnd(战胜方, desc.结束原因)
      })
      return
    }

    if (战局状态 === '等待中') {
      return
    }

    if (settlementRound > lastPlayedSettlementRound && data.回合信息) {
      playUnplayedSettlement(data, () => {
        round.value = serverRound
        enterActingPhase()
      })
      return
    }

    round.value = serverRound
    lastPlayedSettlementRound = settlementRound
    updateCharsFromSnapshot()
    enterActingPhase()
  }

  function showBattleEnd(战胜方, 原因) {
  }

  async function 尝试重连战局() {
    pageActive = true
    const snap = battleStore.battleSnapshot
    if (!snap || !snap.战局描述) {
      leaveBattlePage()
      return
    }

    await 初始化战局()
  }

  async function 初始化战局() {
    battleState.syncCharactersFromSnapshot()
    const snap = battleStore.battleSnapshot
    if (!snap) return

    nextTick(() => {
      battleState.initBattleDrawing()
    })

    if (!globalPointerListenerBound) {
      window.addEventListener('pointerdown', battleActions.onGlobalPointerDown, true)
      globalPointerListenerBound = true
    }

    // 不要在这里设置 lastPlayedSettlementRound，否则 playUnplayedSettlement 不会执行
    // const settlementRound = Number(snap?.最近结算回合号 ?? snap?.回合信息?.回合数 ?? 0)
    // lastPlayedSettlementRound = settlementRound

    // handleStateData(snap)  这里不调用handleStateData，避免重复触发
    initialSyncPending = false
  }

  // 移除watch监听，BattlePageV2已经处理pk-push响应
  const stopWatch = null

  function setPageActive(active) {
    pageActive = active
    if (!active) {
      battleState.stopCountdown()
      battleActions.currentUnitKey.value = ''
      battleAnimation.animating.value = false
      if (globalPointerListenerBound) {
        window.removeEventListener('pointerdown', battleActions.onGlobalPointerDown, true)
        globalPointerListenerBound = false
      }
    }
  }

  return {
    eventKeyToPos,
    playEventAnimation,
    updateCharsFromSnapshot,
    updateCharsFromRoundInitial,
    enterActingPhase,
    playSettlement,
    handleStateData,
    showBattleEnd,
    尝试重连战局,
    初始化战局,
    setPageActive,
    stopWatch,
  }
}
