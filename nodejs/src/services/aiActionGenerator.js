import { 技能定义 } from './battleEngine.js'
import { computeAttrsFromConfig } from '../../../common/attrCalculator.js'

const 技能档位顺序 = ['1', '2', '3', '4', '5', '化境1', '化境2', '化境3', '化境极']

function clamp熟练度(等级, v) {
  const rangeMap = {
    '1级': 6000, '2级': 12000, '3级': 18000, '4级': 24000, '5级': 30000,
    '化境1': 20000, '化境2': 20000, '化境3': 20000, '化境极': 50000,
  }
  const max = rangeMap[等级] || 50000
  return Math.max(0, Math.min(v, max))
}

function getSkillSlot(caster, skillName) {
  const list = Array.isArray(caster?.技能列表) ? caster.技能列表 : []
  const item = list.find((s) => String(s?.名称 || '').trim() === skillName) || {}
  const 等级 = 技能档位顺序.includes(String(item?.等级 || '')) ? String(item.等级) : '化境极'
  const 熟练度 = clamp熟练度(等级, Number(item?.熟练度 ?? 0))
  return { 名称: skillName, 等级, 熟练度 }
}

export function generateAiActions(类型, units, state, isStarter) {
  if (类型 === '木桩') {
    return generateDummyActions(units, isStarter)
  }
  return generateMasterActions(units, state, isStarter)
}

function generateDummyActions(units, isStarter) {
  const prefix = isStarter ? 'self' : 'enemy'
  const alive = units.filter(u => u.key.startsWith(prefix + ':') && u.气血 > 0)
  const enemyPrefix = isStarter ? 'enemy' : 'self'
  const enemies = units.filter(u => u.key.startsWith(enemyPrefix + ':') && u.气血 > 0)
  if (!enemies.length) {
    return alive.map(u => ({ unitKey: u.key, 操作: '防御', 目标: null, 技能: null, 物品: null, 招将: null, 招将槽位: null }))
  }
  const fastest = [...enemies].sort((a, b) => (b.速度 ?? 0) - (a.速度 ?? 0))[0]
  return alive.map(u => ({ unitKey: u.key, 操作: '攻击', 目标: fastest.key, 技能: null, 物品: null, 招将: null, 招将槽位: null }))
}

function getUnitByKey(units, key) {
  return units.find(u => u.key === key)
}

function getAliveUnits(units, prefix) {
  return units.filter(u => u.key.startsWith(prefix + ':') && u.气血 > 0)
}

function hasDebuff(unit, buffNames) {
  const buff = unit.buff || {}
  return buffNames.some(b => buff[b] && buff[b].剩余回合 > 0)
}

function getSkillMpCost(name, 技能项) {
  const def = 技能定义[name]
  if (!def || !技能项) return Infinity
  const { 等级, 熟练度 } = 技能项
  const { 等级: tier, 起, 止 } = def.消耗表.find(s => s.等级 === 等级) || {}
  if (tier == null) return Infinity
  const t = Math.max(0, Math.min(1, (熟练度 - 起) / (止 - 起)))
  return Math.round(起 + (止 - 起) * t)
}

function getSkillTargetCount(name, unit, 技能项) {
  if (!技能项) return 1
  const base = 技能定义[name]?.目标数 || 1
  if (name === '画地为牢' && unit.isMain && 技能项?.等级 === '化境极') return 4
  return base
}

function buildSelfAttrMap(selfCfg) {
  if (!selfCfg) return {}
  const attrs = computeAttrsFromConfig(selfCfg)
  const map = {}
  for (const [key, attr] of Object.entries(attrs)) {
    if (key === '主将' || key.startsWith('副将')) {
      map[key] = attr
    }
  }
  return map
}

