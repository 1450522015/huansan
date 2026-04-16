import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import * as battleRepo from '../repositories/battleRepo.js'
import * as userRepo from '../repositories/userRepo.js'
import { getDefaultConfig, normalizeConfigDeep } from '../services/defaultConfig.js'
import { computeAttrsFromConfig } from '../services/attrCalculator.js'
import * as battleEngine from '../services/battleEngine.js'

export const battleRouter = Router()

battleRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

battleRouter.use(authRequired)

function safeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return getDefaultConfig()
  }
  return normalizeConfigDeep(raw)
}

function canonicalBattleUnits(battle) {
  const starter = userRepo.findUserByUsername(battle.发起用户名)
  const target = userRepo.findUserByUsername(battle.目标用户名)
  if (!starter || !target) return null
  const starterSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.发起用户名)
  const targetSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.目标用户名)
  return battleEngine.buildRoundData(
    Number(battle.id),
    battle.发起用户名,
    battle.目标用户名,
    safeConfig(starterSnap ?? starter.配置),
    safeConfig(targetSnap ?? target.配置),
  )
}

battleRouter.get('/current', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })

    const battle = battleRepo.findUserActiveBattle(me.用户名) || battleRepo.findUserLatestBattle(me.用户名)
    if (!battle) return res.json({ 战局: null })

    const meIsStarter = battle.发起用户名 === me.用户名
    const enemyName = meIsStarter ? battle.目标用户名 : battle.发起用户名
    const enemy = userRepo.findUserByUsername(enemyName)
    if (!enemy) return res.json({ 战局: null })

    const meParsed = battleRepo.parseBattleSideConfigSnapshot(battle, me.用户名)
    const enemyParsed = battleRepo.parseBattleSideConfigSnapshot(battle, enemy.用户名)
    const meCfg = safeConfig(meParsed ?? me.配置)
    const enemyCfg = safeConfig(enemyParsed ?? enemy.配置)
    const meAttrs = computeAttrsFromConfig(meCfg)
    const enemyAttrs = computeAttrsFromConfig(enemyCfg)
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
      }
    }

    return res.json({
      战局: {
        id: battle.id,
        状态: battle.状态,
        备注: battle.备注 || null,
        当前回合: battle.当前回合 ?? 0,
        回合数: battle.回合数 ?? 0,
        /** 与 `battle_rounds.回合数` 列对齐，用于拉取「当前应展示的战况日志」行 */
        日志回合键: logRoundKey,
        /** 开战时是否已写入双方配置快照（战中改配不应影响本局属性来源） */
        配置已冻结: !!(battle.发起方配置快照 && battle.目标方配置快照),
        发起用户名: battle.发起用户名,
        目标用户名: battle.目标用户名,
      },
      我方: {
        用户名: me.用户名,
        配置: meCfg,
        属性: meAttrs,
      },
      敌方: {
        用户名: enemy.用户名,
        配置: enemyCfg,
        属性: enemyAttrs,
      },
      回合信息: roundInfo,
      单位状态,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '读取战局失败' })
  }
})

battleRouter.post('/round/start', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })

    const battle = battleRepo.findUserActiveBattle(me.用户名)
    if (!battle || battle.状态 !== '战局中') {
      return res.status(409).json({ 错误: '当前不在战局中' })
    }

    const newRoundNum = battleRepo.computePendingRoundNum(battle)
    const existingRound = battleEngine.getRoundData(Number(battle.id), newRoundNum)
    const canonical = canonicalBattleUnits(battle)
    if (!canonical) return res.status(404).json({ 错误: '对手不存在' })
    const { units } = canonical
    battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)
    if (existingRound) {
      return res.json({
        ok: true,
        回合数: newRoundNum,
        units,
        超时毫秒: battleEngine.getRoundTimeoutMs(),
      })
    }

    battleRepo.updateBattleStatus(battle.id, '战局中', {
      当前回合: newRoundNum,
      回合数: newRoundNum,
    })

    return res.json({
      ok: true,
      回合数: newRoundNum,
      units,
      超时毫秒: battleEngine.getRoundTimeoutMs(),
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '开始回合失败' })
  }
})

