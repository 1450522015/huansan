import { getDb } from '../db/sqlite.js'
import { computeAttrsFromConfig, computeAttrsFromConfig无双 } from './attrCalculator.js'
import { clamp熟练度到档位, 计算神将技增幅, 无双几率, format副将显示名 } from '../../../common/gameCatalog.js'

/** 与 `common/gameCatalog` 中九类百分比/控制技能一致：效果值保留一位小数 */
function roundSkillEffect1(n) {
  return Math.round(Number(n) * 10) / 10
}

function 显示技能名(name, caster) {
  if (!name || !caster?.神将技) return name
  return name === caster.神将技 ? name + '(神)' : name
}

const 速度差距阈值 = 20
/** 调试：拉长回合超时，避免开发时被倒计时打断 */
const 回合超时秒 = 9999
const 战局运行态 = new Map()

export function calcSpeedRank(速度列表) {
  const units = 速度列表.map((v, i) => ({ index: i, speed: Number(v) || 0 }))
  // 文档规则：按速度从小到大；当差值在 [-20, 20] 内时，引入“排名更高概率”线性随机
  for (let pass = 0; pass < units.length; pass++) {
    for (let i = 0; i < units.length - 1; i++) {
      const a = units[i]
      const b = units[i + 1]
      const diff = a.speed - b.speed
      let aAheadProb = 0
      if (diff <= -速度差距阈值) aAheadProb = 0
      else if (diff >= 速度差距阈值) aAheadProb = 1
      else aAheadProb = (diff + 速度差距阈值) / (2 * 速度差距阈值)
      // 当前数组是「慢→快」排序，若 a 应排在 b 前面（更快）则交换
      if (Math.random() < aAheadProb) {
        units[i] = b
        units[i + 1] = a
      }
    }
  }
  /** 速 1 = 最快：排序后数组为「慢→快」，故给末尾（最快）赋排名 1 */
  const n = units.length
  const rankMap = new Array(速度列表.length)
  for (let r = 0; r < n; r++) {
    rankMap[units[r].index] = n - r
  }
  return rankMap
}

function ensureRuntimeState(battleId, units) {
  const id = String(battleId)
  let s = 战局运行态.get(id)
  if (!s) {
    s = {}
    for (const u of units) {
      s[u.key] = {
        气血: u.气血,
        精力: u.精力,
        死亡: u.气血 <= 0,
        buff: {},
        显示名: String(u.显示名 || ''),
        无双剩余回合: 0,
        无双跳过本回合: false,
        无双已触发次数: 0,
        无双计数名: String(u.显示名 || ''),
      }
    }
    战局运行态.set(id, s)
  }
  return s
}

export function clearRuntimeState(battleId) {
  战局运行态.delete(String(battleId))
}

export function commitRuntimeState(battleId, state) {
  if (!battleId || !state || typeof state !== 'object') return
  const next = {}
  for (const [k, v] of Object.entries(state)) {
    next[k] = {
      气血: Math.max(0, Math.round(Number(v?.气血) || 0)),
      精力: Math.max(0, Math.round(Number(v?.精力) || 0)),
      死亡: !!v?.死亡 || Math.max(0, Math.round(Number(v?.气血) || 0)) <= 0,
      buff: normalizeBuffState(v?.buff),
      显示名: String(v?.显示名 || ''),
      无双剩余回合: Math.max(0, Math.round(Number(v?.无双剩余回合) || 0)),
      无双跳过本回合: !!v?.无双跳过本回合,
      无双已触发次数: Math.max(0, Math.round(Number(v?.无双已触发次数) || 0)),
      无双计数名: String(v?.无双计数名 || ''),
    }
  }
  战局运行态.set(String(battleId), next)
}

function recomputeRoundRanks(units, state) {
  const active = units.filter((u) => {
    const hp = Math.max(0, Math.round(Number(state[u.key]?.气血 ?? u.气血) || 0))
    if (u.isMain) return true
    return hp > 0
  })
  const speedList = active.map((u) => getEffectiveSpeed(u, state))
  const ranks = calcSpeedRank(speedList)
  const rankMap = new Map()
  for (let i = 0; i < active.length; i++) {
    rankMap.set(active[i].key, ranks[i])
  }
  for (const u of units) {
    // 不在场副将给一个较后序排名，防止被自动目标选中
    u.排名 = rankMap.get(u.key) ?? 999
  }
}

function processMountEndOfRound(state, roundUnits) {
  const 日志 = []
  const 过程 = []
  for (const u of roundUnits) {
    if (!u.isMain) continue
    if (String(u.坐骑?.种类 || '') !== '木牛流马') continue
    const st = state[u.key]
    if (!st || st.死亡) continue
    const level = Math.max(0, Number(u.坐骑?.等级) || 0)
    if (level <= 0) continue
    const maxHp = Math.max(1, Math.round(Number(u.最大气血) || 1))
    const maxMp = Math.max(1, Math.round(Number(u.最大精力) || 1))
    const curHp = Math.max(0, Math.round(Number(st.气血) || 0))
    const curMp = Math.max(0, Math.round(Number(st.精力) || 0))
    const hpRatio = curHp / maxHp
    const mpRatio = curMp / maxMp
    const healHp = Math.round(maxHp * 0.001 * level)
    const healMp = Math.round(maxMp * 0.001 * level)
    let healType = null
    let healAmount = 0
    if (hpRatio <= mpRatio) {
      healType = 'hp'
      healAmount = Math.min(healHp, maxHp - curHp)
    } else {
      healType = 'mp'
      healAmount = Math.min(healMp, maxMp - curMp)
    }
    if (healAmount <= 0) continue
    if (healType === 'hp') {
      st.气血 = Math.min(maxHp, curHp + healAmount)
      日志.push(`${u.用户名}-${u.显示名}的木牛流马回复了${healAmount}点气血`)
      过程.push({ type: 'mount-heal', targetKey: u.key, targetName: `${u.用户名}-${u.显示名}`, healType: 'hp', amount: healAmount })
    } else {
      st.精力 = Math.min(maxMp, curMp + healAmount)
      日志.push(`${u.用户名}-${u.显示名}的木牛流马回复了${healAmount}点精力`)
      过程.push({ type: 'mount-heal', targetKey: u.key, targetName: `${u.用户名}-${u.显示名}`, healType: 'mp', amount: healAmount })
    }
  }
  return { 日志, 过程 }
}

function processMusou(state, roundUnits, 回合数) {
  const 日志 = []
  const 过程 = []
  if (回合数 <= 1) return { 日志, 过程 }
  const pendingMusou = []
  for (const u of roundUnits) {
    if (u.isMain) continue
    const st = state[u.key]
    if (!st || st.死亡) continue
    if (st.无双剩余回合 > 0) {
      st.无双剩余回合--
      if (st.无双剩余回合 <= 0) {
        const oldMaxHp = u.最大气血
        const oldMaxMp = u.最大精力
        u.最大气血 = Math.max(1, Math.round(Number(u.原始最大气血) || 1))
        u.最大精力 = Math.max(1, Math.round(Number(u.原始最大精力) || 1))
        u.战斗攻击 = Math.max(0, Math.round(Number(u.原始攻击) || 0))
        u.速度 = Math.max(0, Math.round(Number(u.原始速度) || 0))
        st.无双跳过本回合 = true
        日志.push(`${u.用户名}-${u.显示名}的无双形态结束`)
        过程.push({
          type: 'musou-end',
          targetKey: u.key,
          targetName: `${u.用户名}-${u.显示名}`,
          newMaxHp: u.最大气血,
          newMaxMp: u.最大精力,
        })
      }
      continue
    }
    if (st.无双跳过本回合) {
      st.无双跳过本回合 = false
      continue
    }
    const nameKey = String(u.显示名 || '')
    const activatedCount = st.无双计数名 === nameKey
      ? Math.max(0, Math.round(Number(st.无双已触发次数) || 0))
      : 0
    if (activatedCount >= 3) continue
    if (u.无双几率 <= 0) continue
    if (!rollBattleRate(u.无双几率)) continue
    const oldMaxHp = u.最大气血
    const oldMaxMp = u.最大精力
    const newMaxHp = u.无双最大气血
    const newMaxMp = u.无双最大精力
    const curHp = Math.max(0, Math.round(Number(st.气血) || 0))
    const curMp = Math.max(0, Math.round(Number(st.精力) || 0))
    const hpScale = oldMaxHp > 0 ? newMaxHp / oldMaxHp : 1
    const mpScale = oldMaxMp > 0 ? newMaxMp / oldMaxMp : 1
    st.气血 = Math.min(newMaxHp, Math.round(curHp * hpScale))
    st.精力 = Math.min(newMaxMp, Math.round(curMp * mpScale))
    u.原始最大气血 = oldMaxHp
    u.原始最大精力 = oldMaxMp
    u.原始攻击 = u.战斗攻击
    u.原始速度 = u.速度
    u.最大气血 = newMaxHp
    u.最大精力 = newMaxMp
    u.战斗攻击 = Math.max(0, Math.round(Number(u.无双攻击) || 0))
    u.速度 = Math.max(0, Math.round(Number(u.无双速度) || 0))
    st.无双剩余回合 = 3
    st.无双已触发次数 = activatedCount + 1
    st.无双计数名 = nameKey
    日志.push(`${u.用户名}-${u.显示名}进入无双形态`)
    pendingMusou.push({
      type: 'musou-activate',
      targetKey: u.key,
      targetName: `${u.用户名}-${u.显示名}`,
      newMaxHp,
      newMaxMp,
      newCurHp: st.气血,
      newCurMp: st.精力,
    })
  }
  if (pendingMusou.length === 1) {
    过程.push(pendingMusou[0])
  } else if (pendingMusou.length > 1) {
    过程.push({ type: 'musou-activate-batch', items: pendingMusou })
  }
  return { 日志, 过程 }
}

export function applyRuntimeStateAndRebuildRanks(battleId, units) {
  const state = ensureRuntimeState(battleId, units)
  for (const u of units) {
    const s = state[u.key]
    if (!s) continue
    u.气血 = Math.max(0, Math.round(Number(s.气血) || 0))
    u.精力 = Math.max(0, Math.round(Number(s.精力) || 0))
    u.buff = normalizeBuffState(s.buff)
    if (s.显示名) u.显示名 = String(s.显示名)
    if (s.无双剩余回合 > 0 && !u.isMain) {
      u.最大气血 = u.无双最大气血 || u.最大气血
      u.最大精力 = u.无双最大精力 || u.最大精力
      u.战斗攻击 = u.无双攻击 || u.战斗攻击
      u.速度 = u.无双速度 || u.速度
    } else {
      u.最大气血 = u.原始最大气血 || u.最大气血
      u.最大精力 = u.原始最大精力 || u.最大精力
      u.战斗攻击 = u.原始攻击 || u.战斗攻击
      u.速度 = u.原始速度 || u.速度
    }
  }
  recomputeRoundRanks(units, state)
  return state
}

export function buildUnitStateList(units, state) {
  const s = state && typeof state === 'object' ? state : {}
  return (Array.isArray(units) ? units : []).map((u) => ({
    key: u.key,
    显示名: (s[u.key]?.显示名 || u.显示名) || null,
    气血: Math.max(0, Math.round(Number(s[u.key]?.气血 ?? u.气血) || 0)),
    精力: Math.max(0, Math.round(Number(s[u.key]?.精力 ?? u.精力) || 0)),
    排名: Math.max(1, Math.round(Number(u.排名) || 999)),
    buff: normalizeBuffState(s[u.key]?.buff),
    无双剩余回合: Math.max(0, Math.round(Number(s[u.key]?.无双剩余回合) || 0)),
  }))
}

function getUnitSpeeds(selfAttrs, enemyAttrs) {
  return [
    selfAttrs?.主将?.速度 ?? 0,
    selfAttrs?.副将1?.速度 ?? 0,
    selfAttrs?.副将2?.速度 ?? 0,
    selfAttrs?.副将3?.速度 ?? 0,
    enemyAttrs?.主将?.速度 ?? 0,
    enemyAttrs?.副将1?.速度 ?? 0,
    enemyAttrs?.副将2?.速度 ?? 0,
    enemyAttrs?.副将3?.速度 ?? 0,
  ]
}