function estimateEnemyAttrs(unit) {
  const 职业 = unit.职业 || ''
  let 抗物理 = 30, 抗玄击 = 30, 抗风沙 = 30, 抗妖火 = 30, 抗落雷 = 30, 抗毒术 = 30, 抗围困 = 30, 抗扰乱 = 30, 抗封锁 = 30
  let 防御 = 500, 战斗防御 = 500
  if (职业 === '武人') { 抗物理 = 80; 防御 = 2000 }
  else if (职业 === '文人') { 抗围困 = 80; 抗扰乱 = 80; 抗封锁 = 80 }
  else if (职业 === '异人') { 抗风沙 = 80; 抗妖火 = 80; 抗落雷 = 80; 抗毒术 = 80 }
  const hpRatio = unit.气血 / Math.max(1, unit.最大气血 || unit.气血)
  if (hpRatio < 0.3) {
    防御 *= 0.5; 抗物理 *= 0.7
  }
  return {
    抗物理: 抗物理 + (unit.buff?.固?.衰减 || 0),
    抗玄击: 抗玄击 + (unit.buff?.固?.衰减 || 0),
    抗风沙: 抗风沙 + (unit.buff?.固?.衰减 || 0),
    抗妖火: 抗妖火 + (unit.buff?.固?.衰减 || 0),
    抗落雷: 抗落雷 + (unit.buff?.固?.衰减 || 0),
    抗毒术: 抗毒术 + (unit.buff?.固?.衰减 || 0),
    抗围困: 抗围困 + (unit.buff?.固?.衰减 || 0),
    抗扰乱: 抗扰乱 + (unit.buff?.固?.衰减 || 0),
    抗封锁: 抗封锁 + (unit.buff?.固?.衰减 || 0),
    防御, 战斗防御: 战斗防御,
    气血: unit.气血,
    最大气血: unit.最大气血 || unit.气血,
  }
}

function estimateDamage(skillName, caster, target, casterFull, targetEstimated) {
  const 技能项 = getSkillSlot(caster, skillName)
  const def = 技能定义[skillName]
  if (!def || !技能项) return 0
  const tier = 技能项.等级
  const 熟练度 = 技能项.熟练度 || 0
  const table = def.成长表
  if (!table) return 0
  const seg = table.find(s => s.等级 === tier)
  if (!seg) return 0
  const t = Math.max(0, Math.min(1, (熟练度 - seg.熟练度起) / (seg.熟练度止 - seg.熟练度起)))
  const shenRatio = casterFull.神将技增幅比例 || 0
  const 天赋Ratio = (casterFull.天赋技能效果?.[def.天赋Key] || 0) / 100
  const mountRatio = casterFull.坐骑增幅比例 || 0

  if (def.名称 === '舍命一击') {
    const baseDmg = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const atk = casterFull.战斗攻击 || 0
    const 穿透率 = casterFull.穿透率 || 0
    const effRes = Math.max(0, Math.min(100, (targetEstimated.抗物理 || 0) - 穿透率))
    const 面板 = (baseDmg + atk * 0.5) * (1 + 天赋Ratio) * (1 + shenRatio) + atk * 天赋Ratio * (1 + (casterFull.强攻天赋增幅 || 0) / 100)
    return Math.max(1, Math.round(面板 * (1 - effRes / 100)))
  }
  if (def.名称 === '力劈华山') {
    const pct = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const extra = seg.固定伤害值 || 0
    const 抗玄击 = targetEstimated.抗玄击 || 0
    const raw = (targetEstimated.气血 * pct / 100 + extra) * (1 + 天赋Ratio) * (1 + shenRatio) * (1 + mountRatio)
    return Math.max(1, Math.round(raw * (1 - 抗玄击 / 100)))
  }
  if (def.名称 === '排山倒海') {
    const pct = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const extra = seg.固定伤害值 || 0
    const 抗玄击 = targetEstimated.抗玄击 || 0
    const raw = (targetEstimated.气血 * pct / 100 + extra) * (1 + 天赋Ratio) * (1 + shenRatio) * (1 + mountRatio)
    return Math.max(1, Math.round(raw * (1 - 抗玄击 / 100)))
  }
  if (def.名称 === '呼风唤雨' || def.名称 === '妖火燎原') {
    const baseDmg = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const fyRatio = casterFull.风火天赋增幅 || 0
    const fshangRatio = casterFull.法伤力 || 0
    const f穿透率 = casterFull.法穿率 || 0
    const 抗性 = def.名称 === '呼风唤雨' ? targetEstimated.抗风沙 : targetEstimated.抗妖火
    const effRes = Math.max(0, Math.min(100, 抗性 - f穿透率))
    const raw = baseDmg * (1 + fyRatio + fshangRatio / 100) * (1 + shenRatio)
    return Math.max(1, Math.round(raw * (1 - effRes / 100)))
  }
  if (def.名称 === '五雷轰顶') {
    const baseDmg = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const llRatio = casterFull.落雷天赋增幅 || 0
    const fshangRatio = casterFull.法伤力 || 0
    const f穿透率 = casterFull.法穿率 || 0
    const effRes = Math.max(0, Math.min(100, (targetEstimated.抗落雷 || 0) - f穿透率))
    const raw = baseDmg * (1 + llRatio + fshangRatio / 100) * (1 + shenRatio)
    return Math.max(1, Math.round(raw * (1 - effRes / 100)))
  }
  if (def.名称 === '巫蛊极毒') {
    const baseDmg = seg.熟练度起 + (seg.熟练度止 - seg.熟练度起) * t
    const dsRatio = casterFull.毒术天赋增幅 || 0
    const fshangRatio = casterFull.法伤力 || 0
    const f穿透率 = casterFull.法穿率 || 0
    const effRes = Math.max(0, Math.min(100, (targetEstimated.抗毒术 || 0) - f穿透率))
    const raw = baseDmg * (1 + dsRatio + fshangRatio / 100) * (1 + shenRatio)
    return Math.max(1, Math.round(raw * (1 - effRes / 100)))
  }
  return 0
}

