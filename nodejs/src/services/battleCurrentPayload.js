/**
 * 与 `GET /api/battle/current` 返回体（战局非 null 时）同结构的快照构建。
 * 「我方」始终对应传入的 `viewerUsername`（须为本战局发起方或目标方之一）。
 */
import * as userRepo from '../repositories/userRepo.js'
import * as battleRepo from '../repositories/battleRepo.js'
import * as aiOpponentRepo from '../repositories/aiOpponentRepo.js'
import { getDefaultConfig, normalizeConfigDeep } from './defaultConfig.js'
import { computeAttrsFromConfig } from './attrCalculator.js'
import * as battleEngine from './battleEngine.js'
import * as battleApp from './battleApplicationService.js'

function safeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return getDefaultConfig()
  }
  return normalizeConfigDeep(raw)
}

function canonicalBattleUnits(battle) {
  const starter = userRepo.findUserByUsername(battle.发起用户名)
  if (!starter) return null
  const isAi = battleApp.isAiBattle(battle)
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

/**
 * @param {object} battle — `battleRepo.findBattleById` 行
 * @param {string} viewerUsername — 战局发起方或目标方登录名
 * @returns {object|null} — 与 mobile `lastBattleSnapshot`（有战局时）同键；无法解析敌方真实用户时返回 null
 */
export function buildBattleCurrentSnapshot(battle, viewerUsername) {
  if (!battle || !viewerUsername) return null
  if (viewerUsername !== battle.发起用户名 && viewerUsername !== battle.目标用户名) {
    return null
  }

  const me = userRepo.findUserByUsername(viewerUsername)
  if (!me) return null

  const meIsStarter = battle.发起用户名 === me.用户名
  const enemyName = meIsStarter ? battle.目标用户名 : battle.发起用户名
  const isAi = battleApp.isAiBattle(battle)
  const meParsed = battleRepo.parseBattleSideConfigSnapshot(battle, me.用户名)
  const meCfg = safeConfig(meParsed ?? me.配置)
  const meAttrs = computeAttrsFromConfig(meCfg)
  let enemyCfg = null
  let enemyAttrs = null
  if (isAi) {
    const aiName = enemyName.replace('(电脑)', '')
    const ai = aiOpponentRepo.findAiOpponentByName(aiName)
    const enemySnap = battleRepo.parseBattleSideConfigSnapshot(battle, enemyName)
    enemyCfg = safeConfig(enemySnap ?? (ai?.配置 || {}))
    enemyAttrs = computeAttrsFromConfig(enemyCfg)
  } else {
    const enemy = userRepo.findUserByUsername(enemyName)
    if (!enemy) return null
    const enemySnap = battleRepo.parseBattleSideConfigSnapshot(battle, enemy.用户名)
    enemyCfg = safeConfig(enemySnap ?? enemy.配置)
    enemyAttrs = computeAttrsFromConfig(enemyCfg)
  }

  const canonical = canonicalBattleUnits(battle)
  let 单位状态 = []
  if (canonical?.units?.length) {
    const runtime = battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), canonical.units)
    单位状态 = battleEngine.buildUnitStateList(canonical.units, runtime)
  }

  const logRoundKey = battleRepo.getBattleRoundRowKeyForLog(battle)
  const roundData = battleEngine.getRoundData(Number(battle.id), logRoundKey)
  let roundInfo = null
  if (roundData) {
    roundInfo = {
      回合数: roundData.回合数,
      发起方出招: roundData.发起方出招,
      目标方出招: roundData.目标方出招,
      战斗日志: roundData.战斗日志,
      战况文本用户: Array.isArray(roundData.战况文本用户) ? roundData.战况文本用户 : [],
    }
  }

  return {
    战局: {
      id: battle.id,
      状态: battle.状态,
      备注: battle.备注 || null,
      当前回合: battle.当前回合 ?? 0,
      回合数: battle.回合数 ?? 0,
      日志回合键: logRoundKey,
      配置已冻结: !!(battle.发起方配置快照 && battle.目标方配置快照),
      发起用户名: battle.发起用户名,
      目标用户名: battle.目标用户名,
      战况文本系统累计: Array.isArray(battle.战况文本系统累计) ? battle.战况文本系统累计 : [],
    },
    我方: {
      用户名: me.用户名,
      配置: meCfg,
      属性: meAttrs,
    },
    敌方: {
      用户名: enemyName,
      配置: enemyCfg,
      属性: enemyAttrs,
    },
    回合信息: roundInfo,
    单位状态,
  }
}