export function getBattleUnitKeys() {
  return ['self:主将', 'self:副将1', 'self:副将2', 'self:副将3', 'enemy:主将', 'enemy:副将1', 'enemy:副将2', 'enemy:副将3']
}

export function buildRoundData(battleId, selfName, enemyName, selfCfg, enemyCfg) {
  const safeSelfCfg = selfCfg && typeof selfCfg === 'object' ? selfCfg : {}
  const safeEnemyCfg = enemyCfg && typeof enemyCfg === 'object' ? enemyCfg : {}
  const selfAttrs = computeAttrsFromConfig(safeSelfCfg)
  const enemyAttrs = computeAttrsFromConfig(safeEnemyCfg)
  const selfAttrs无双 = computeAttrsFromConfig无双(safeSelfCfg)
  const enemyAttrs无双 = computeAttrsFromConfig无双(safeEnemyCfg)
  const speeds = getUnitSpeeds(selfAttrs, enemyAttrs)
  const rankMap = calcSpeedRank(speeds)
  const unitKeys = getBattleUnitKeys()
  const selfDeputyNames = extractDeputyNames(safeSelfCfg)
  const enemyDeputyNames = extractDeputyNames(safeEnemyCfg)
  const units = unitKeys.map((key, i) => {
    const isSelf = key.startsWith('self:')
    const type = key.split(':')[1]
    const 显示名 = type === '主将' ? '主将' : (isSelf ? selfDeputyNames[type] : enemyDeputyNames[type]) || type
    const attrRow = isSelf ? selfAttrs[type] : enemyAttrs[type]
    const attrRow无双 = isSelf ? selfAttrs无双[type] : enemyAttrs无双[type]
    const combat = pickCombatFromAttrs(attrRow)
    const unitCfg = isSelf ? getUnitConfigByType(safeSelfCfg, type) : getUnitConfigByType(safeEnemyCfg, type)
    const 无双等级 = type === '主将' ? 0 : Math.max(0, Math.trunc(Number(unitCfg?.无双等级) || 0))
    return {
      key,
      排名: rankMap[i],
      isSelf,
      isEnemy: key.startsWith('enemy:'),
      isMain: type === '主将',
      单位类型: type,
      显示名,
      用户名: isSelf ? selfName : enemyName,
      速度: speeds[i],
      气血: getHp(key, selfAttrs, enemyAttrs),
      最大气血: getMaxHp(key, selfAttrs, enemyAttrs),
      精力: getMp(key, selfAttrs, enemyAttrs),
      最大精力: getMaxMp(key, selfAttrs, enemyAttrs),
      技能列表: Array.isArray(unitCfg?.技能) ? unitCfg.技能 : [],
      坐骑: unitCfg?.坐骑 && typeof unitCfg.坐骑 === 'object' ? unitCfg.坐骑 : null,
      神将技: String(unitCfg?.神将技 || ''),
      神将技增幅: 计算神将技增幅(unitCfg?.神将技 || '', unitCfg?.等级 || 0),
      无双等级,
      无双几率: 无双几率(无双等级),
      无双最大气血: type === '主将' ? 0 : Math.max(1, Math.round(Number(attrRow无双?.气血) || 0)),
      无双最大精力: type === '主将' ? 0 : Math.max(1, Math.round(Number(attrRow无双?.精力) || 0)),
      无双攻击: type === '主将' ? 0 : Math.max(0, Math.round(Number(attrRow无双?.攻击) || 0)),
      无双速度: type === '主将' ? 0 : Math.max(0, Math.round(Number(attrRow无双?.速度) || 0)),
      原始最大气血: getMaxHp(key, selfAttrs, enemyAttrs),
      原始最大精力: getMaxMp(key, selfAttrs, enemyAttrs),
      原始攻击: Math.max(0, Math.round(Number(attrRow?.攻击) || 0)),
      原始速度: Math.max(0, Math.round(Number(attrRow?.速度) || 0)),
      ...combat,
    }
  })
  return { units, selfAttrs, enemyAttrs, selfCfg: safeSelfCfg, enemyCfg: safeEnemyCfg }
}

function getUnitConfigByType(cfg, type) {
  if (!cfg || typeof cfg !== 'object') return null
  if (type === '主将') return cfg.主将 || null
  const order = Array.isArray(cfg.副将上阵顺序) ? cfg.副将上阵顺序 : []
  const list = Array.isArray(cfg.副将列表) ? cfg.副将列表 : []
  if (type === '副将1') return list[order[0]] || null
  if (type === '副将2') return list[order[1]] || null
  if (type === '副将3') return list[order[2]] || null
  return null
}

function normalizeBuffState(raw) {
  const inBuff = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const [k, v] of Object.entries(inBuff)) {
    const row = v && typeof v === 'object' ? v : { 剩余回合: v }
    const r = Math.max(0, Math.round(Number(row?.剩余回合) || 0))
    if (r <= 0) continue
    out[k] = {
      名称: k,
      剩余回合: r,
      来源: row?.来源 || null,
      值: Number(row?.值) || 0,
      衰减: Number(row?.衰减) || 0,
      额外值: Number(row?.额外值) || 0,
      来源技能: row?.来源技能 || null,
      暴击: !!row?.暴击,
    }
  }
  return out
}

function pickCombatFromAttrs(row) {
  if (!row || typeof row !== 'object') {
    return {
      战斗攻击: 0,
      战斗防御: 0,
      暴击率: 0,
      致命率: 0,
      暴击力: 0,
      穿透率: 0,
      抗物理: 0,
      忽视率: 0,
      命中率: 0,
      躲避率: 0,
      合击率: 0,
      夺命系数: 0,
      反击率: 0,
      反震率: 0,
      连击率: 0,
      连击上限: 1,
      法爆率: 0,
      爆伤力: 0,
      法伤力: 0,
      法穿率: 0,
      抗玄击: 0,
      抗风沙: 0,
      抗妖火: 0,
      抗落雷: 0,
      抗毒术: 0,
      天赋技能效果: {},
    }
  }
  const skillFx = row.天赋技能效果 && typeof row.天赋技能效果 === 'object' ? row.天赋技能效果 : {}
  const 连击上限 = parseComboMax(row.连击数)
  return {
    战斗攻击: Math.max(0, Math.round(Number(row.攻击) || 0)),
    战斗防御: Math.max(0, Math.round(Number(row.防御) || 0)),
    暴击率: Math.max(0, Math.round(Number(row.暴击率) || 0)),
    致命率: Math.max(0, Math.round(Number(row.致命率) || 0)),
    暴击力: Math.max(0, Math.round(Number(row.暴击力) || 0)),
    穿透率: Math.max(0, Math.round(Number(row.穿透率) || 0)),
    抗物理: Math.max(0, Math.round(Number(row.抗物理) || 0)),
    忽视率: Math.max(0, Math.round(Number(row.忽视率) || 0)),
    命中率: Math.max(0, Math.round(Number(row.命中率) || 0)),
    躲避率: Math.max(0, Math.round(Number(row.躲避率) || 0)),
    合击率: Math.max(0, Number(skillFx.合击) || 0),
    夺命系数: Math.max(0, Number(skillFx.夺命) || 0) / 100,
    反击率: Math.max(0, Math.round(Number(row.反击率) || 0)),
    反震率: Math.max(0, Math.round(Number(row.反震率) || 0)),
    连击率: Math.max(0, Math.round(Number(row.连击率) || 0)),
    连击上限,
    法爆率: Math.max(0, Math.round(Number(row.法爆率) || 0)),
    爆伤力: Math.max(0, Math.round(Number(row.爆伤力) || 0)),
    法伤力: Math.max(0, Math.round(Number(row.法伤力) || 0)),
    法穿率: Math.max(0, Math.round(Number(row.法穿率) || 0)),
    抗玄击: Math.max(0, Math.round(Number(row.抗玄击) || 0)),
    抗风沙: Math.max(0, Math.round(Number(row.抗风沙) || 0)),
    抗妖火: Math.max(0, Math.round(Number(row.抗妖火) || 0)),
    抗落雷: Math.max(0, Math.round(Number(row.抗落雷) || 0)),
    抗毒术: Math.max(0, Math.round(Number(row.抗毒术) || 0)),
    天赋技能效果: skillFx,
  }
}

function parseComboMax(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(1, Math.trunc(v))
  const s = String(v || '').trim()
  if (!s) return 1
  const ms = s.match(/\d+/g)
  if (!ms || !ms.length) return 1
  return Math.max(1, Math.trunc(Number(ms[ms.length - 1]) || 1))
}

function extractDeputyNames(cfg) {
  const order = Array.isArray(cfg?.副将上阵顺序) ? cfg.副将上阵顺序 : []
  const list = cfg?.副将列表 && typeof cfg.副将列表 === 'object' ? cfg.副将列表 : {}
  const names = {}
  const pick = (slot) => format副将显示名(list[slot]?.人物, list[slot]?.真) || ''
  names['副将1'] = pick(order[0])
  names['副将2'] = pick(order[1])
  names['副将3'] = pick(order[2])
  return names
}

function getHp(key, selfAttrs, enemyAttrs) {
  if (key.startsWith('self:')) return Math.round(selfAttrs[key.split(':')[1]]?.气血 ?? 0)
  return Math.round(enemyAttrs[key.split(':')[1]]?.气血 ?? 0)
}
function getMaxHp(key, selfAttrs, enemyAttrs) {
  if (key.startsWith('self:')) return Math.round(selfAttrs[key.split(':')[1]]?.气血 ?? 0)
  return Math.round(enemyAttrs[key.split(':')[1]]?.气血 ?? 0)
}
function getMp(key, selfAttrs, enemyAttrs) {
  if (key.startsWith('self:')) return Math.round(selfAttrs[key.split(':')[1]]?.精力 ?? 0)
  return Math.round(enemyAttrs[key.split(':')[1]]?.精力 ?? 0)
}
function getMaxMp(key, selfAttrs, enemyAttrs) {
  if (key.startsWith('self:')) return Math.round(selfAttrs[key.split(':')[1]]?.精力 ?? 0)
  return Math.round(enemyAttrs[key.split(':')[1]]?.精力 ?? 0)
}

export function createEmptyAction(unitKey) {
  return { unitKey, 操作: null, 目标: null, 已自动: false }
}

export function createDefaultActions(isSelfSide, roundUnits) {
  const sideUnits = roundUnits.filter(u => isSelfSide ? u.isSelf : u.isEnemy)
  return sideUnits.map(u => createEmptyAction(u.key))
}

export function swapSelfEnemyKey(key) {
  if (!key) return key
  if (key.startsWith('self:')) return key.replace('self:', 'enemy:')
  if (key.startsWith('enemy:')) return key.replace('enemy:', 'self:')
  return key
}

export function swapActionKeys(actions) {
  return actions.map(a => ({
    ...a,
    unitKey: swapSelfEnemyKey(a.unitKey),
    目标: swapSelfEnemyKey(a.目标),
  }))
}

export function fillAutoActions(actions, roundUnits) {
  return (Array.isArray(actions) ? actions : []).map((action = {}) => {
    if (action.操作 !== null && action.操作 !== undefined) return action
    const attackerIsSelf = String(action.unitKey || '').startsWith('self:')
    const target = findFastestAliveTarget(roundUnits, attackerIsSelf)
    return { ...action, 操作: '攻击', 目标: target?.key || null, 已自动: true }
  })
}

export function ensureBothSidesFilled(roundData, roundUnits) {
  return {
    ...roundData,
    发起方出招: fillAutoActions(roundData.发起方出招 || [], roundUnits),
    目标方出招: fillAutoActions(roundData.目标方出招 || [], roundUnits),
  }
}

function findFastestAliveTarget(roundUnits, attackerIsSelf) {
  const targets = roundUnits.filter(u =>
    attackerIsSelf ? u.isEnemy : u.isSelf
  )
  const aliveTargets = targets.filter(t => t.气血 > 0)
  if (aliveTargets.length === 0) return targets[0] || null
  aliveTargets.sort((a, b) => a.排名 - b.排名)
  return aliveTargets[0]
}

