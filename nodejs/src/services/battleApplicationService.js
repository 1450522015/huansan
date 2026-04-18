import * as battleRepo from '../repositories/battleRepo.js'
import * as userRepo from '../repositories/userRepo.js'
import * as battleEngine from './battleEngine.js'
import * as aiActionGenerator from './aiActionGenerator.js'
import * as aiOpponentRepo from '../repositories/aiOpponentRepo.js'
import { getDb } from '../db/sqlite.js'
import { getDefaultConfig, normalizeConfigDeep } from './defaultConfig.js'

function safeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return getDefaultConfig()
  return normalizeConfigDeep(raw)
}

function readBattleTextAccumulated(battle) {
  const a = battle?.战况文本系统累计
  return Array.isArray(a) ? [...a] : []
}

function appendResolvedRoundToBattleTextAccumulated(battle, roundNum, result, battleEnded) {
  const fresh = battleRepo.findBattleById(battle.id) || battle
  let lines = readBattleTextAccumulated(fresh)
  if (!lines.length && roundNum === 1 && result?.战况第一回合速度行) {
    lines = ['第1回合', result.战况第一回合速度行]
  }
  lines = [...lines, ...(result.战况行动系统 || [])]
  if (!battleEnded && Array.isArray(result.战况下一回合开场块) && result.战况下一回合开场块.length) {
    lines = [...lines, ...result.战况下一回合开场块]
  }
  battleRepo.setBattleTextAccumulated(battle.id, lines)
  return lines
}

function canonicalBattleUnits(battle) {
  const starter = userRepo.findUserByUsername(battle.发起用户名)
  if (!starter) return null
  const isAi = isAiBattle(battle)
  let targetCfg = null
  if (isAi) {
    const aiName = battle.目标用户名.replace('(电脑)', '')
    const ai = aiOpponentRepo.findAiOpponentByName(aiName)
    const targetSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.目标用户名)
    targetCfg = safeConfig(targetSnap ?? (ai?.配置 || {}))
  } else {
    const target = userRepo.findUserByUsername(battle.目标用户名)
    if (!target) return null
    const targetSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.目标用户名)
    targetCfg = safeConfig(targetSnap ?? target.配置)
  }
  const starterSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.发起用户名)
  const starterCfg = safeConfig(starterSnap ?? starter.配置)
  return battleEngine.buildRoundData(
    Number(battle.id),
    battle.发起用户名,
    battle.目标用户名,
    starterCfg,
    targetCfg,
  )
}

export function startRound(用户名) {
  const me = userRepo.findUserByUsername(用户名)
  if (!me) return { ok: false, code: 404, error: '用户不存在' }
  const battle = battleRepo.findUserActiveBattle(me.用户名)
  if (!battle || battle.状态 !== '战局中') return { ok: false, code: 409, error: '当前不在战局中' }
  const newRoundNum = battleRepo.computePendingRoundNum(battle)
  const existingRound = battleEngine.getRoundData(Number(battle.id), newRoundNum)
  const canonical = canonicalBattleUnits(battle)
  if (!canonical) return { ok: false, code: 404, error: '对手不存在' }
  const { units } = canonical
  const runtimeState = battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)
  if (newRoundNum === 1) {
    const b0 = battleRepo.findBattleById(battle.id)
    if (b0 && readBattleTextAccumulated(b0).length === 0) {
      const speedLine = `速度排名：${battleEngine.buildSpeedRankString(units, runtimeState, false)}`
      battleRepo.setBattleTextAccumulated(battle.id, ['第1回合', speedLine])
    }
  }
  if (!existingRound) {
    battleRepo.updateBattleStatus(battle.id, '战局中', {
      当前回合: newRoundNum,
      回合数: newRoundNum,
    })
  }
  const battleOut = battleRepo.findBattleById(battle.id) || battle
  return {
    ok: true,
    battle: battleOut,
    payload: {
      回合数: newRoundNum,
      units,
      超时毫秒: battleEngine.getRoundTimeoutMs(),
      服务器时间: Date.now(),
      发起用户名: battle.发起用户名,
      目标用户名: battle.目标用户名,
      战况文本系统累计: readBattleTextAccumulated(battleOut),
    },
  }
}