function scoreAction(unit, action, allUnits, selfCfg, selfState, enemyVisible, context) {
  let score = 0
  const { turn, phase } = context
  const hpRatio = unit.气血 / Math.max(1, unit.最大气血 || unit.气血)
  const mpRatio = unit.精力 / Math.max(1, unit.最大精力 || unit.精力)
  const selfKey = unit.key
  const selfFull = selfCfg ? (computeAttrsFromConfig(selfCfg)[selfKey.replace(/^self:/, '').replace(/^enemy:/, '')] || {}) : {}

  if (action.操作 === '攻击') {
    const target = getUnitByKey(allUnits, action.目标)
    if (target) {
      const targetHpRatio = target.气血 / Math.max(1, target.最大气血 || target.气血)
      const estimated = estimateEnemyAttrs(target)
      const dmg = estimateDamage('舍命一击', unit, target, selfFull, estimated)
      const canKill = dmg >= target.气血
      if (canKill) score += 50
      else if (dmg >= target.气血 * 0.7) score += 30
      else if (dmg >= target.气血 * 0.4) score += 15
      if (targetHpRatio < 0.3) score += 20
      score += (1 - targetHpRatio) * 10
      if (hasDebuff(target, ['围', '乱', '封'])) score += 5
    }
  } else if (action.操作 === '技能') {
    const skillName = action.技能
    if (skillName === '金蝉脱壳') {
      const selfAlive = getAliveUnits(allUnits, selfKey.split(':')[0])
      const trapped = selfAlive.filter(u => hasDebuff(u, ['围', '乱', '封']))
      score += trapped.length * 25
      if (hpRatio < 0.4) score += 10
    } else if (skillName === '暗渡陈仓') {
      score += 10
      if (hpRatio < 0.3) score += 15
    } else if (skillName === '凌波微步') {
      score += 15
    } else if (skillName === '固若金汤') {
      score += 15
    } else if (skillName === '画地为牢' || skillName === '趁火打劫' || skillName === '四面楚歌') {
      const target = getUnitByKey(allUnits, action.目标)
      if (target) {
        const controlled = hasDebuff(target, ['围', '乱', '封'])
        if (controlled) score -= 20
        const alive = getAliveUnits(allUnits, unit.key.split(':')[0])
        const fastestAlly = [...alive].sort((a, b) => (b.速度 || 0) - (a.速度 || 0))[0]
        if (fastestAlly?.key === unit.key) score += 20
        score += 15
      }
    } else if (skillName === '舍命一击') {
      const target = getUnitByKey(allUnits, action.目标)
      if (target) {
        const 技能项 = getSkillSlot(unit, skillName)
        const 耗精 = getSkillMpCost(skillName, 技能项)
        if (mpRatio < 0.2) score -= 30
        if (hpRatio < 0.4) score -= 20
        const estimated = estimateEnemyAttrs(target)
        const dmg = estimateDamage(skillName, unit, target, selfFull, estimated)
        if (dmg >= target.气血) score += 60
        else if (dmg >= target.气血 * 0.6) score += 30
        else score += dmg / 100
        if (hpRatio < 0.5) score -= 15
      }
    } else if (skillName === '巫蛊极毒') {
      score += 20
      if (hpRatio < 0.5) score -= 10
    } else {
      score += 10
    }
  } else if (action.操作 === '防御') {
    score += (1 - hpRatio) * 8
  } else if (action.操作 === '物品') {
    score += 15
  } else if (action.操作 === '招将') {
    score += 10
  }

  if (phase === 'early' && turn <= 2) {
    score += unit.气血 > 0 ? 5 : 0
  } else if (phase === 'mid' && turn <= 5) {
    if (hpRatio < 0.5) score += 10
  } else {
    if (hpRatio < 0.6) score += 15
  }

  return score
}