export function saveRoundData(battleId, 回合数, 发起方出招, 目标方出招, 战斗日志) {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO battle_rounds (battle_id, 回合数, 发起方出招, 目标方出招, 战斗日志, 创建时间)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  stmt.run(
    battleId,
    回合数,
    JSON.stringify(发起方出招),
    JSON.stringify(目标方出招),
    JSON.stringify(战斗日志),
    new Date().toISOString()
  )
  return db.prepare('SELECT last_insert_rowid() as id').get().id
}

export function getRoundData(battleId, 回合数) {
  const row = getDb().prepare(
    'SELECT * FROM battle_rounds WHERE battle_id = ? AND 回合数 = ?'
  ).get(battleId, 回合数)
  if (!row) return null
  return {
    id: String(row.id),
    battleId: String(row.battle_id),
    回合数: row.回合数,
    发起方出招: JSON.parse(row.发起方出招),
    目标方出招: JSON.parse(row.目标方出招),
    战斗日志: JSON.parse(row.战斗日志),
    创建时间: row.创建时间,
  }
}

export function resolveRound(roundData, roundUnits) {
  const battleId = Number(roundData?.battleId || 0)
  const runtime = applyRuntimeStateAndRebuildRanks(battleId, roundUnits)
  const filled = ensureBothSidesFilled(roundData, roundUnits)
  const allActions = [
    ...filled.发起方出招.map(a => ({ ...a, side: '发起方' })),
    ...filled.目标方出招.map(a => ({ ...a, side: '目标方' })),
  ]
  const selfCfg = roundData.selfCfg || null
  const enemyCfg = roundData.enemyCfg || null
  const 日志 = []
  const 过程 = []
  const state = {}
  roundUnits.forEach(u => {
    const s = runtime[u.key] || {}
    const hp = Math.max(0, Math.round(Number(s.气血 ?? u.气血) || 0))
    const mp = Math.max(0, Math.round(Number(s.精力 ?? u.精力) || 0))
    state[u.key] = {
      气血: hp,
      精力: mp,
      死亡: hp <= 0,
      buff: normalizeBuffState(s.buff),
      无双剩余回合: Math.max(0, Math.round(Number(s.无双剩余回合) || 0)),
      无双跳过本回合: !!s.无双跳过本回合,
    }
  })
  const roundStart = processRoundStartBuffs(state, roundUnits)
  if (roundStart.日志.length) 日志.push(...roundStart.日志)
  if (roundStart.过程.length) 过程.push(...roundStart.过程)
  const musouResult = processMusou(state, roundUnits, roundData.回合数 || 1)
  if (musouResult.日志.length) 日志.push(...musouResult.日志)
  if (musouResult.过程.length) 过程.push(...musouResult.过程)
  const acted = new Set()
  // 无双开启/关闭会改速度，需在行动前重新排名（docs/私有文档/副将.md）
  let needReRank = (musouResult.过程 || []).some((step) => {
    const t = String(step?.type || '')
    return t === 'musou-activate' || t === 'musou-activate-batch' || t === 'musou-end'
  })
  while (acted.size < roundUnits.length) {
    if (needReRank) {
      recomputeRoundRanks(roundUnits, state)
      needReRank = false
    }
    const next = [...roundUnits]
      .filter((u) => !acted.has(u.key))
      .sort((a, b) => a.排名 - b.排名)[0]
    if (!next) break
    acted.add(next.key)
    const unit = next
    const action = allActions.find(a => a.unitKey === unit.key)
    if (!action) continue
    if (state[unit.key]?.死亡 && !unit.isMain) continue
    const result = executeAction(action, unit, roundUnits, state, { selfCfg, enemyCfg })
    if (result.日志) 日志.push(result.日志)
    if (Array.isArray(result.过程) && result.过程.length) 过程.push(...result.过程)
    if (!result.已结算状态) {
      applyResultToState(state, result)
    }
    consumeTurnBuff(state, unit.key)
    if (Array.isArray(result.效果) && result.效果.some(e => e.type === 'apply-buff' && e.buffName === '速')) {
      needReRank = true
    }
  }
  recomputeRoundRanks(roundUnits, state)
  const mountHeal = processMountEndOfRound(state, roundUnits)
  if (mountHeal.日志.length) 日志.push(...mountHeal.日志)
  if (mountHeal.过程.length) 过程.push(...mountHeal.过程)
  if (battleId > 0) commitRuntimeState(battleId, state)
  return { 日志, 过程, state }
}

function executeAction(action, unit, roundUnits, state, ctx) {
  const st = state[unit.key] || {}
  const hp = Math.max(0, Math.round(Number(st.气血 ?? unit.气血) || 0))
  if (hp <= 0) {
    return {
      日志: `${unit.用户名}-${unit.显示名}气血为0，无法行动`,
      效果: {},
    }
  }
  const buff = normalizeBuffState(st.buff)
  const has围 = getBuffRounds(buff, '围') > 0
  const has乱 = getBuffRounds(buff, '乱') > 0
  const has封 = getBuffRounds(buff, '封') > 0
  if (has封) {
    return {
      日志: `${unit.用户名}-${unit.显示名}处于封状态，行动失效`,
      过程: [{ type: 'buff-block', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, buff: '封' }],
      效果: {},
    }
  }
  if (has乱) {
    const randomTarget = pickRandomAliveAnyTarget(unit, roundUnits, state)
    if (!randomTarget) {
      return {
        日志: `${unit.用户名}-${unit.显示名}处于乱状态，但无可攻击目标`,
        效果: {},
      }
    }
    return execAttackAnyTarget({ ...action, 操作: '攻击', 目标: randomTarget.key }, unit, roundUnits, state, '乱')
  }
  if (has围 && (action.操作 === '攻击' || action.操作 === '技能')) {
    return {
      日志: `${unit.用户名}-${unit.显示名}处于围状态，无法使用攻击或技能`,
      过程: [{ type: 'buff-block', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, buff: '围' }],
      效果: {},
    }
  }
  switch (action.操作) {
    case '攻击': return execAttack(action, unit, roundUnits, state)
    case '技能': return execSkill(action, unit, roundUnits, state)
    case '防御': return execDefend(action, unit, roundUnits, state)
    case '招将': return execSummon(action, unit, roundUnits, state, ctx)
    case '物品': return execItem(action, unit, roundUnits, state)
    default: return { 日志: null, 效果: {} }
  }
}

const 技能定义 = {
  舍命一击: { side: 'enemy', count: 1, kind: 'physical_skill' },
  力劈华山: { side: 'enemy', count: 1, kind: 'hp_percent' },
  排山倒海: { side: 'enemy', count: 3, kind: 'hp_percent_multi' },
  呼风唤雨: { side: 'enemy', count: 4, kind: 'magic_wind' },
  妖火燎原: { side: 'enemy', count: 4, kind: 'magic_fire' },
  五雷轰顶: { side: 'enemy', count: 1, kind: 'magic_thunder' },
  巫蛊极毒: { side: 'enemy', count: 4, kind: 'magic_poison' },
  毁天灭地: { side: 'enemy', count: 1, kind: 'pending_buff' },
  固若金汤: { side: 'self', count: 4, kind: 'pending_buff' },
  凌波微步: { side: 'self', count: 4, kind: 'pending_buff' },
  画地为牢: { side: 'enemy', count: 3, kind: 'pending_buff' },
  趁火打劫: { side: 'enemy', count: 1, kind: 'pending_buff' },
  四面楚歌: { side: 'enemy', count: 1, kind: 'pending_buff' },
  金蝉脱壳: { side: 'self', count: 1, kind: 'pending_buff' },
  暗渡陈仓: { side: 'self', count: 4, kind: 'pending_buff' },
}

const 技能档位顺序 = ['1', '2', '3', '4', '5', '化境1', '化境2', '化境3', '化境极']
const 技能数值表 = {
  舍命一击: {
    伤害: {
      '1': [600, 2600], '2': [2600, 5600], '3': [5600, 8800], '4': [8800, 12200], '5': [12200, 16000],
      化境1: [18000, 25000], 化境2: [25000, 32000], 化境3: [32000, 39000], 化境极: [39000, 53000],
    },
    自损气血: {
      '1': [0, 2000], '2': [2000, 4000], '3': [4000, 6000], '4': [6000, 8000], '5': [8000, 10000],
      化境1: [10000, 12500], 化境2: [12500, 15000], 化境3: [15000, 17500], 化境极: [17500, 20000],
    },
  },
  力劈华山: {
    百分比: {
      '1': [17, 21], '2': [21, 27], '3': [27, 33], '4': [33, 39], '5': [39, 45],
      化境1: [47, 50], 化境2: [50, 54], 化境3: [54, 57], 化境极: [57, 62],
    },
    固定伤害: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 化境1: 282, 化境2: 432, 化境3: 540, 化境极: 930 },
  },
  排山倒海: {
    百分比: {
      '1': [11, 14], '2': [14, 18], '3': [18, 22], '4': [22, 26], '5': [26, 30],
      化境1: [31, 33], 化境2: [33, 35], 化境3: [35, 37], 化境极: [37, 41],
    },
    固定伤害: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 化境1: 300, 化境2: 400, 化境3: 500, 化境极: 750 },
  },
  呼风唤雨: {
    伤害: {
      '1': [400, 900], '2': [900, 1900], '3': [1900, 2600], '4': [2600, 4000], '5': [4000, 5000],
      化境1: [6000, 9000], 化境2: [9000, 12000], 化境3: [12000, 15000], 化境极: [15000, 21000],
    },
  },
  妖火燎原: {
    伤害: {
      '1': [400, 900], '2': [900, 1900], '3': [1900, 2600], '4': [2600, 4000], '5': [4000, 5000],
      化境1: [6000, 9000], 化境2: [9000, 12000], 化境3: [12000, 15000], 化境极: [15000, 21000],
    },
  },
  五雷轰顶: {
    伤害: {
      '1': [600, 1800], '2': [1800, 4000], '3': [4000, 6400], '4': [6400, 9000], '5': [9000, 12000],
      化境1: [14000, 20000], 化境2: [20000, 26000], 化境3: [26000, 32000], 化境极: [32000, 44000],
    },
  },
  巫蛊极毒: {
    伤害: {
      '1': [200, 450], '2': [450, 950], '3': [950, 1300], '4': [1300, 2000], '5': [2000, 2500],
      化境1: [3000, 4500], 化境2: [4500, 6000], 化境3: [6000, 7500], 化境极: [7500, 10500],
    },
  },
}
const 技能耗精表 = {
  武人: {
    '1': [220, 242], '2': [550, 600], '3': [1320, 1430], '4': [2210, 2380], '5': [3920, 4200],
    化境1: [3900, 5800], 化境2: [4600, 7000], 化境3: [5600, 8400], 化境极: [8400, 12000],
  },
  文人: {
    '1': [260, 286], '2': [660, 720], '3': [1440, 1560], '4': [2600, 2800], '5': [4480, 4800],
    化境1: [4500, 6700], 化境2: [5400, 8000], 化境3: [6400, 9600], 化境极: [9600, 14000],
  },
  异人: {
    '1': [300, 330], '2': [770, 840], '3': [1680, 1820], '4': [2860, 3080], '5': [5040, 5400],
    化境1: [5000, 7600], 化境2: [6000, 9100], 化境3: [7200, 10800], 化境极: [10800, 16000],
  },
}
const 技能职业映射 = {
  舍命一击: '武人', 力劈华山: '武人', 排山倒海: '武人', 固若金汤: '武人', 凌波微步: '武人',
  画地为牢: '文人', 趁火打劫: '文人', 四面楚歌: '文人', 金蝉脱壳: '文人', 暗渡陈仓: '文人',
  呼风唤雨: '异人', 妖火燎原: '异人', 五雷轰顶: '异人', 巫蛊极毒: '异人', 毁天灭地: '异人',
}
const 控制技能成功率表 = {
  画地为牢: {
    '1': [60, 66], '2': [66, 72], '3': [72, 78], '4': [78, 84], '5': [84, 90],
    化境1: [100, 110], 化境2: [110, 120], 化境3: [120, 130], 化境极: [130, 140],
  },
  趁火打劫: {
    '1': [60, 66], '2': [66, 72], '3': [72, 78], '4': [78, 84], '5': [84, 90],
    化境1: [100, 120], 化境2: [120, 130], 化境3: [130, 140], 化境极: [140, 150],
  },
  四面楚歌: {
    '1': [60, 66], '2': [66, 72], '3': [72, 78], '4': [78, 84], '5': [84, 90],
    化境1: [100, 120], 化境2: [120, 130], 化境3: [130, 140], 化境极: [140, 150],
  },
  金蝉脱壳: {
    '1': [35, 40], '2': [40, 45], '3': [45, 50], '4': [50, 55], '5': [55, 60],
    化境1: [65, 70], 化境2: [70, 75], 化境3: [75, 80], 化境极: [80, 90],
  },
  暗渡陈仓: {
    '1': [30, 38], '2': [38, 46], '3': [46, 54], '4': [54, 62], '5': [62, 70],
    化境1: [75, 80], 化境2: [80, 85], 化境3: [85, 90], 化境极: [90, 100],
  },
}
const 固若金汤数值表 = {
  防御: {
    '1': [200, 200], '2': [400, 400], '3': [600, 600], '4': [800, 800], '5': [1000, 1000],
    化境1: [1000, 1000], 化境2: [2000, 2000], 化境3: [2500, 2500], 化境极: [3500, 3500],
  },
  抗物理: {
    '1': [1, 3], '2': [3, 6], '3': [6, 9], '4': [9, 12], '5': [12, 15],
    化境1: [15, 20], 化境2: [20, 25], 化境3: [25, 30], 化境极: [30, 40],
  },
  抗法术: {
    '1': [1, 2], '2': [2, 4], '3': [4, 6], '4': [6, 8], '5': [8, 10],
    化境1: [12, 15], 化境2: [15, 18], 化境3: [18, 21], 化境极: [21, 27],
  },
}
const 凌波微步数值表 = {
  速度提升: {
    '1': [0, 0.6], '2': [1.6, 3.2], '3': [3.2, 4.8], '4': [4.8, 6.4], '5': [6.4, 8],
    化境1: [8, 10], 化境2: [10, 12], 化境3: [12, 14], 化境极: [14, 18],
  },
}