export function submitActions(用户名, data) {
  const me = userRepo.findUserByUsername(用户名)
  if (!me) return { ok: false, code: 404, error: '用户不存在' }
  const battle = battleRepo.findUserActiveBattle(me.用户名)
  if (!battle || battle.状态 !== '战局中') return { ok: false, code: 409, error: '当前不在战局中' }
  const { 回合数, 出招列表 } = data || {}
  if (!Array.isArray(出招列表)) return { ok: false, code: 400, error: '出招列表格式错误' }

  const roundNum = Number(回合数) || battleRepo.computePendingRoundNum(battle)
  const meIsStarter = battle.发起用户名 === me.用户名
  const canonical = canonicalBattleUnits(battle)
  if (!canonical) return { ok: false, code: 404, error: '对手不存在' }
  const { units } = canonical
  battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)

  const selfUnits = units.filter(u => u.isSelf)
  const enemyUnits = units.filter(u => !u.isSelf)
  const selfState = {
    cfg: canonical.selfCfg || null,
    runtime: Object.fromEntries(
      selfUnits.map(u => [u.key, { 气血: u.气血, 精力: u.精力, buff: u.buff || {} }])
    ),
    enemyVisible: enemyUnits.map(u => ({
      key: u.key,
      显示名: u.显示名,
      职业: u.职业,
      气血: u.气血,
      最大气血: u.最大气血,
      精力: u.精力,
      最大精力: u.最大精力,
      速度排名: u.排名,
      buff: u.buff || {},
      坐骑: u.坐骑,
    })),
  }
  const enemyState = {
    cfg: canonical.enemyCfg || null,
    runtime: Object.fromEntries(
      enemyUnits.map(u => [u.key, { 气血: u.气血, 精力: u.精力, buff: u.buff || {} }])
    ),
    enemyVisible: selfUnits.map(u => ({
      key: u.key,
      显示名: u.显示名,
      职业: u.职业,
      气血: u.气血,
      最大气血: u.最大气血,
      精力: u.精力,
      最大精力: u.最大精力,
      速度排名: u.排名,
      buff: u.buff || {},
      坐骑: u.坐骑,
    })),
  }

  let actions = 出招列表
  if (!meIsStarter) actions = battleEngine.swapActionKeys(actions)

  const existingRound = battleEngine.getRoundData(Number(battle.id), roundNum)
  if (!existingRound) {
    const emptyStarterActions = battleEngine.createDefaultActions(true, units)
    const emptyTargetActions = battleEngine.createDefaultActions(false, units)
    const 发起方出招 = meIsStarter ? actions : emptyStarterActions
    let 目标方出招 = meIsStarter ? emptyTargetActions : actions
    if (isAiBattle(battle) && meIsStarter) {
      const aiType = getAiTypeFromBattle(battle)
      目标方出招 = aiActionGenerator.generateAiActions(aiType, units, enemyState, false)
    }
    battleEngine.saveRoundData(Number(battle.id), roundNum, 发起方出招, 目标方出招, [])
    if (isAiBattle(battle) && meIsStarter) {
      return resolveAiRound(battle, roundNum, 发起方出招, 目标方出招, units, canonical)
    }
    return { ok: true, battle, payload: { ok: true, 双方就绪: false } }
  }

  const updated = meIsStarter
    ? { ...existingRound, 发起方出招: actions }
    : { ...existingRound, 目标方出招: actions }
  getDb().prepare(
    'UPDATE battle_rounds SET 发起方出招 = ?, 目标方出招 = ? WHERE id = ?',
  ).run(JSON.stringify(updated.发起方出招), JSON.stringify(updated.目标方出招), existingRound.id)

  if (!(updated.发起方出招.length > 0 && updated.目标方出招.length > 0)) {
    return { ok: true, battle, payload: { ok: true, 双方就绪: false } }
  }
  const 对方已提交 = meIsStarter
    ? updated.目标方出招.some((a) => a.操作 !== null)
    : updated.发起方出招.some((a) => a.操作 !== null)
  if (!对方已提交) {
    return { ok: true, battle, payload: { ok: true, 双方就绪: false } }
  }

  const result = battleEngine.resolveRound(
    {
      ...updated,
      battleId: Number(battle.id),
      回合数: roundNum,
      selfCfg: canonical.selfCfg || null,
      enemyCfg: canonical.enemyCfg || null,
    },
    units,
  )
  const endCheck = battleEngine.checkBattleEnd(result.state, units)
  let 胜利方用户名 = null
  if (endCheck.结束) {
    胜利方用户名 = endCheck.胜者 === '我方' ? battle.发起用户名 : battle.目标用户名
  }
  const 战况文本系统累计 = appendResolvedRoundToBattleTextAccumulated(battle, roundNum, result, endCheck.结束)
  const unitStateList = battleEngine.buildUnitStateList(units, result.state)
  const roundResultData = {
    发起用户名: battle.发起用户名,
    回合数: roundNum,
    战斗日志: result.日志,
    战斗过程: result.过程 || [],
    战况文本系统: 战况文本系统累计,
    战况文本系统本轮: result.战况文本系统 || [],
    战况文本用户: result.战况文本用户 || [],
    单位状态: unitStateList,
    战局结束: endCheck.结束,
    胜者: endCheck.胜者 || null,
    胜利方用户名,
    原因: endCheck.原因 || null,
    下一回合: endCheck.结束 ? null : roundNum + 1,
  }
  getDb()
    .prepare('UPDATE battle_rounds SET 战斗日志 = ?, 战斗过程 = ?, 战况文本用户 = ?, 完整结果 = ? WHERE id = ?')
    .run(
      JSON.stringify(result.日志),
      JSON.stringify(result.过程 || []),
      JSON.stringify(result.战况文本用户 || []),
      JSON.stringify(roundResultData),
      existingRound.id,
    )
  if (endCheck.结束) {
    battleEngine.clearRuntimeState(Number(battle.id))
    battleRepo.updateBattleStatus(battle.id, '已结束', {
      备注: endCheck.原因,
      回合数: roundNum,
      结束时间: new Date().toISOString(),
    })
  } else {
    battleRepo.updateBattleStatus(battle.id, '战局中', { 当前回合: roundNum + 1, 回合数: roundNum })
  }
  const battleAfter = battleRepo.findBattleById(battle.id) || battle
  return { ok: true, battle: battleAfter, payload: { ok: true, 双方就绪: true, ...roundResultData }, roundResultData }
}