battleRouter.post('/actions/submit', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })

    const battle = battleRepo.findUserActiveBattle(me.用户名)
    if (!battle || battle.状态 !== '战局中') {
      return res.status(409).json({ 错误: '当前不在战局中' })
    }

    const { 回合数, 出招列表, 使用自动 } = req.body || {}
    if (!Array.isArray(出招列表)) {
      return res.status(400).json({ 错误: '出招列表格式错误' })
    }

    const roundNum = Number(回合数) || battleRepo.computePendingRoundNum(battle)
    const meIsStarter = battle.发起用户名 === me.用户名

    const canonical = canonicalBattleUnits(battle)
    if (!canonical) return res.status(404).json({ 错误: '对手不存在' })
    const { units } = canonical

    const starter = userRepo.findUserByUsername(battle.发起用户名)
    const target = userRepo.findUserByUsername(battle.目标用户名)
    const starterSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.发起用户名)
    const targetSnap = battleRepo.parseBattleSideConfigSnapshot(battle, battle.目标用户名)
    const selfCfg = safeConfig(starterSnap ?? starter?.配置)
    const enemyCfg = safeConfig(targetSnap ?? target?.配置)

    battleEngine.applyRuntimeStateAndRebuildRanks(Number(battle.id), units)
    let actions = 出招列表
    if (!meIsStarter) {
      actions = battleEngine.swapActionKeys(actions)
    }
    if (使用自动) {
      actions = battleEngine.fillAutoActions(actions, units)
    }

    const existingRound = battleEngine.getRoundData(Number(battle.id), roundNum)
    if (existingRound) {
      const updated = meIsStarter
        ? { ...existingRound, 发起方出招: actions }
        : { ...existingRound, 目标方出招: actions }

      getDb().prepare(
        `UPDATE battle_rounds SET 发起方出招 = ?, 目标方出招 = ? WHERE id = ?`
      ).run(JSON.stringify(updated.发起方出招), JSON.stringify(updated.目标方出招), existingRound.id)

      if (updated.发起方出招.length > 0 && updated.目标方出招.length > 0) {
        const 对方已提交 = meIsStarter
          ? updated.目标方出招.some(a => a.操作 !== null)
          : updated.发起方出招.some(a => a.操作 !== null)
        if (!对方已提交) {
          return res.json({ ok: true, 已提交: true, 双方就绪: false })
        }
        const result = battleEngine.resolveRound({ ...updated, selfCfg, enemyCfg }, units)
        const endCheck = battleEngine.checkBattleEnd(result.state, units)
        if (endCheck.结束) {
          battleEngine.clearRuntimeState(Number(battle.id))
          battleRepo.updateBattleStatus(battle.id, '已结束', {
            备注: endCheck.原因,
            回合数: roundNum,
            结束时间: new Date().toISOString(),
          })
        } else {
          const nextRound = roundNum + 1
          battleRepo.updateBattleStatus(battle.id, '战局中', {
            当前回合: nextRound,
            回合数: roundNum,
          })
        }

        getDb().prepare(
          `UPDATE battle_rounds SET 战斗日志 = ?, 战斗过程 = ? WHERE id = ?`
        ).run(JSON.stringify(result.日志), JSON.stringify(result.过程 || []), existingRound.id)

        let 胜利方用户名 = null
        if (endCheck.结束) {
          胜利方用户名 = endCheck.胜者 === '我方' ? battle.发起用户名 : battle.目标用户名
        }
        return res.json({
          ok: true,
          已提交: true,
          双方就绪: true,
          战斗日志: result.日志,
          战斗过程: result.过程 || [],
          单位状态: battleEngine.buildUnitStateList(units, result.state),
          战局结束: endCheck.结束,
          胜者: endCheck.胜者 || null,
          胜利方用户名,
          原因: endCheck.原因 || null,
          下一回合: endCheck.结束 ? null : roundNum + 1,
        })
      }

      return res.json({
        ok: true,
        已提交: true,
        双方就绪: false,
      })
    }

    const emptyStarterActions = battleEngine.createDefaultActions(true, units)
    const emptyTargetActions = battleEngine.createDefaultActions(false, units)
    const 发起方出招 = meIsStarter ? actions : emptyStarterActions
    const 目标方出招 = meIsStarter ? emptyTargetActions : actions

    battleEngine.saveRoundData(Number(battle.id), roundNum, 发起方出招, 目标方出招, [])

    return res.json({
      ok: true,
      已提交: true,
      双方就绪: false,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '提交出招失败' })
  }
})

battleRouter.post('/flee', (req, res) => {
  try {
    const me = userRepo.findUserById(req.userId)
    if (!me) return res.status(404).json({ 错误: '用户不存在' })

    const battle = battleRepo.findUserActiveBattle(me.用户名)
    if (!battle || battle.状态 !== '战局中') {
      return res.status(409).json({ 错误: '当前不在战局中' })
    }

    const 备注 = `${me.用户名}已逃跑`
    battleEngine.clearRuntimeState(Number(battle.id))
    battleRepo.updateBattleStatus(battle.id, '已结束', {
      备注,
      回合数: Number(battle.当前回合 || 0),
      结束时间: new Date().toISOString(),
    })
    return res.json({ ok: true, 状态: '已结束', 备注 })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ 错误: '逃跑失败' })
  }
})

import { getDb } from '../db/sqlite.js'