function execSkill(action, unit, roundUnits, state) {
  const name = String(action.技能 || '').trim()
  const def = 技能定义[name]
  if (!name || !def) {
    return { 日志: `${unit.用户名}-${unit.显示名}技能失败：技能无效`, 效果: {} }
  }
  const 技能项 = getSkillSlot(unit, name)
  const 耗精 = calcSkillMpCost(name, 技能项)
  const curMp = Math.max(0, Math.round(Number(state[unit.key]?.精力 ?? unit.精力) || 0))
  if (耗精 > curMp) {
    return {
      日志: `${unit.用户名}-${unit.显示名}施放${name}失败：精力不足（需${耗精}，当前${curMp}）`,
      过程: [{
        type: 'skill-fail',
        actorKey: unit.key,
        actorName: `${unit.用户名}-${unit.显示名}`,
        skillName: name,
        reason: '精力不足',
      }],
      效果: {},
    }
  }
  const targets = pickSkillTargets(unit, roundUnits, state, action.目标, def.side, def.count)
  if (!targets.length) {
    return { 日志: `${unit.用户名}-${unit.显示名}施放${name}失败：无有效目标`, 效果: {} }
  }
  if (def.kind === 'pending_buff') {
    return resolveControlSkill(name, unit, targets, 技能项, 耗精, state)
  }
  return resolveDamageSkill(name, unit, targets, 技能项, 耗精, state)
}

function getBuffRounds(buff, name) {
  return Math.max(0, Math.round(Number(buff?.[name]?.剩余回合 ?? 0) || 0))
}

function getFortifyBonus(state, key) {
  const buff = normalizeBuffState(state?.[key]?.buff)
  const row = buff.固
  if (!row || getBuffRounds(buff, '固') <= 0) return { 防御: 0, 抗物理: 0, 抗法术: 0 }
  return {
    防御: Math.max(0, Math.round(Number(row.值) || 0)),
    抗物理: Math.max(0, Math.round(Number(row.额外值) || 0)),
    抗法术: Math.max(0, Math.round(Number(row.衰减) || 0)),
  }
}

function getEffectiveSpeed(unit, state) {
  const base = Math.max(0, Number(unit?.速度) || 0)
  const buff = normalizeBuffState(state?.[unit?.key]?.buff)
  const row = buff.速
  if (!row || getBuffRounds(buff, '速') <= 0) return base
  const pct = Math.max(0, Number(row.值) || 0)
  return Math.max(0, Math.round(base * (1 + pct / 100)))
}

function setBuffRounds(state, key, name, rounds) {
  const s = state[key]
  if (!s) return
  const buff = normalizeBuffState(s.buff)
  const r = Math.max(0, Math.round(Number(rounds) || 0))
  if (r <= 0) delete buff[name]
  else buff[name] = { 名称: name, 剩余回合: r }
  s.buff = buff
}

function consumeTurnBuff(state, key) {
  const s = state[key]
  if (!s) return
  const buff = normalizeBuffState(s.buff)
  let changed = false
  for (const name of Object.keys(buff)) {
    if (name === '毒' || name === '毁') continue
    const row = buff[name]
    const r = Math.max(0, Math.round(Number(row?.剩余回合 || 0)))
    if (r <= 1) {
      delete buff[name]
      changed = true
    } else {
      buff[name] = { ...row, 剩余回合: r - 1 }
      changed = true
    }
  }
  if (changed) s.buff = buff
}

function processRoundStartBuffs(state, roundUnits) {
  const 日志 = []
  const 过程 = []
  for (const u of roundUnits) {
    const s = state[u.key]
    if (!s) continue
    const buff = normalizeBuffState(s.buff)
    const poison = buff.毒
    if (poison && poison.剩余回合 > 0 && s.气血 > 0) {
      const dmg = Math.max(1, Math.round(Number(poison.值) || 1))
      s.气血 = Math.max(0, s.气血 - dmg)
      if (s.气血 <= 0) s.死亡 = true
      日志.push(`${u.用户名}-${u.显示名}受到毒伤害${dmg}`)
      过程.push({ type: 'buff-tick', targetKey: u.key, targetName: `${u.用户名}-${u.显示名}`, buff: '毒', damage: dmg, 来源技能: poison.来源技能 || null, 暴击: !!poison.暴击 })
      if (poison.剩余回合 <= 1) {
        delete buff.毒
      } else {
        const next = Math.max(1, Math.round(dmg * (poison.衰减 || 0.5)))
        buff.毒 = { ...poison, 剩余回合: poison.剩余回合 - 1, 值: next }
      }
    }
    const ruin = buff.毁
    if (ruin && ruin.剩余回合 > 0) {
      const casterState = ruin.来源 ? state[ruin.来源] : null
      if (!casterState || casterState.气血 <= 0 || s.气血 <= 0) {
        delete buff.毁
      } else if (ruin.剩余回合 <= 1) {
        const source = roundUnits.find((x) => x.key === ruin.来源)
        const foes = roundUnits.filter((x) => x.isSelf === u.isSelf)
        const targetUnit = roundUnits.find((x) => x.key === u.key)
        const 雷伤 = Math.max(1, Math.round(Number(ruin.值) || 1))
        const 火伤 = Math.max(1, Math.round(Number(ruin.额外值 || ruin.值) || 1))
        s.气血 = Math.max(0, s.气血 - 雷伤)
        if (s.气血 <= 0) s.死亡 = true
        日志.push(`${targetUnit?.用户名 || '未知'}-${targetUnit?.显示名 || '目标'}的毁天灭地生效，受到${雷伤}点落雷伤害`)
        过程.push({
          type: 'buff-detonate',
          actorKey: ruin.来源,
          actorName: source ? `${source.用户名}-${source.显示名}` : '未知',
          targetKey: u.key,
          targetName: targetUnit ? `${targetUnit.用户名}-${targetUnit.显示名}` : '目标',
          buff: '毁',
          damage: 雷伤,
        })
        for (const mate of foes) {
          if (mate.key === u.key) continue
          const ms = state[mate.key]
          if (!ms || ms.气血 <= 0) continue
          ms.气血 = Math.max(0, ms.气血 - 火伤)
          if (ms.气血 <= 0) ms.死亡 = true
          日志.push(`${mate.用户名}-${mate.显示名}受到毁天灭地余波${火伤}点妖火伤害`)
          过程.push({
            type: 'buff-detonate-splash',
            actorKey: ruin.来源,
            targetKey: mate.key,
            targetName: `${mate.用户名}-${mate.显示名}`,
            buff: '毁',
            damage: 火伤,
          })
        }
        delete buff.毁
      } else {
        buff.毁 = { ...ruin, 剩余回合: ruin.剩余回合 - 1 }
      }
    }
    s.buff = buff
  }
  return { 日志, 过程 }
}