export function fleeBattle(用户名) {
  const me = userRepo.findUserByUsername(用户名)
  if (!me) return { ok: false, code: 404, error: '用户不存在' }
  const battle = battleRepo.findUserActiveBattle(me.用户名)
  if (!battle || battle.状态 !== '战局中') return { ok: false, code: 409, error: '当前不在战局中' }
  const 备注 = `${me.用户名}已逃跑`
  battleRepo.setBattleTextAccumulated(battle.id, [])
  battleEngine.clearRuntimeState(Number(battle.id))
  battleRepo.updateBattleStatus(battle.id, '已结束', {
    备注,
    回合数: Number(battle.当前回合 || 0),
    结束时间: new Date().toISOString(),
  })
  return { ok: true, payload: { ok: true, 状态: '已结束', 备注 }, battle }
}

export function startAiBattle(用户名, 人机ID) {
  const me = userRepo.findUserByUsername(用户名)
  if (!me) return { ok: false, code: 404, error: '用户不存在' }
  const ai = aiOpponentRepo.findAiOpponentById(String(人机ID))
  if (!ai) return { ok: false, code: 404, error: '人机不存在' }
  if (battleRepo.findUserActiveBattle(用户名)) {
    return { ok: false, code: 409, error: '已有进行中的战局' }
  }
  const aiName = ai.名称 + '(电脑)'
  const battle = battleRepo.createBattle({ 发起用户名: 用户名, 目标用户名: aiName })
  const starterCfg = safeConfig(me.配置)
  const targetCfg = safeConfig(ai.配置)
  battleRepo.updateBattleStatus(battle.id, '战局中', {
    备注: null,
    当前回合: 1,
    回合数: 0,
    发起方配置快照: JSON.stringify(starterCfg),
    目标方配置快照: JSON.stringify(targetCfg),
  })
  const updated = battleRepo.findBattleById(battle.id)
  return { ok: true, battle: updated }
}