function generateActionForUnit(unit, allUnits, selfCfg, selfState, enemyVisible, context) {
  const hpRatio = unit.气血 / Math.max(1, unit.最大气血 || unit.气血)
  const mpRatio = unit.精力 / Math.max(1, unit.最大精力 || unit.精力)
  const selfPrefix = unit.key.split(':')[0]
  const enemyPrefix = unit.key.startsWith('self:') ? 'enemy' : 'self'
  const selfAlive = getAliveUnits(allUnits, selfPrefix)
  const enemies = getAliveUnits(allUnits, enemyPrefix)
  const selfKey = unit.key.replace(/^self:/, '').replace(/^enemy:/, '')
  const selfFull = selfCfg ? (computeAttrsFromConfig(selfCfg)[selfKey] || {}) : {}

  if (hpRatio >= 0.9 && mpRatio >= 0.7) context.phase = 'early'
  else if (hpRatio >= 0.4) context.phase = 'mid'
  else context.phase = 'late'

  const possible = []

  for (const enemy of enemies) {
    if (enemy.气血 <= 0) continue
    possible.push({ 操作: '攻击', 目标: enemy.key, 技能: null, 物品: null, 招将: null, 招将槽位: null })
  }

  const aliveSelf = getAliveUnits(allUnits, selfPrefix)
  const trappedSelf = aliveSelf.filter(u => hasDebuff(u, ['围', '乱', '封']))
  if (trappedSelf.length > 0 && mpRatio >= 0.2) {
    const savedSkills = ['金蝉脱壳']
    const unitSkills = getUnitSkills(unit)
    for (const sk of unitSkills) {
      if (savedSkills.includes(sk.名称)) {
        const def = 技能定义[sk.名称]
        if (!def) continue
        const 耗精 = getSkillMpCost(sk.名称, sk)
        if (mpRatio >= 0.3 || 耗精 <= unit.精力) {
          for (const target of trappedSelf) {
            possible.push({ 操作: '技能', 技能: sk.名称, 目标: target.key, 物品: null, 招将: null, 招将槽位: null })
          }
        }
      }
    }
  }

  const controlSkills = ['画地为牢', '趁火打劫', '四面楚歌']
  const unitSkills = getUnitSkills(unit)
  for (const sk of unitSkills) {
    if (!sk || !sk.名称) continue
    const def = 技能定义[sk.名称]
    if (!def) continue
    const 耗精 = getSkillMpCost(sk.名称, sk)
    if (耗精 > unit.精力) continue
    if (sk.名称 === '舍命一击') {
      if (hpRatio < 0.2) continue
      const 技能项 = getSkillSlot(unit, sk.名称)
      const 自损 = Math.max(0, Math.round((def.成长表.find(s => s.等级 === 技能项?.等级) || {}).熟练度起 || 0))
      if (hpRatio - 自损 / (unit.最大气血 || 1) < 0.15) continue
      for (const enemy of enemies) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: enemy.key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (controlSkills.includes(sk.名称)) {
      const count = getSkillTargetCount(sk.名称, unit, sk)
      const sorted = [...enemies].sort((a, b) => (b.速度 || 0) - (a.速度 || 0))
      const targets = sorted.slice(0, count)
      if (targets.length > 0) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: targets[0].key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (['呼风唤雨', '妖火燎原'].includes(sk.名称)) {
      const count = getSkillTargetCount(sk.名称, unit, sk)
      const sorted = [...enemies].sort((a, b) => (b.速度 || 0) - (a.速度 || 0))
      const targets = sorted.slice(0, count)
      if (targets.length > 0) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: targets[0].key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (sk.名称 === '五雷轰顶') {
      const sorted = [...enemies].sort((a, b) => b.气血 - a.气血)
      if (sorted.length > 0) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: sorted[0].key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (sk.名称 === '巫蛊极毒') {
      const count = getSkillTargetCount(sk.名称, unit, sk)
      const sorted = [...enemies].sort((a, b) => b.气血 - a.气血)
      const targets = sorted.slice(0, count)
      if (targets.length > 0) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: targets[0].key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (sk.名称 === '固若金汤' || sk.名称 === '凌波微步') {
      possible.push({ 操作: '技能', 技能: sk.名称, 目标: unit.key, 物品: null, 招将: null, 招将槽位: null })
    } else if (sk.名称 === '暗渡陈仓') {
      const sorted = [...enemies].sort((a, b) => (b.速度 || 0) - (a.速度 || 0))
      const fastest = sorted[0]
      if (fastest) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: fastest.key, 物品: null, 招将: null, 招将槽位: null })
      }
    } else if (sk.名称 === '金蝉脱壳') {
      for (const ally of aliveSelf) {
        possible.push({ 操作: '技能', 技能: sk.名称, 目标: ally.key, 物品: null, 招将: null, 招将槽位: null })
      }
    }
  }

  const useItem = Math.random() < 0.3
  if (useItem) {
    const itemChoices = ['龙涎露', '九转丹']
    for (const item of itemChoices) {
      for (const ally of aliveSelf) {
        if (item === '龙涎露' && ally.精力 < (ally.最大精力 || ally.精力)) {
          possible.push({ 操作: '物品', 物品: item, 目标: ally.key, 技能: null, 招将: null, 招将槽位: null })
        } else if (item === '九转丹' && ally.气血 < (ally.最大气血 || ally.气血)) {
          possible.push({ 操作: '物品', 物品: item, 目标: ally.key, 技能: null, 招将: null, 招将槽位: null })
        }
      }
    }
  }

  if (!possible.length) {
    return { unitKey: unit.key, 操作: '防御', 目标: null, 技能: null, 物品: null, 招将: null, 招将槽位: null }
  }

  const selfAliveCount = aliveSelf.length
  const enemyAliveCount = enemies.length

  let strategy = '均衡'
  const roll = Math.random()
  if (selfAliveCount > enemyAliveCount && hpRatio > 0.6) {
    strategy = roll < 0.4 ? '积极' : roll < 0.7 ? '均衡' : '保守'
  } else if (selfAliveCount < enemyAliveCount || hpRatio < 0.3) {
    strategy = roll < 0.4 ? '保守' : roll < 0.7 ? '均衡' : '积极'
  } else {
    strategy = roll < 0.3 ? '积极' : roll < 0.6 ? '均衡' : '保守'
  }

  const scored = possible.map(a => ({ ...a, score: scoreAction(unit, a, allUnits, selfCfg, selfState, enemyVisible, context) }))

  let top
  if (strategy === '积极') {
    top = scored.filter(a => a.score >= 20).sort((a, b) => b.score - a.score)
  } else if (strategy === '保守') {
    top = scored.filter(a => a.score >= 10 || a.操作 === '防御').sort((a, b) => b.score - a.score)
  } else {
    top = scored.sort((a, b) => b.score - a.score)
  }

  if (top.length > 1 && Math.random() < 0.25) {
    const top2 = top.slice(0, Math.min(3, top.length))
    top2.sort(() => Math.random() - 0.5)
    return { unitKey: unit.key, ...top2[0] }
  }

  return { unitKey: unit.key, ...top[0] }
}

function getUnitSkills(unit) {
  const result = []
  for (let i = 1; i <= 4; i++) {
    const slot = unit[`技能${i}`]
    if (slot && slot.名称) {
      result.push(slot)
    }
  }
  return result
}

function generateMasterActions(units, state, isStarter) {
  const prefix = isStarter ? 'self' : 'enemy'
  const alive = units.filter(u => u.key.startsWith(prefix + ':') && u.气血 > 0)
  if (!alive.length) return []

  const selfCfg = state?.cfg || null
  const context = { turn: 1, phase: 'early' }

  return alive.map(u => generateActionForUnit(u, units, selfCfg, state, state?.enemyVisible || [], context))
}