function pickRandomAliveAnyTarget(unit, roundUnits, state) {
  const pool = roundUnits.filter((u) => {
    if (u.key === unit.key) return false
    const hp = Math.max(0, Math.round(Number(state[u.key]?.气血 ?? u.气血) || 0))
    return hp > 0
  })
  if (!pool.length) return null
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

function execAttackAnyTarget(action, unit, roundUnits, state, reason = '') {
  const target = roundUnits.find((u) => u.key === action.目标)
  if (!target) return { 日志: `${unit.用户名}-${unit.显示名}攻击失败：无有效目标`, 效果: {} }
  const one = doSingleAttack(unit, target, roundUnits, state)
  applyEffectsToState(state, one.effects)
  const prefix = reason ? `${unit.用户名}-${unit.显示名}受${reason}影响，随机攻击；` : ''
  return {
    日志: `${prefix}${one.log}`,
    过程: one.steps,
    效果: one.effects,
    已结算状态: true,
  }
}

function pickSkillTargets(caster, roundUnits, state, rawTargetKey, side, count) {
  const preferred = roundUnits.find((u) => u.key === rawTargetKey) || null
  const pool = roundUnits.filter((u) => {
    if (side === 'enemy' && u.isSelf === caster.isSelf) return false
    if (side === 'self' && u.isSelf !== caster.isSelf) return false
    const hp = Math.max(0, Math.round(Number(state[u.key]?.气血 ?? u.气血) || 0))
    if (hp <= 0) return false
    return true
  })
  if (!pool.length) return []
  pool.sort((a, b) => a.排名 - b.排名)
  if (count <= 1) {
    if (preferred && pool.some((u) => u.key === preferred.key)) return [preferred]
    return [pool[0]]
  }
  const out = []
  if (preferred && pool.some((u) => u.key === preferred.key)) out.push(preferred)
  for (const u of pool) {
    if (out.length >= count) break
    if (out.some((x) => x.key === u.key)) continue
    out.push(u)
  }
  return out
}

function resolveDamageSkill(name, caster, targets, 技能项, 耗精, state) {
  const effects = []
  const steps = []
  const logs = []
  effects.push({ type: 'mana-cost', targetKey: caster.key, 消耗: 耗精 })
  steps.push({
    type: 'skill-cast',
    actorKey: caster.key,
    actorName: `${caster.用户名}-${caster.显示名}`,
    skillName: name,
    mpCost: 耗精,
  })
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    let dmgHp = 1
    let dmgMp = 0
    let magicCrit = false
    if (name === '舍命一击') {
      const 面板 = getSkillMetric(name, 技能项, '伤害')
      const 舍命 = Number(caster.天赋技能效果?.舍命 || 0) / 100
      const 舍攻 = Number(caster.天赋技能效果?.舍攻 || 0) / 100
      const 强攻 = Number(caster.天赋技能效果?.强攻 || 0) / 100
      const 神将技 = 神将技增幅值(caster, name) / 100
      const atk = Number(caster.战斗攻击 || 0)
      const 技能伤害 = (面板 + atk * 0.5) * (1 + 舍命) * (1 + 神将技) + atk * 舍攻 * (1 + 强攻)
      const fortify = getFortifyBonus(state, t.key)
      const eff = effectivePhysicalResist(t, caster.穿透率, fortify.抗物理)
      dmgHp = 技能伤害 * (1 - eff / 100)
      if (i === 0) {
        const 自损 = Math.max(0, Math.round(getSkillMetric(name, 技能项, '自损气血')))
        if (自损 > 0) effects.push({ type: 'damage', targetKey: caster.key, 伤害: 自损, fromSkillCost: true })
      }
    } else if (name === '力劈华山' || name === '排山倒海') {
      const pct = roundSkillEffect1(getSkillMetric(name, 技能项, '百分比') + 神将技增幅值(caster, name)) / 100
      const fixedCfg = Math.round(getSkillMetric(name, 技能项, '固定伤害'))
      const fixed = name === '力劈华山' ? fixedCfg : (i === 0 ? fixedCfg : 0)
      const fortify = getFortifyBonus(state, t.key)
      const resist = Math.max(0, Math.min(100, (Number(t.抗玄击) || 0) + fortify.抗法术))
      const hpBase = Math.max(0, Number((state[t.key]?.气血 ?? t.气血) || 0))
      dmgHp = (hpBase * pct + fixed) * (1 - resist / 100)
      const mpBase = Math.max(0, Number((state[t.key]?.精力 ?? t.精力) || 0))
      dmgMp = mpBase * pct * (1 - resist / 100)
    } else {
      const 面板 = getSkillMetric(name, 技能项, '伤害')
      const fx = caster.天赋技能效果 || {}
      const talent =
        name === '呼风唤雨' ? Number(fx.风沙 || 0) / 100 :
          name === '妖火燎原' ? Number(fx.妖火 || 0) / 100 :
            name === '五雷轰顶' ? Number(fx.落雷 || 0) / 100 :
              Number(fx.毒术 || 0) / 100
      const 神将技 = 神将技增幅值(caster, name) / 100
      const magicBase = 面板 * (1 + talent + (Number(caster.法伤力) || 0) / 100) * (1 + 神将技)
      const resistKey =
        name === '呼风唤雨' ? '抗风沙' :
          name === '妖火燎原' ? '抗妖火' :
            name === '五雷轰顶' ? '抗落雷' : '抗毒术'
      const fortify = getFortifyBonus(state, t.key)
      const resRaw = Math.max(0, Math.min(100, (Number(t[resistKey]) || 0) + fortify.抗法术))
      const effRes = name === '巫蛊极毒'
        ? resRaw
        : Math.max(0, Math.min(100, resRaw - clampRate(caster.法穿率)))
      const crit = rollBattleRate(caster.法爆率)
      magicCrit = crit
      if (crit) {
        dmgHp = magicBase * (1.5 + (Number(caster.爆伤力) || 0) / 100) * (1 - effRes / 100)
      } else {
        dmgHp = magicBase * (1 - effRes / 100)
      }
    }
    const isPhysicalSkill = name === '舍命一击' || name === '力劈华山' || name === '排山倒海'
    if (isPhysicalSkill && dmgHp > 0) {
      const tFortify = getFortifyBonus(state, caster.key)
      const tResist = Math.max(0, Math.min(100, clampRate(Number(state[caster.key]?.抗物理) || 0) + tFortify.抗物理))
      const tDef = Math.max(0, Math.round(Number(state[caster.key]?.防御) || 0))
      const counterDmg = Math.max(1, Math.round((dmgHp - tDef) * (1 - tResist / 100)))
      if (rollBattleRate(Number(state[caster.key]?.反震率) || 0)) {
        effects.push({ type: 'damage', targetKey: caster.key, 伤害: counterDmg, fromSkillCost: false })
        steps.push({
          type: 'counter',
          actorKey: caster.key,
          targetKey: caster.key,
          actorName: `${caster.用户名}-${caster.显示名}`,
          targetName: `${caster.用户名}-${caster.显示名}`,
          damage: counterDmg,
          counterKind: '反震',
        })
      }
    }
    dmgHp = Math.max(1, Math.round(dmgHp))
    dmgMp = Math.max(0, Math.round(dmgMp))
    effects.push({ type: 'damage', targetKey: t.key, 伤害: dmgHp })
    if (dmgMp > 0) effects.push({ type: 'mana-damage', targetKey: t.key, 伤害: dmgMp })
    if (name === '巫蛊极毒') {
      effects.push({
        type: 'apply-buff',
        targetKey: t.key,
        buffName: '毒',
        剩余回合: getPoisonRoundsByTier(技能项.等级),
        值: dmgHp,
        衰减: getPoisonDecayByTier(技能项.等级),
        来源: caster.key,
        来源技能: name,
        暴击: magicCrit,
      })
    }
    steps.push({
      type: 'skill-hit',
      actorKey: caster.key,
      targetKey: t.key,
      actorName: `${caster.用户名}-${caster.显示名}`,
      targetName: `${t.用户名}-${t.显示名}`,
      skillName: name,
      damage: dmgHp,
      mpDamage: dmgMp,
      crit: magicCrit,
    })
    logs.push(`${caster.用户名}-${caster.显示名} 施放${name} 命中 ${t.用户名}-${t.显示名} 造成${dmgHp}点气血伤害${dmgMp ? `、${dmgMp}点精力伤害` : ''}`)
  }
  return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false }
}

function resolveControlSkill(name, caster, targets, 技能项, 耗精, state) {
  const effects = [{ type: 'mana-cost', targetKey: caster.key, 消耗: 耗精 }]
  const steps = [{
    type: 'skill-cast',
    actorKey: caster.key,
    actorName: `${caster.用户名}-${caster.显示名}`,
    skillName: name,
    mpCost: 耗精,
  }]
  const logs = []
  const stateHint = {}
  if (name === '毁天灭地') {
    const target = targets[0]
    const 雷伤 = calcRuinDamage(caster)
    const 火伤 = calcRuinSplashDamage(caster)
    effects.push({
      type: 'apply-buff',
      targetKey: target.key,
      buffName: '毁',
      剩余回合: 3,
      来源: caster.key,
      值: 雷伤,
      额外值: 火伤,
      来源技能: name,
    })
    logs.push(`${caster.用户名}-${caster.显示名}对${target.用户名}-${target.显示名}施加毁（3回合后生效）`)
    steps.push({ type: 'skill-control', actorKey: caster.key, targetKey: target.key, skillName: name, success: true, rate: 100, buffName: '毁' })
    return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false, 状态提示: stateHint }
  }
  if (name === '金蝉脱壳') {
    const rate = calcControlSkillRate(name, caster, targets[0], 技能项, state)
    const ok = rollBattleRate(rate)
    const target = targets[0]
    const targetBuff = normalizeBuffState(state[target.key]?.buff)
    const has文人Buff = getBuffRounds(targetBuff, '围') > 0 || getBuffRounds(targetBuff, '乱') > 0 || getBuffRounds(targetBuff, '封') > 0
    const 神将技增幅 = 神将技增幅值(caster, name)
    let healAmount = 0
    if (ok && has文人Buff) {
      effects.push({ type: 'remove-buffs', targetKey: target.key, buffs: ['围', '乱', '封'] })
      logs.push(`${caster.用户名}-${caster.显示名}施放金蝉脱壳成功，解除${target.用户名}-${target.显示名}的围乱封`)
    } else {
      logs.push(`${caster.用户名}-${caster.显示名}施放金蝉脱壳失败（成功率${rate.toFixed(1)}%）`)
      if (神将技增幅 > 0) {
        const maxHp = Math.max(1, Math.round(Number(state[target.key]?.最大气血) || 1))
        healAmount = Math.min(Math.round(神将技增幅 / 100 * maxHp), maxHp - Math.max(0, Math.round(Number(state[target.key]?.气血 || 0))))
        if (healAmount > 0) {
          effects.push({ type: 'heal', targetKey: target.key, 量: healAmount, 上限: maxHp })
          logs.push(`神将技回复${target.用户名}-${target.显示名}${healAmount}点气血`)
        }
      }
    }
    steps.push({ type: 'skill-control', actorKey: caster.key, targetKey: target.key, skillName: name, success: ok && has文人Buff, rate, healAmount })
    return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false, 状态提示: stateHint }
  }
  const buffName = name === '画地为牢' ? '围'
    : name === '趁火打劫' ? '乱'
      : name === '四面楚歌' ? '封'
        : name === '固若金汤' ? '固'
          : name === '凌波微步' ? '速'
            : name === '暗渡陈仓' ? '隐' : ''
  const rounds = getControlBuffRounds(name, 技能项)
  for (const target of targets) {
    const rate = calcControlSkillRate(name, caster, target, 技能项, state)
    const hasSame = getBuffRounds(normalizeBuffState(state[target.key]?.buff), buffName) > 0
    const ok = !hasSame && rollBattleRate(rate)
    if (ok) {
      const ext = { type: 'apply-buff', targetKey: target.key, buffName, 剩余回合: rounds, 来源: caster.key, 来源技能: name }
      if (name === '固若金汤') {
        ext.值 = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.防御, 技能项))
        ext.额外值 = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.抗物理, 技能项) + 神将技增幅值(caster, name))
        ext.衰减 = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.抗法术, 技能项))
      } else if (name === '凌波微步') {
        ext.值 = roundSkillEffect1(getBuffPanelMetric(凌波微步数值表.速度提升, 技能项) + 神将技增幅值(caster, name))
      }
      effects.push(ext)
      logs.push(`${caster.用户名}-${caster.显示名}施放${name}命中${target.用户名}-${target.显示名}，附加${buffName}`)
      if (name === '暗渡陈仓') {
        const 神将技增幅 = 神将技增幅值(caster, name)
        if (神将技增幅 > 0) {
          const maxHp = Math.max(1, Math.round(Number(state[target.key]?.最大气血) || 1))
          const healAmount = Math.min(Math.round(神将技增幅 / 100 * maxHp), maxHp - Math.max(0, Math.round(Number(state[target.key]?.气血 || 0))))
          if (healAmount > 0) {
            effects.push({ type: 'heal', targetKey: target.key, 量: healAmount, 上限: maxHp })
            logs.push(`神将技回复${target.用户名}-${target.显示名}${healAmount}点气血`)
          }
        }
      }
    } else {
      const why = hasSame ? '（目标已有同类buff）' : `（成功率${rate.toFixed(1)}%）`
      logs.push(`${caster.用户名}-${caster.显示名}施放${name}未命中${target.用户名}-${target.显示名}${why}`)
    }
    steps.push({ type: 'skill-control', actorKey: caster.key, targetKey: target.key, skillName: name, success: ok, rate, buffName })
  }
  return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false, 状态提示: stateHint }
}

function getSkillSlot(caster, skillName) {
  const list = Array.isArray(caster?.技能列表) ? caster.技能列表 : []
  const item = list.find((s) => String(s?.名称 || '').trim() === skillName) || {}
  const 等级 = 技能档位顺序.includes(String(item?.等级 || '')) ? String(item.等级) : '化境极'
  const 熟练度 = clamp熟练度到档位(等级, Number(item?.熟练度 ?? 0))
  return { 名称: skillName, 等级, 熟练度 }
}

function getSkillMetric(skillName, 技能项, metric) {
  const t = 技能数值表[skillName]?.[metric]
  if (!t) return 0
  if (typeof t === 'object' && !Array.isArray(t) && typeof t[技能项.等级] === 'number') {
    return Number(t[技能项.等级]) || 0
  }
  const range = t[技能项.等级]
  if (!Array.isArray(range)) return 0
  const [start, end] = range
  const [p0, p1] = getSkillTierMasteryBounds(技能项.等级)
  const p = Math.max(p0, Math.min(p1, Number(技能项.熟练度 || p0)))
  if (p1 === p0) return Number(end)
  const ratio = (p - p0) / (p1 - p0)
  return Number(start) + (Number(end) - Number(start)) * ratio
}

function getSkillTierMasteryBounds(tier) {
  if (tier === '1') return [1, 6000]
  if (tier === '2') return [6000, 12000]
  if (tier === '3') return [12000, 18000]
  if (tier === '4') return [18000, 24000]
  if (tier === '5') return [24000, 30000]
  if (tier === '化境极') return [0, 50000]
  return [0, 20000]
}