export function isAiBattle(battle) {
  return battle?.目标用户名?.endsWith('(电脑)') || false
}

export function getAiTypeFromBattle(battle) {
  if (!isAiBattle(battle)) return null
  const name = battle.目标用户名.replace('(电脑)', '')
  const ai = aiOpponentRepo.findAiOpponentByName(name)
  return ai?.类型 || null
}

function resolveAiRound(battle, roundNum, 发起方出招, 目标方出招, units, canonical) {
  const result = battleEngine.resolveRound(
    {
      battleId: Number(battle.id),
      回合数: roundNum,
      发起方出招,
      目标方出招,
      selfCfg: canonical.selfCfg || null,
      enemyCfg: canonical.enemyCfg || null,
    },
    units,
  )
  const endCheck = battleEngine.checkBattleEnd(result.state, units)
  let 胜利方用户名 = null
  if (endCheck.结束) {
    胜利方用户名 = endCheck.胜者 === '我方' ? battle.发起用户名 : battle.目标用户名
  }
  const 战况文本系统累计 = appendResolvedRoundToBattleTextAccumulated(battle, roundNum, result, endCheck.结束)
  const unitStateList = battleEngine.buildUnitStateList(units, result.state)
  const roundResultData = {
    发起用户名: battle.发起用户名,
    回合数: roundNum,
    战斗日志: result.日志,
    战斗过程: result.过程 || [],
    战况文本系统: 战况文本系统累计,
    战况文本系统本轮: result.战况文本系统 || [],
    战况文本用户: result.战况文本用户 || [],
    单位状态: unitStateList,
    战局结束: endCheck.结束,
    胜者: endCheck.胜者 || null,
    胜利方用户名,
    原因: endCheck.原因 || null,
    下一回合: endCheck.结束 ? null : roundNum + 1,
  }
  const existingRound = battleEngine.getRoundData(Number(battle.id), roundNum)
  if (existingRound) {
    getDb()
      .prepare('UPDATE battle_rounds SET 战斗日志 = ?, 战斗过程 = ?, 战况文本用户 = ?, 完整结果 = ? WHERE id = ?')
      .run(
        JSON.stringify(result.日志),
        JSON.stringify(result.过程 || []),
        JSON.stringify(result.战况文本用户 || []),
        JSON.stringify(roundResultData),
        existingRound.id,
      )
  }
  if (endCheck.结束) {
    battleEngine.clearRuntimeState(Number(battle.id))
    battleRepo.updateBattleStatus(battle.id, '已结束', {
      备注: endCheck.原因,
      回合数: roundNum,
      结束时间: new Date().toISOString(),
    })
  } else {
    battleRepo.updateBattleStatus(battle.id, '战局中', { 当前回合: roundNum + 1, 回合数: roundNum })
  }
  const battleAfter = battleRepo.findBattleById(battle.id) || battle
  return { ok: true, battle: battleAfter, payload: { ok: true, 双方就绪: true, ...roundResultData }, roundResultData }
}