function calcSkillMpCost(skillName, 技能项) {
  const role = 技能职业映射[skillName]
  const row = 技能耗精表[role]?.[技能项.等级]
  if (!Array.isArray(row)) return 0
  const [start, end] = row
  const [p0, p1] = getSkillTierMasteryBounds(技能项.等级)
  const p = Math.max(p0, Math.min(p1, Number(技能项.熟练度 || p0)))
  if (p1 === p0) return Math.max(0, Math.round(end))
  const ratio = (p - p0) / (p1 - p0)
  return Math.max(0, Math.round(Number(start) + (Number(end) - Number(start)) * ratio))
}

function calcControlSkillRate(skillName, caster, target, 技能项, state) {
  const base = getControlSkillPanel(skillName, 技能项)
  const fx = caster.天赋技能效果 || {}
  const mount = getSkillMountBonus(caster, skillName)
  const shen = 神将技增幅值(caster, skillName)
  let r = 0
  if (skillName === '画地为牢') {
    const add = Number(fx.围困 || 0) + shen + mount
    const fortify = getFortifyBonus(state, target.key)
    r = Math.max(0, base + add - Math.max(0, (Number(target.抗围困) || 0) + fortify.抗法术))
  } else if (skillName === '趁火打劫') {
    const add = Number(fx.扰乱 || 0) + shen + mount
    const fortify = getFortifyBonus(state, target.key)
    r = Math.max(0, base + add - Math.max(0, (Number(target.抗扰乱) || 0) + fortify.抗法术))
  } else if (skillName === '四面楚歌') {
    const add = Number(fx.封锁 || 0) + shen + mount
    const fortify = getFortifyBonus(state, target.key)
    r = Math.max(0, base + add - Math.max(0, (Number(target.抗封锁) || 0) + fortify.抗法术))
  } else if (skillName === '金蝉脱壳') {
    r = Math.max(0, base + mount)
  } else if (skillName === '暗渡陈仓') {
    const add = Number(fx.暗渡 || 0) + mount
    r = Math.max(0, base + add)
  } else if (skillName === '固若金汤' || skillName === '凌波微步' || skillName === '毁天灭地') {
    return 100
  } else {
    return 0
  }
  if (['画地为牢', '趁火打劫', '四面楚歌', '金蝉脱壳', '暗渡陈仓'].includes(skillName)) {
    return roundSkillEffect1(r)
  }
  return r
}

function getControlSkillPanel(skillName, 技能项) {
  const t = 控制技能成功率表[skillName]
  if (!t) return 0
  const range = t[技能项.等级]
  if (!Array.isArray(range)) return 0
  const [start, end] = range
  const [p0, p1] = getSkillTierMasteryBounds(技能项.等级)
  const p = Math.max(p0, Math.min(p1, Number(技能项.熟练度 || p0)))
  if (p1 === p0) return Number(end)
  const ratio = (p - p0) / (p1 - p0)
  return Number(start) + (Number(end) - Number(start)) * ratio
}

function getSkillMountBonus(caster, skillName) {
  if (!caster?.isMain) return 0
  if (!['画地为牢', '趁火打劫', '四面楚歌', '金蝉脱壳', '暗渡陈仓'].includes(skillName)) return 0
  const kind = String(caster?.坐骑?.种类 || '')
  const level = Math.max(0, Number(caster?.坐骑?.等级) || 0)
  if (kind !== '司南车') return 0
  return 0.1 * level
}

function getControlBuffRounds(skillName, 技能项) {
  if (skillName === '毁天灭地') return 3
  if (skillName === '巫蛊极毒') return getPoisonRoundsByTier(技能项.等级)
  if (skillName === '暗渡陈仓') return 6
  if (['画地为牢', '趁火打劫', '四面楚歌', '固若金汤', '凌波微步'].includes(skillName)) return 6
  return 1
}

function getBuffPanelMetric(table, 技能项) {
  const range = table?.[技能项.等级]
  if (!Array.isArray(range)) return 0
  const [start, end] = range
  const [p0, p1] = getSkillTierMasteryBounds(技能项.等级)
  const p = Math.max(p0, Math.min(p1, Number(技能项.熟练度 || p0)))
  if (p1 === p0) return Number(end)
  const ratio = (p - p0) / (p1 - p0)
  return Number(start) + (Number(end) - Number(start)) * ratio
}

function getPoisonRoundsByTier(tier) {
  if (tier === '1' || tier === '2') return 2
  if (tier === '3' || tier === '4' || tier === '5' || tier === '化境1') return 3
  return 6
}

function getPoisonDecayByTier(tier) {
  if (tier === '化境3' || tier === '化境极') return 0.25
  return 0.5
}

function 神将技增幅值(caster, skillName) {
  if (!caster || !skillName) return 0
  return String(caster.神将技 || '') === String(skillName) ? Number(caster.神将技增幅 || 0) : 0
}

function calcRuinDamage(caster) {
  const fx = caster.天赋技能效果 || {}
  const panel = 15000
  const 神将技 = 神将技增幅值(caster, '毁天灭地') / 100
  const base = panel * (1 + Number(fx.落雷 || 0) / 100 + Number(caster.法伤力 || 0) / 100) * (1 + 神将技)
  const crit = rollBattleRate(caster.法爆率)
  const dmg = crit ? base * (1.5 + Number(caster.爆伤力 || 0) / 100) : base
  return Math.max(1, Math.round(dmg))
}

function calcRuinSplashDamage(caster) {
  const fx = caster.天赋技能效果 || {}
  const panel = 15000
  const 神将技 = 神将技增幅值(caster, '毁天灭地') / 100
  const base = panel * (1 + Number(fx.妖火 || 0) / 100 + Number(caster.法伤力 || 0) / 100) * (1 + 神将技)
  const crit = rollBattleRate(caster.法爆率)
  const dmg = crit ? base * (1.5 + Number(caster.爆伤力 || 0) / 100) : base
  return Math.max(1, Math.round(dmg))
}

/** `docs/私有文档/攻击.md`：忽视→暴击→致命→普通；概率 0~100；≥100 视为必触发 */
function rollBattleRate(percent) {
  const p = Number(percent) || 0
  if (p <= 0) return false
  if (p >= 100) return true
  return Math.random() * 100 < p
}

function damageFloatMultiplier() {
  return 0.9 + Math.random() * 0.2
}

function clampRate(v) {
  return Math.min(100, Math.max(0, Number(v) || 0))
}

/** 对方有效物理抗性 = clamp(真实物理抗性 - 攻击方穿透率, 0, 100)，真实物理抗性 = clamp(抗物理, 0, 100) */
function effectivePhysicalResist(targetUnit, attackerPen, extraResist = 0) {
  const pen = clampRate(attackerPen)
  const rawRes = (Number(targetUnit.抗物理) || 0) + (Number(extraResist) || 0)
  const realRes = clampRate(rawRes)
  return clampRate(realRes - pen)
}

/**
 * 物理普攻结算（与 `docs/私有文档/攻击.md` §1.1 对齐；未实现：连击后再次触发反震/反击、强攻天赋乘区、夺命系数）
 */
function execAttack(action, unit, roundUnits, state) {
  const preferred = roundUnits.find(u => u.key === action.目标)
  const target = pickAliveAttackTarget(unit, preferred, roundUnits, state)
  if (!target) {
    return {
      日志: `${unit.用户名}-${unit.显示名}攻击失败（对方无存活目标）`,
      效果: {},
    }
  }
  const logs = []
  const steps = []
  const effects = []
  const maxHits = Math.max(1, Number(unit.连击上限) || 1)
  let hitCount = 0
  while (hitCount < maxHits) {
    const one = doSingleAttack(unit, target, roundUnits, state)
    if (one.log) logs.push(one.log)
    if (one.steps.length) steps.push(...one.steps)
    if (one.effects.length) effects.push(...one.effects)
    applyEffectsToState(state, one.effects)
    hitCount += 1
    if (!one.hit) break
    const attackerHp = Number(state[unit.key]?.气血 || 0)
    const targetHp = Number(state[target.key]?.气血 || 0)
    if (attackerHp <= 0 || targetHp <= 0) break
    if (hitCount >= maxHits) break
    if (!rollBattleRate(unit.连击率)) break
  }
  return {
    日志: logs.join('；'),
    过程: steps,
    效果: effects,
    已结算状态: true,
  }
}

function pickAliveAttackTarget(attacker, preferredTarget, roundUnits, state) {
  const enemySide = roundUnits.filter((u) => u.isSelf !== attacker.isSelf)
  const alive = enemySide.filter((u) => {
    const hp = Math.round(Number(state[u.key]?.气血 ?? u.气血 ?? 0))
    return hp > 0
  })
  if (!alive.length) return null
  if (preferredTarget) {
    const hp = Math.round(Number(state[preferredTarget.key]?.气血 ?? preferredTarget.气血 ?? 0))
    if (hp > 0 && preferredTarget.isSelf !== attacker.isSelf) return preferredTarget
  }
  alive.sort((a, b) => a.排名 - b.排名)
  return alive[0]
}

function findFastestAliveMate(roundUnits, unit) {
  const sameSide = roundUnits.filter((u) => u.key !== unit.key && u.isSelf === unit.isSelf)
  const alive = sameSide.filter((u) => {
    if (u.气血 > 0) return true
    return false
  })
  const pool = alive.length ? alive : [unit]
  pool.sort((a, b) => a.排名 - b.排名)
  return pool[0] || unit
}

function doSingleAttack(attacker, target, roundUnits, state) {
  const steps = []
  const effects = []
  const attackerState = state[attacker.key] || {}
  const targetState = state[target.key] || {}
  const attackerHp = Math.max(0, Math.round(attackerState.气血 ?? attacker.气血 ?? 0))
  const targetHp = Math.max(0, Math.round(targetState.气血 ?? target.气血 ?? 0))
  if (attackerHp <= 0 || targetHp <= 0) {
    return { hit: false, log: `${attacker.用户名}-${attacker.显示名}攻击失败（目标或自身已阵亡）`, steps, effects }
  }
  const atk = Math.max(0, Math.round(Number(attacker.战斗攻击) || 0))
  const targetFortify = getFortifyBonus(state, target.key)
  const attackerFortify = getFortifyBonus(state, attacker.key)
  const def = Math.max(0, Math.round((Number(target.战斗防御) || 0) + targetFortify.防御))
  const effRes = effectivePhysicalResist(target, attacker.穿透率, targetFortify.抗物理)
  const resFactor = 1 - effRes / 100
  const hitRate = Math.max(0, Math.min(100, (Number(attacker.命中率) || 0) - (Number(target.躲避率) || 0)))
  const hit = rollBattleRate(hitRate)
  const 浮动 = damageFloatMultiplier()

  let mode = '普通攻击'
  let dmg = 1
  if (!hit) {
    if (!rollBattleRate(attacker.忽视率)) {
      const missLog = `${attacker.用户名}-${attacker.显示名} 攻击未命中 ${target.用户名}-${target.显示名}`
      steps.push({
        type: 'miss',
        actorKey: attacker.key,
        targetKey: target.key,
        actorName: `${attacker.用户名}-${attacker.显示名}`,
        targetName: `${target.用户名}-${target.显示名}`,
      })
      return { hit: false, log: missLog, steps, effects }
    }
    let mateName = null
    mode = '忽视攻击'
    dmg = (atk - def) * resFactor * 浮动
  } else if (rollBattleRate(attacker.忽视率)) {
    mode = '忽视攻击'
    dmg = atk * 浮动
  } else if (rollBattleRate(attacker.暴击率)) {
    mode = '暴击攻击'
    const critPower = Number(attacker.暴击力) || 0
    const raw = atk * (1.5 + critPower / 100)
    dmg = (raw - def) * resFactor * 浮动
  } else if (rollBattleRate(attacker.致命率)) {
    mode = '致命攻击'
    const doomK = Number(attacker.夺命系数) || 0
    const base = (atk - def) * resFactor
    const doom = (Number(target.最大气血) || 0) * 0.2 * (1 + doomK)
    dmg = (base + doom) * 浮动
  } else if (rollBattleRate(attacker.合击率)) {
    mode = '合击攻击'
    const mate = findFastestAliveMate(roundUnits, attacker)
    mateName = mate ? `${mate.用户名}-${mate.显示名}` : ''
    const mateAtk = Math.max(0, Math.round(Number(mate?.战斗攻击) || 0))
    const teamAtk = atk + mateAtk
    dmg = (teamAtk - def) * resFactor * 浮动
  } else {
    mode = '普通攻击'
    dmg = (atk - def) * resFactor * 浮动
  }
  dmg = Math.max(1, Math.round(dmg))
  effects.push({ type: 'damage', targetKey: target.key, 伤害: dmg })
  steps.push({
    type: 'melee',
    actorKey: attacker.key,
    targetKey: target.key,
    actorName: `${attacker.用户名}-${attacker.显示名}`,
    targetName: `${target.用户名}-${target.显示名}`,
    attackKind: mode,
    damage: dmg,
    mateName,
  })

  const afterTargetHp = Math.max(0, targetHp - dmg)
  const afterAttackerHp = attackerHp
  if (afterTargetHp > 0 && afterAttackerHp > 0) {
    if (rollBattleRate(target.反震率)) {
      const shock = Math.max(1, Math.round(dmg))
      effects.push({ type: 'damage', targetKey: attacker.key, 伤害: shock })
      steps.push({
        type: 'shock',
        actorKey: target.key,
        targetKey: attacker.key,
        actorName: `${target.用户名}-${target.显示名}`,
        targetName: `${attacker.用户名}-${attacker.显示名}`,
        damage: shock,
      })
      return {
        hit: true,
        log: `${attacker.用户名}-${attacker.显示名} ${mode} ${target.用户名}-${target.显示名} 造成${dmg}点伤害；${target.用户名}-${target.显示名}触发反震，对${attacker.用户名}-${attacker.显示名}造成${shock}点伤害`,
        steps,
        effects,
      }
    }
    if (rollBattleRate(target.反击率)) {
      const counterAtk = Math.max(0, Math.round(Number(target.战斗攻击) || 0))
      const counterDef = Math.max(0, Math.round((Number(attacker.战斗防御) || 0) + attackerFortify.防御))
      const counterRes = effectivePhysicalResist(attacker, attacker.穿透率, attackerFortify.抗物理)
      const counterFactor = 1 - counterRes / 100
      let counterDmg = (counterAtk - counterDef) * counterFactor * damageFloatMultiplier()
      counterDmg = Math.max(1, Math.round(counterDmg))
      effects.push({ type: 'damage', targetKey: attacker.key, 伤害: counterDmg })
      steps.push({
        type: 'counter',
        actorKey: target.key,
        targetKey: attacker.key,
        actorName: `${target.用户名}-${target.显示名}`,
        targetName: `${attacker.用户名}-${attacker.显示名}`,
        attackKind: '反击攻击',
        damage: counterDmg,
      })
      return {
        hit: true,
        log: `${attacker.用户名}-${attacker.显示名} ${mode} ${target.用户名}-${target.显示名} 造成${dmg}点伤害；${target.用户名}-${target.显示名}反击，对${attacker.用户名}-${attacker.显示名}造成${counterDmg}点伤害`,
        steps,
        effects,
      }
    }
  }
  return {
    hit: true,
    log: `${attacker.用户名}-${attacker.显示名} ${mode} ${target.用户名}-${target.显示名} 造成${dmg}点伤害`,
    steps,
    effects,
  }
}

function execDefend(action, unit, roundUnits, state) {
  return {
    日志: `${unit.用户名}-${unit.显示名} 进入防御状态`,
    过程: [{ type: 'defend', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
    效果: { type: 'defend', unitKey: unit.key },
  }
}

function execSummon(action, unit, roundUnits, state, ctx) {
  const st = state[unit.key] || {}
  const hp = st.气血 ?? unit.气血

  if (!unit.isMain) {
    return {
      日志: `${unit.用户名}-${unit.显示名}尝试招将失败（仅主将可招将）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }
  if (hp <= 0) {
    return {
      日志: `${unit.用户名}-${unit.显示名}已倒下，无法招将`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }

  const buff = normalizeBuffState(st.buff)
  if (getBuffRounds(buff, '封') > 0) {
    return {
      日志: `${unit.用户名}-${unit.显示名}处于封状态，无法招将`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, reason: '封' }],
      效果: {},
    }
  }
  if (getBuffRounds(buff, '乱') > 0) {
    return {
      日志: `${unit.用户名}-${unit.显示名}处于乱状态，无法招将`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, reason: '乱' }],
      效果: {},
    }
  }

  const cfg = unit.isSelf ? (ctx?.selfCfg || null) : (ctx?.enemyCfg || null)
  if (!cfg || !Array.isArray(cfg.副将列表)) {
    return {
      日志: `${unit.用户名}-${unit.显示名}招将失败（无配置数据）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }

  const slotIdx = Number(action.招将槽位 ?? -1)
  if (slotIdx < 0 || slotIdx >= cfg.副将列表.length) {
    return {
      日志: `${unit.用户名}-${unit.显示名}招将失败（无效的副将槽位）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }

  const deputyCfg = cfg.副将列表[slotIdx]
  if (!deputyCfg || !deputyCfg.已配置 || !deputyCfg.人物) {
    return {
      日志: `${unit.用户名}-${unit.显示名}招将失败（该槽位未配置副将）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }

  const 将名 = format副将显示名(String(deputyCfg.人物).trim(), deputyCfg?.真)

  const emptySlot = findEmptyDeputySlot(roundUnits, state, unit.isSelf)
  if (!emptySlot) {
    return {
      日志: `${unit.用户名}-${unit.显示名}招将失败（没有空出的副将位置）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}` }],
      效果: {},
    }
  }

  const teamCheck = checkSummonTeamRules(roundUnits, state, unit.isSelf, deputyCfg, emptySlot.key)
  if (!teamCheck.ok) {
    return {
      日志: `${unit.用户名}-${unit.显示名}招将${将名}失败（${teamCheck.reason}）`,
      过程: [{ type: 'summon-fail', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, reason: teamCheck.reason }],
      效果: {},
    }
  }

  const summonAttrs = computeSummonedDeputyAttrs(deputyCfg)
  const newAttrs = summonAttrs.normal || {}
  const musouAttrs = summonAttrs.musou || {}
  emptySlot.显示名 = 将名
  emptySlot.名称 = 将名
  emptySlot.气血 = Math.max(1, Math.round(newAttrs.气血 || 1))
  emptySlot.最大气血 = Math.max(1, Math.round(newAttrs.最大气血 || newAttrs.气血 || 1))
  emptySlot.精力 = Math.max(0, Math.round(newAttrs.精力 || 0))
  emptySlot.最大精力 = Math.max(0, Math.round(newAttrs.最大精力 || newAttrs.精力 || 0))
  emptySlot.速度 = Math.max(0, Math.round(newAttrs.速度 || 0))
  emptySlot.战斗攻击 = Math.max(0, Math.round(newAttrs.攻击 || 0))
  emptySlot.无双几率 = Math.max(0, Number(summonAttrs.chance || 0))
  emptySlot.无双最大气血 = Math.max(1, Math.round(musouAttrs.气血 || newAttrs.气血 || 1))
  emptySlot.无双最大精力 = Math.max(0, Math.round(musouAttrs.精力 || newAttrs.精力 || 0))
  emptySlot.无双攻击 = Math.max(0, Math.round(musouAttrs.攻击 || newAttrs.攻击 || 0))
  emptySlot.无双速度 = Math.max(0, Math.round(musouAttrs.速度 || newAttrs.速度 || 0))
  emptySlot.原始最大气血 = emptySlot.最大气血
  emptySlot.原始最大精力 = emptySlot.最大精力
  emptySlot.原始攻击 = emptySlot.战斗攻击
  emptySlot.原始速度 = emptySlot.速度
  const targetState = state[emptySlot.key] || {}
  const keepCount = String(targetState.无双计数名 || '') === 将名
    ? Math.max(0, Math.round(Number(targetState.无双已触发次数) || 0))
    : 0
  state[emptySlot.key] = {
    气血: emptySlot.气血,
    精力: emptySlot.精力,
    死亡: false,
    buff: {},
    显示名: 将名,
    无双剩余回合: 0,
    无双跳过本回合: false,
    无双已触发次数: keepCount,
    无双计数名: 将名,
  }

  const result = {
    日志: `${unit.用户名}-${unit.显示名}招将${将名}，加入${emptySlot.key.replace(unit.isSelf ? 'self:' : 'enemy:', '')}位置`,
    过程: [{
      type: 'summon',
      actorKey: unit.key,
      actorName: `${unit.用户名}-${unit.显示名}`,
      deputyName: 将名,
      targetKey: emptySlot.key,
    }],
    效果: [{
      type: 'summon',
      targetKey: emptySlot.key,
      deputyName: 将名,
      显示名: 将名,
      气血: Math.max(1, Math.round(newAttrs.气血 || 1)),
      最大气血: Math.max(1, Math.round(newAttrs.最大气血 || newAttrs.气血 || 1)),
      精力: Math.max(0, Math.round(newAttrs.精力 || 0)),
      最大精力: Math.max(0, Math.round(newAttrs.最大精力 || newAttrs.精力 || 0)),
      速度: Math.max(0, Math.round(newAttrs.速度 || 0)),
      战斗攻击: Math.max(0, Math.round(newAttrs.攻击 || 0)),
      战斗防御: Math.max(0, Math.round(newAttrs.防御 || 0)),
      穿透率: Math.max(0, Math.round(newAttrs.穿透率 || 0)),
      抗物理: Math.max(0, Math.round(newAttrs.抗物理 || 0)),
      抗玄击: Math.max(0, Math.round(newAttrs.抗玄击 || 0)),
      命中率: Math.max(0, Math.round(newAttrs.命中率 || 0)),
      暴击率: Math.max(0, Math.round(newAttrs.暴击率 || 0)),
      技能列表: Array.isArray(deputyCfg.技能) ? deputyCfg.技能 : [],
      天赋技能效果: newAttrs.天赋技能效果 || {},
      无双几率: Math.max(0, Number(summonAttrs.chance || 0)),
      无双最大气血: Math.max(1, Math.round(musouAttrs.气血 || newAttrs.气血 || 1)),
      无双最大精力: Math.max(0, Math.round(musouAttrs.精力 || newAttrs.精力 || 0)),
      无双攻击: Math.max(0, Math.round(musouAttrs.攻击 || newAttrs.攻击 || 0)),
      无双速度: Math.max(0, Math.round(musouAttrs.速度 || newAttrs.速度 || 0)),
    }],
  }
  const summoned = roundUnits.find((u) => u.key === emptySlot.key)
  const summonMusou = maybeActivateMusouOnSummon(state, summoned)
  if (summonMusou) {
    result.过程.push(summonMusou)
    result.日志 = `${result.日志}；${summonMusou.targetName}招将入场后立刻进入无双形态`
  }
  return result
}

function findEmptyDeputySlot(roundUnits, state, isSelf) {
  const prefix = isSelf ? 'self:' : 'enemy:'
  for (const slot of ['副将1', '副将2', '副将3']) {
    const key = prefix + slot
    const u = roundUnits.find(u => u.key === key)
    if (!u) continue
    const s = state[key]
    if ((s && s.死亡) || (!s && u.气血 <= 0)) return u
  }
  return null
}

function checkSummonTeamRules(roundUnits, state, isSelf, deputyCfg, targetSlotKey) {
  const prefix = isSelf ? 'self:' : 'enemy:'
  const aliveDeputies = []
  let 文人Count = 0

  for (const slot of ['主将', '副将1', '副将2', '副将3']) {
    const key = prefix + slot
    if (key === targetSlotKey) continue
    const s = state[key]
    if (s && s.死亡) continue

    const u = roundUnits.find(u => u.key === key)
    if (!u) continue

    if (slot !== '主将' && u.名称 && u.名称 !== slot) {
      aliveDeputies.push({ name: normalizeDeputyCompareName(u.名称), key })
    }

    const 轴 = getUnitClassAxis(u)
    if (轴 === '文') 文人Count++
  }

  if (aliveDeputies.length >= 3) {
    return { ok: false, reason: '场上已有3名副将参战' }
  }

  const newAxis = getDeputyClassAxis(deputyCfg)
  if (newAxis === '文') {
    const mainAxis = getUnitClassAxis(roundUnits.find(u => u.key === prefix + '主将'))
    const total文人 = 文人Count + (mainAxis === '文' ? 1 : 0) + 1
    if (total文人 > 2) {
      return { ok: false, reason: '队伍中文人数量已达上限（最多2人）' }
    }
  }

  const 神将国士名 = new Set(aliveDeputies.map(d => d.name).filter(Boolean))
  if (神将国士名.has(normalizeDeputyCompareName(deputyCfg.人物))) {
    return { ok: false, reason: `场上已有同名副将「${deputyCfg.人物}」` }
  }

  return { ok: true }
}

function getUnitClassAxis(unit) {
  if (!unit) return '武'
  const 经历 = Array.isArray(unit.技能列表) ? null : null
  if (Array.isArray(unit.技能列表) && unit.技能列表.length > 0) {
    const firstSkill = unit.技能列表[0]
    if (typeof firstSkill === 'string') {
      if (['画地为牢','趁火打劫','四面楚歌','金蝉脱壳','暗渡陈仓'].includes(firstSkill)) return '文'
      if (['呼风唤雨','妖火燎原','五雷轰顶','巫蛊极毒','毁天灭地'].includes(firstSkill)) return '异'
    } else if (firstSkill && typeof firstSkill === 'object' && firstSkill.名称) {
      const name = firstSkill.名称
      if (['画地为牢','趁火打劫','四面楚歌','金蝉脱壳','暗渡陈仓'].includes(name)) return '文'
      if (['呼风唤雨','妖火燎原','五雷轰顶','巫蛊极毒','毁天灭地'].includes(name)) return '异'
    }
  }
  return '武'
}

function getDeputyClassAxis(deputyCfg) {
  if (!deputyCfg || !Array.isArray(deputyCfg.职业经历)) return '武'
  const last = deputyCfg.职业经历[deputyCfg.职业经历.length - 1]
  if (!last) return '武'
  if (String(last).endsWith('文')) return '文'
  if (String(last).endsWith('异')) return '异'
  return '武'
}

function computeSummonedDeputyAttrs(deputyCfg) {
  try {
    const fullCfg = { 主将: {}, 副将列表: [deputyCfg] }
    const attrs = computeAttrsFromConfig(fullCfg)
    const attrs无双 = computeAttrsFromConfig无双(fullCfg)
    return {
      normal: attrs.副将1 || {},
      musou: attrs无双.副将1 || {},
      chance: 无双几率(Math.max(0, Math.trunc(Number(deputyCfg?.无双等级) || 0))),
    }
  } catch {
    return { normal: {}, musou: {}, chance: 0 }
  }
}

function normalizeDeputyCompareName(name) {
  let s = String(name || '').trim()
  if (!s) return ''
  s = s.replace(/^无双-/, '')
  s = s.replace(/^\(真\)/, '')
  return s
}

function maybeActivateMusouOnSummon(state, summonedUnit) {
  if (!summonedUnit || summonedUnit.isMain) return null
  const st = state[summonedUnit.key]
  if (!st || st.死亡) return null
  const nameKey = String(summonedUnit.显示名 || '')
  const activatedCount = st.无双计数名 === nameKey
    ? Math.max(0, Math.round(Number(st.无双已触发次数) || 0))
    : 0
  if (activatedCount >= 3) return null
  if (summonedUnit.无双几率 <= 0) return null
  if (!rollBattleRate(summonedUnit.无双几率)) return null
  const oldMaxHp = summonedUnit.最大气血
  const oldMaxMp = summonedUnit.最大精力
  const newMaxHp = summonedUnit.无双最大气血
  const newMaxMp = summonedUnit.无双最大精力
  const curHp = Math.max(0, Math.round(Number(st.气血) || 0))
  const curMp = Math.max(0, Math.round(Number(st.精力) || 0))
  const hpScale = oldMaxHp > 0 ? newMaxHp / oldMaxHp : 1
  const mpScale = oldMaxMp > 0 ? newMaxMp / oldMaxMp : 1
  st.气血 = Math.min(newMaxHp, Math.round(curHp * hpScale))
  st.精力 = Math.min(newMaxMp, Math.round(curMp * mpScale))
  summonedUnit.原始最大气血 = oldMaxHp
  summonedUnit.原始最大精力 = oldMaxMp
  summonedUnit.原始攻击 = summonedUnit.战斗攻击
  summonedUnit.原始速度 = summonedUnit.速度
  summonedUnit.最大气血 = newMaxHp
  summonedUnit.最大精力 = newMaxMp
  summonedUnit.战斗攻击 = Math.max(0, Math.round(Number(summonedUnit.无双攻击) || 0))
  summonedUnit.速度 = Math.max(0, Math.round(Number(summonedUnit.无双速度) || 0))
  st.无双剩余回合 = 3
  st.无双已触发次数 = activatedCount + 1
  st.无双计数名 = nameKey
  return {
    type: 'musou-activate',
    targetKey: summonedUnit.key,
    targetName: `${summonedUnit.用户名}-${summonedUnit.显示名}`,
    newMaxHp,
    newMaxMp,
    newCurHp: st.气血,
    newCurMp: st.精力,
  }
}

function execItem(action, unit, roundUnits, state) {
  const target = roundUnits.find(u => u.key === action.目标)
  if (!target) return { 日志: `${unit.用户名}-${unit.显示名}使用物品失败：无效目标`, 效果: {} }
  const 物品名 = action.物品 || '未知物品'
  const targetState = state[target.key] || {}
  const curHp = targetState.气血 ?? target.气血 ?? 0
  const curMp = targetState.精力 ?? target.精力 ?? 0
  let 恢复量 = 0
  let 恢复类型 = ''
  if (物品名 === '九转丹') {
    if (!target.isMain && (targetState.死亡 || curHp <= 0)) {
      return {
        日志: `${unit.用户名}-${unit.显示名}对${target.用户名}-${target.显示名}使用九转丹失败（副将已阵亡，无法使用）`,
        效果: {},
      }
    }
    恢复量 = Math.max(0, Math.round(target.最大气血 - curHp))
    恢复类型 = '气血'
  } else if (物品名 === '龙涎露') {
    if (!target.isMain && (targetState.死亡 || curHp <= 0)) {
      return {
        日志: `${unit.用户名}-${unit.显示名}对${target.用户名}-${target.显示名}使用龙涎露失败（副将已阵亡，无法使用）`,
        效果: {},
      }
    }
    恢复量 = Math.max(0, Math.round(target.最大精力 - curMp))
    恢复类型 = '精力'
  }
  if (!恢复量) {
    return {
      日志: `${unit.用户名}-${unit.显示名}对${target.用户名}-${target.显示名}使用了${物品名}（目标已满或无效）`,
      效果: {},
    }
  }

  return {
    日志: `${unit.用户名}-${unit.显示名}对${target.用户名}-${target.显示名}使用${物品名}，恢复${恢复量}点${恢复类型}`,
    过程: [{
      type: 'item',
      actorKey: unit.key,
      targetKey: target.key,
      actorName: `${unit.用户名}-${unit.显示名}`,
      targetName: `${target.用户名}-${target.显示名}`,
      itemName: 物品名,
      recoverType: 恢复类型,
      recover: 恢复量,
    }],
    效果: { type: 'item', targetKey: target.key, 物品名, 恢复量, 恢复类型, targetMaxHp: target.最大气血, targetMaxMp: target.最大精力 },
  }
}

function applyResultToState(state, result) {
  const fx = Array.isArray(result.效果) ? result.效果 : result.效果 ? [result.效果] : []
  applyEffectsToState(state, fx)
}

function applyEffectsToState(state, effects) {
  for (const eff of effects) {
    if (!eff || typeof eff !== 'object') continue
    switch (eff.type) {
      case 'damage': {
        const s = state[eff.targetKey]
        if (s) {
          const d = Math.max(1, Math.round(Number(eff.伤害) || 1))
          s.气血 = Math.max(0, s.气血 - d)
          if (s.气血 <= 0) s.死亡 = true
          const buff = normalizeBuffState(s.buff)
          if (getBuffRounds(buff, '围') > 0) {
            delete buff.围
            s.buff = buff
          }
        }
        break
      }
      case 'defend':
        break
      case 'item': {
        const s = state[eff.targetKey]
        if (!s) break
        if (eff.恢复类型 === '气血') {
          s.气血 = Math.min(s.气血 + eff.恢复量, eff.targetMaxHp || 999999)
          if (s.气血 > 0) s.死亡 = false
        } else if (eff.恢复类型 === '精力') {
          s.精力 = Math.min(s.精力 + eff.恢复量, eff.targetMaxMp || 999999)
        }
        break
      }
      case 'heal': {
        const s = state[eff.targetKey]
        if (!s) break
        const amount = Math.max(0, Math.round(Number(eff.量) || 0))
        const cap = Math.max(1, Math.round(Number(eff.上限) || 999999))
        s.气血 = Math.min(cap, Math.max(0, Math.round(Number(s.气血 || 0))) + amount)
        if (s.气血 > 0) s.死亡 = false
        break
      }
      case 'mana-damage': {
        const s = state[eff.targetKey]
        if (!s) break
        const d = Math.max(1, Math.round(Number(eff.伤害) || 1))
        s.精力 = Math.max(0, Math.round(Number(s.精力 || 0) - d))
        break
      }
      case 'mana-cost': {
        const s = state[eff.targetKey]
        if (!s) break
        const d = Math.max(0, Math.round(Number(eff.消耗) || 0))
        s.精力 = Math.max(0, Math.round(Number(s.精力 || 0) - d))
        break
      }
      case 'apply-buff': {
        const s = state[eff.targetKey]
        if (!s) break
        const name = String(eff.buffName || '')
        if (!name) break
        const buff = normalizeBuffState(s.buff)
        if (getBuffRounds(buff, name) > 0) break
        buff[name] = {
          名称: name,
          剩余回合: Math.max(1, Math.round(Number(eff.剩余回合) || 1)),
          来源: eff.来源 || null,
          值: Math.max(0, Number(eff.值) || 0),
          衰减: Math.max(0, Number(eff.衰减) || 0),
          额外值: Math.max(0, Number(eff.额外值) || 0),
          来源技能: eff.来源技能 || null,
          暴击: !!eff.暴击,
        }
        s.buff = buff
        break
      }
      case 'remove-buffs': {
        const s = state[eff.targetKey]
        if (!s) break
        const arr = Array.isArray(eff.buffs) ? eff.buffs : []
        if (!arr.length) break
        const buff = normalizeBuffState(s.buff)
        for (const b of arr) delete buff[String(b)]
        s.buff = buff
        break
      }
      case 'summon': {
        const s = state[eff.targetKey]
        if (!s) break
        s.气血 = Math.max(1, Number(eff.气血) || 1)
        s.精力 = Math.max(0, Number(eff.精力 || 0))
        s.死亡 = false
        s.buff = {}
        s.无双剩余回合 = Math.max(0, Math.round(Number(s.无双剩余回合) || 0))
        s.无双跳过本回合 = false
        s.无双已触发次数 = Math.max(0, Math.round(Number(s.无双已触发次数) || 0))
        s.无双计数名 = String(eff.显示名 || s.无双计数名 || '')
        break
      }
    }
  }
}

export function checkBattleEnd(state, roundUnits) {
  const selfDead = roundUnits.filter(u => u.isSelf).every(u => (state[u.key]?.死亡 && !u.isMain) || (u.isMain && state[u.key]?.气血 <= 0 && state[u.key]?.死亡))
  const enemyDead = roundUnits.filter(u => u.isEnemy).every(u => (state[u.key]?.死亡 && !u.isMain) || (u.isMain && state[u.key]?.气血 <= 0 && state[u.key]?.死亡))
  const selfAllDown = roundUnits.filter(u => u.isSelf).every(u => state[u.key]?.气血 <= 0)
  const enemyAllDown = roundUnits.filter(u => u.isEnemy).every(u => state[u.key]?.气血 <= 0)
  if (selfAllDown) return { 结束: true, 胜者: '敌方', 原因: '我方全倒下' }
  if (enemyAllDown) return { 结束: true, 胜者: '我方', 原因: '敌方全倒下' }
  return { 结束: false }
}

export function getRoundTimeoutMs() {
  return 回合超时秒 * 1000
}
