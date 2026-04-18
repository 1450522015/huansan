import { getDb } from '../db/sqlite.js'
import { computeAttrsFromConfig, computeAttrsFromConfig无双 } from './attrCalculator.js'
import { clamp熟练度到档位, 计算神将技增幅, 无双几率, format副将显示名 } from '../../../common/gameCatalog.js'
import { buildUserBattleTextLines } from '../../../common/battleUserBattleText.js'

/** 与 `common/gameCatalog` 中九类百分比/控制技能一致：效果值保留一位小数 */
function roundSkillEffect1(n) {
  return Math.round(Number(n) * 10) / 10
}

function 显示技能名(name, caster) {
  if (!name || !caster?.神将技) return name
  return name === caster.神将技 ? name + '(神)' : name
}

/** 控制成功率表用基础技能名（去掉 buff 里可能存的「(神)」后缀） */
function normalizeSkillNameForRates(name) {
  const s = String(name || '').trim()
  if (s.endsWith('(神)')) return s.slice(0, -4).trim()
  return s
}

const 速度差距阈值 = 20
/** 调试：拉长回合超时，避免开发时被倒计时打断 */
const 回合超时秒 = 9999
const 战局运行态 = new Map()

export function calcSpeedRank(速度列表) {
  const units = 速度列表.map((v, i) => ({ index: i, speed: Number(v) || 0 }))
  // 文档规则：按速度从小到大；当差值在 [-20, 20] 内时，引入"排名更高概率"线性随机
  // 使用稳定的冒泡排序，仅在需要交换时按概率决定是否交换
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
  if (!s || typeof s !== 'object') {
    s = {}
    战局运行态.set(id, s)
  }
  for (const u of units) {
    if (s[u.key] && typeof s[u.key] === 'object') continue
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
  return s
}

export function clearRuntimeState(battleId) {
  战局运行态.delete(String(battleId))
}

export function clearAllRuntimeState() {
  战局运行态.clear()
}

export function commitRuntimeState(battleId, state) {
  if (!battleId || !state || typeof state !== 'object') return
  const prev = 战局运行态.get(String(battleId))
  const next = {}
  for (const [k, v] of Object.entries(state)) {
    if (!String(k).includes(':')) continue
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
  if (state.速度排名缓存 && typeof state.速度排名缓存 === 'object' && !Array.isArray(state.速度排名缓存)) {
    next.速度排名缓存 = { ...state.速度排名缓存 }
  } else if (prev?.速度排名缓存 && typeof prev.速度排名缓存 === 'object' && !Array.isArray(prev.速度排名缓存)) {
    next.速度排名缓存 = { ...prev.速度排名缓存 }
  }
  if (typeof state.速度签名缓存 === 'string' && state.速度签名缓存) {
    next.速度签名缓存 = state.速度签名缓存
  } else if (typeof prev?.速度签名缓存 === 'string' && prev.速度签名缓存) {
    next.速度签名缓存 = prev.速度签名缓存
  }
  战局运行态.set(String(battleId), next)
}

function buildRankCacheSignature(units, state) {
  return (Array.isArray(units) ? units : [])
    .map((u) => {
      const hp = Math.max(0, Math.round(Number(state?.[u.key]?.气血 ?? u.气血) || 0))
      const active = u.isMain || hp > 0
      const speed = active ? getEffectiveSpeed(u, state) : 0
      return `${u.key}:${active ? 1 : 0}:${speed}`
    })
    .join('|')
}

function normalizeCachedRankMap(units, state, cachedRankMap) {
  if (!cachedRankMap) return null
  if (!Array.isArray(cachedRankMap) && typeof cachedRankMap === 'object') {
    return { ...cachedRankMap }
  }
  if (!Array.isArray(cachedRankMap)) return null
  const activeUnits = (Array.isArray(units) ? units : []).filter((u) => {
    const hp = Math.max(0, Math.round(Number(state?.[u.key]?.气血 ?? u.气血) || 0))
    if (u.isMain) return true
    return hp > 0
  })
  const out = {}
  for (let i = 0; i < activeUnits.length; i++) {
    out[activeUnits[i].key] = cachedRankMap[i] ?? 999
  }
  return out
}

function applyCachedRanks(units, cachedRankMap) {
  for (const u of Array.isArray(units) ? units : []) {
    const rank = Number(cachedRankMap?.[u.key])
    u.排名 = Number.isFinite(rank) && rank > 0 ? Math.round(rank) : 999
  }
}

/** 将 `state` 中的运行态写回 `units`（气血/精力/buff/无双期面板速度等），供签名与重算排名一致使用 */
function syncBattleUnitsFromRuntimeState(units, state) {
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
  state.速度排名缓存 = Object.fromEntries(
    units.map((u) => [u.key, u.排名 ?? 999])
  )
  state.速度签名缓存 = buildRankCacheSignature(units, state)
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
    const actorLabel = `${u.用户名}-${u.显示名}`
    if (healType === 'hp') {
      st.气血 = Math.min(maxHp, curHp + healAmount)
      日志.push(`${actorLabel}的木牛流马回复了${healAmount}点气血`)
      过程.push({
        type: 'mount-heal',
        targetKey: u.key,
        targetName: actorLabel,
        actorName: actorLabel,
        healType: 'hp',
        amount: healAmount,
        气血恢复量: healAmount,
      })
    } else {
      st.精力 = Math.min(maxMp, curMp + healAmount)
      日志.push(`${actorLabel}的木牛流马回复了${healAmount}点精力`)
      过程.push({
        type: 'mount-heal',
        targetKey: u.key,
        targetName: actorLabel,
        actorName: actorLabel,
        healType: 'mp',
        amount: healAmount,
        精力恢复量: healAmount,
      })
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
        const tn = `${u.用户名}-${u.显示名}`
        日志.push(`${tn}的无双形态结束`)
        过程.push({
          type: 'musou-close',
          targetKey: u.key,
          targetName: tn,
          newMaxHp: u.最大气血,
          newMaxMp: u.最大精力,
        })
        过程.push({
          type: 'musou-end',
          targetKey: u.key,
          targetName: tn,
          newMaxHp: u.最大气血,
          newMaxMp: u.最大精力,
        })
      }
      continue
    }
    if (st.无双跳过本回合) {
      st.无双跳过本回合 = false
      if (u.无双几率 > 0) {
        const tn = `${u.用户名}-${u.显示名}`
        const 无双几率显示 = roundSkillEffect1(Math.max(0, Number(u.无双几率) || 0))
        过程.push({ type: 'musou-skip', targetKey: u.key, targetName: tn, 无双几率: 无双几率显示, reason: 'link-skip' })
      }
      continue
    }
    const nameKey = String(u.显示名 || '')
    const activatedCount = st.无双计数名 === nameKey
      ? Math.max(0, Math.round(Number(st.无双已触发次数) || 0))
      : 0
    if (activatedCount >= 3) {
      continue
    }
    if (u.无双几率 <= 0) continue
    const tn = `${u.用户名}-${u.显示名}`
    const 无双几率显示 = roundSkillEffect1(Math.max(0, Number(u.无双几率) || 0))
    if (!rollBattleRate(u.无双几率)) {
      过程.push({ type: 'musou-roll', targetKey: u.key, targetName: tn, 无双几率: 无双几率显示, success: false })
      continue
    }
    过程.push({ type: 'musou-roll', targetKey: u.key, targetName: tn, 无双几率: 无双几率显示, success: true })
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
      原速度排名: u.排名 ?? 999,
      newMaxHp,
      newMaxMp,
      newCurHp: st.气血,
      newCurMp: st.精力,
    })
  }
  if (pendingMusou.length) {
    recomputeRoundRanks(roundUnits, state)
    for (const item of pendingMusou) {
      const unit = roundUnits.find(u => u.key === item.targetKey)
      item.原速度排名 = item.原速度排名 ?? unit?.排名 ?? 0
      item.新速度排名 = unit?.排名 ?? 0
    }
    const changed = pendingMusou.filter(p => p.原速度排名 !== p.新速度排名)
    for (const p of changed) {
      日志.push(`${p.targetName} 速度排名从速${p.原速度排名}变为速${p.新速度排名}`)
    }
    过程.push({
      type: 'musou-speed-change',
      items: pendingMusou.map(p => ({
        targetKey: p.targetKey,
        targetName: p.targetName,
        原速度排名: p.原速度排名,
        新速度排名: p.新速度排名,
      })),
    })
  }
  return { 日志, 过程 }
}

export function applyRuntimeStateAndRebuildRanks(battleId, units) {
  const state = ensureRuntimeState(battleId, units)
  syncBattleUnitsFromRuntimeState(units, state)
  const currentSignature = buildRankCacheSignature(units, state)
  const cachedRankMap = normalizeCachedRankMap(units, state, state.速度排名缓存)
  if (cachedRankMap && state.速度签名缓存 === currentSignature) {
    applyCachedRanks(units, cachedRankMap)
    state.速度排名缓存 = cachedRankMap
  } else {
    recomputeRoundRanks(units, state)
  }
  return state
}

export function buildUnitStateList(units, state) {
  const s = state && typeof state === 'object' ? state : {}
  return (Array.isArray(units) ? units : []).map((u) => ({
    key: u.key,
    显示名: (s[u.key]?.显示名 || u.显示名) || null,
    气血: Math.max(0, Math.round(Number(s[u.key]?.气血 ?? u.气血) || 0)),
    精力: Math.max(0, Math.round(Number(s[u.key]?.精力 ?? u.精力) || 0)),
    最大气血: Math.max(1, Math.round(Number(u.最大气血) || 1)),
    最大精力: Math.max(1, Math.round(Number(u.最大精力) || 1)),
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
      /** 由下方「缓存命中 / recomputeRoundRanks」写入，避免每次 buildRoundData 重复随机 */
      排名: 999,
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
  const runtime = ensureRuntimeState(battleId, units)
  syncBattleUnitsFromRuntimeState(units, runtime)
  const sig = buildRankCacheSignature(units, runtime)
  const prevSig = typeof runtime.速度签名缓存 === 'string' ? runtime.速度签名缓存 : ''
  const prevCache =
    runtime.速度排名缓存 && typeof runtime.速度排名缓存 === 'object' && !Array.isArray(runtime.速度排名缓存)
      ? runtime.速度排名缓存
      : null
  if (prevCache && prevSig && prevSig === sig) {
    applyCachedRanks(units, prevCache)
  } else {
    recomputeRoundRanks(units, runtime)
  }
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
      原伤害: row?.原伤害 != null ? Number(row.原伤害) : null,
      衰减: Number(row?.衰减) || 0,
      额外值: Number(row?.额外值) || 0,
      来源技能: row?.来源技能 || null,
      暴击: !!row?.暴击,
      成功率: row?.成功率 != null ? Number(row.成功率) : null,
      原成功率: row?.原成功率 != null ? Number(row.原成功率) : null,
      二次判定通过: !!row?.二次判定通过,
      等级: row?.等级 || null,
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
      抗围困: 0,
      抗扰乱: 0,
      抗封锁: 0,
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
    抗围困: Math.max(0, Math.round(Number(row.抗围困) || 0)),
    抗扰乱: Math.max(0, Math.round(Number(row.抗扰乱) || 0)),
    抗封锁: Math.max(0, Math.round(Number(row.抗封锁) || 0)),
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
  return { unitKey, 操作: null, 目标: null }
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
    return { ...action, 操作: '攻击', 目标: target?.key || null }
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

export function saveRoundData(battleId, 回合数, 发起方出招, 目标方出招, 战斗日志, 完整结果) {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO battle_rounds (battle_id, 回合数, 发起方出招, 目标方出招, 战斗日志, 完整结果, 创建时间)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  stmt.run(
    battleId,
    回合数,
    JSON.stringify(发起方出招),
    JSON.stringify(目标方出招),
    JSON.stringify(战斗日志),
    完整结果 != null ? JSON.stringify(完整结果) : null,
    new Date().toISOString()
  )
  return db.prepare('SELECT last_insert_rowid() as id').get().id
}

/** 取该战局「已写入」的最新一行 `battle_rounds`（与客户端 `lastRoundResult` 对齐；出招中尚未结算的回合可能无行） */
export function getLatestRoundDataForBattle(battleId) {
  const bid = Number(battleId)
  if (!Number.isFinite(bid) || bid < 1) return null
  const row = getDb()
    .prepare('SELECT 回合数 FROM battle_rounds WHERE battle_id = ? ORDER BY 回合数 DESC LIMIT 1')
    .get(bid)
  if (!row || row.回合数 == null) return null
  return getRoundData(bid, row.回合数)
}

export function getRoundData(battleId, 回合数) {
  const row = getDb().prepare(
    'SELECT * FROM battle_rounds WHERE battle_id = ? AND 回合数 = ?'
  ).get(battleId, 回合数)
  if (!row) return null
  let 战况文本用户 = []
  try {
    战况文本用户 = row.战况文本用户 != null ? JSON.parse(row.战况文本用户) : []
  } catch {
    战况文本用户 = []
  }
  if (!Array.isArray(战况文本用户)) 战况文本用户 = []

  let 完整结果 = null
  try {
    if (row.完整结果 != null) {
      完整结果 = JSON.parse(row.完整结果)
    }
  } catch {
    完整结果 = null
  }

  const base = {
    id: String(row.id),
    battleId: String(row.battle_id),
    回合数: row.回合数,
    发起方出招: JSON.parse(row.发起方出招),
    目标方出招: JSON.parse(row.目标方出招),
    战斗日志: JSON.parse(row.战斗日志),
    战况文本用户,
    创建时间: row.创建时间,
  }

  if (完整结果 && typeof 完整结果 === 'object') {
    return { ...base, ...完整结果 }
  }
  return base
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
      无双几率: u.无双几率 || 0,
    }
  })
  const roundNum = Math.max(1, Math.round(Number(roundData?.回合数) || 1))
  let roundStart = { 过程: [], 日志: [] }
  let musouResult = { 过程: [], 日志: [] }
  if (roundNum === 1) {
    roundStart = processRoundStartBuffs(state, roundUnits)
    musouResult = processMusou(state, roundUnits, 1)
    if (roundStart.日志.length) 日志.push(...roundStart.日志)
    if (musouResult.日志.length) 日志.push(...musouResult.日志)
  }
  const 前置过程 = [...roundStart.过程, ...musouResult.过程]
  const initialSpeedState = structuredClone(state)
  const 战况第一回合速度行 =
    roundNum === 1 ? `速度排名：${buildSpeedRankString(roundUnits, initialSpeedState, false)}` : null
  const acted = new Set()
  let needReRank = (musouResult.过程 || []).some((step) => {
    const t = String(step?.type || '')
    return (
      t === 'musou-activate' ||
      t === 'musou-activate-batch' ||
      t === 'musou-end' ||
      t === 'musou-close' ||
      t === 'musou-speed-change'
    )
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

  const endAfterBody = checkBattleEnd(state, roundUnits).结束

  let 战况下一回合开场块 = []
  let rsNext = { 过程: [], 日志: [] }
  let musouNext = { 过程: [], 日志: [] }
  if (!endAfterBody) {
    const nextNum = roundNum + 1
    rsNext = processRoundStartBuffs(state, roundUnits)
    const endAfterRs = checkBattleEnd(state, roundUnits).结束
    if (!endAfterRs) {
      musouNext = processMusou(state, roundUnits, nextNum)
      const needReRankGate = (musouNext.过程 || []).some((step) => {
        const t = String(step?.type || '')
        return (
          t === 'musou-activate' ||
          t === 'musou-activate-batch' ||
          t === 'musou-end' ||
          t === 'musou-close' ||
          t === 'musou-speed-change'
        )
      })
      if (needReRankGate) recomputeRoundRanks(roundUnits, state)
    }
    const preAccumNext = orderPreRoundBattleTextSteps(rsNext.过程, musouNext.过程, mountHeal.过程)
    const speedStateAfterGate = structuredClone(state)
    战况下一回合开场块 = [
      `第${nextNum}回合`,
      ...buildAccumulationRoundPreBattleLines(preAccumNext, roundUnits, speedStateAfterGate),
    ]
  }

  if (battleId > 0) commitRuntimeState(battleId, state)

  const actionBattleLines = buildSystemBattleText(过程, roundUnits, initialSpeedState, state)
  const 战况系统 = [...actionBattleLines, ...战况下一回合开场块]
  const actionUserLines = buildUserBattleTextLines(过程)
  const startUserLines =
    roundNum === 1 && 战况下一回合开场块.length
      ? buildUserRoundStartPreLines(
          orderPreRoundBattleTextSteps(rsNext.过程, musouNext.过程, mountHeal.过程),
        )
      : []
  const 战况用户 = [...actionUserLines]
  if (startUserLines.length) {
    战况用户.push(`—— 第${roundNum + 1}回合 ——`)
    战况用户.push(...startUserLines)
  }

  const 战况行动系统 =
    actionBattleLines.length && String(actionBattleLines[0]).startsWith('速度排名：')
      ? actionBattleLines.slice(1)
      : [...actionBattleLines]

  return {
    日志,
    过程,
    state,
    战况文本系统: 战况系统,
    战况行动系统,
    战况下一回合开场块,
    战况第一回合速度行,
    战况文本用户: 战况用户,
  }
}

export function buildSpeedRankString(roundUnits, state, excludeDead = false) {
  const alive = excludeDead
    ? roundUnits.filter((u) => u.isMain || (Math.max(0, Math.round(Number(state[u.key]?.气血 ?? u.气血) || 0)) > 0))
    : [...roundUnits]
  // 直接使用单位上已缓存的排名（须与传入的 state 一致），避免与前端 `单位状态.排名` 串台
  const result = alive
    .slice()
    .sort(
      (a, b) =>
        (a.排名 ?? 999) - (b.排名 ?? 999) ||
        getEffectiveSpeed(b, state) - getEffectiveSpeed(a, state) ||
        String(a.key).localeCompare(String(b.key)),
    )
    .map((u) => `${u.用户名}-${u.显示名} 速度=${getEffectiveSpeed(u, state)}(速${u.排名 ?? '-'})`)
  return result.join('，')
}

function buildSystemBattleText(steps, roundUnits, initialSpeedState, finalState) {
  const lines = []
  if (roundUnits && roundUnits.length) {
    lines.push(`速度排名：${buildSpeedRankString(roundUnits, finalState, false)}`)
  }
  for (const s of steps) {
    switch (s.type) {
      case 'musou-activate':
        lines.push(`${s.actorName} 开启无双`)
        break
      case 'musou-activate-batch':
        s.activated?.forEach(a => lines.push(`${a.actorName} 开启无双`))
        break
      case 'lingbo-speed-change': {
        lines.push(`凌波微步后 速度排名：${s.速度排名}`)
        break
      }
      case 'musou-speed-change':
        s.items?.forEach(i => {
          if (i.原速度排名 !== i.新速度排名) {
            lines.push(`${i.targetName} 速度排名从速${i.原速度排名}变为速${i.新速度排名}`)
          }
        })
        break
      case 'musou-end':
        s.ended?.forEach(e => lines.push(`${e.actorName} 无双结束`))
        break
      case 'melee': {
        const kind = s.attackKind || '普通攻击'
        const parts = []
        parts.push(`原伤害=${s.rawDamage}`)
        parts.push(`浮动=${s.floatDamage}`)
        parts.push(`实际=${s.damage}`)
        lines.push(`${s.actorName} ${kind} ${s.targetName} [${parts.join(' ')}]`)
        break
      }
      case 'buff-block': {
        const buffDesc = s.buff === '围' ? '围困' : s.buff === '乱' ? '扰乱' : s.buff === '封' ? '封锁' : s.buff
        lines.push(`${s.actorName} 因${buffDesc}无法行动`)
        break
      }
      case 'skill-fail':
        lines.push(`${s.actorName} ${s.skillName || '技能'} 失败（${s.reason}）`)
        break
      case 'shock':
        lines.push(`${s.actorName} 反震 ${s.targetName} -${s.damage}`)
        break
      case 'counter': {
        const cParts = []
        cParts.push(`原伤害=${s.rawDamage}`)
        cParts.push(`浮动=${s.floatDamage}`)
        cParts.push(`实际=${s.damage}`)
        lines.push(`${s.actorName} 反击 ${s.targetName} [${cParts.join(' ')}]`)
        break
      }
      case 'miss':
        lines.push(`${s.actorName} 攻击未命中 ${s.targetName}`)
        break
      case 'skill-cast':
        break
      case 'skill-hit': {
        const parts = []
        const is舍命 = s.skillName && s.skillName.includes('舍命一击')
        const isHpPct = s.原效果 != null
        if (s.damage != null && !is舍命 && !isHpPct) parts.push(`气血-${s.damage}`)
        if (s.mpDamage != null && s.mpDamage > 0) parts.push(`精力-${s.mpDamage}`)
        if (isHpPct) {
          parts.push(`原效果=${s.原效果}%`)
          parts.push(`实际效果=${s.实际效果}%`)
          if (s.damage != null) parts.push(`气血-${s.damage}`)
        } else {
          if (s.rawDamage != null) parts.push(`原伤害=${s.rawDamage}`)
          if (s.floatDamage != null && !is舍命) parts.push(`浮动=${s.floatDamage}`)
        }
        if (s.crit) parts.push(`法暴`)
        if (s.原成功率 != null) parts.push(`原成功率=${s.原成功率}%`)
        if (s.实际成功率 != null) parts.push(`实际成功率=${s.实际成功率}%`)
        if (s.控制成功) parts.push(`控制成功`)
        if (s.控制失败) parts.push(`控制失败`)
        if (s.防御提升 != null) {
          parts.push(`防御+${s.防御提升}`)
          if (s.抗物理提升 != null) parts.push(`抗物理+${s.抗物理提升}`)
          if (s.抗法术提升 != null) parts.push(`抗法术+${s.抗法术提升}`)
        } else if (s.buffValue != null && s.速度提升 != null) {
          parts.push(`效果=${s.buffValue}%`)
        } else if (s.buffValue != null) {
          parts.push(`效果值=${s.buffValue}`)
        }
        if (is舍命) {
          parts.push(`实际伤害=${s.damage}`)
        }
        if (s.气血消耗 != null && s.气血消耗 > 0) parts.push(`气血消耗=${s.气血消耗}`)
        if (s.精力消耗 != null && s.精力消耗 > 0) parts.push(`精力消耗=${s.精力消耗}`)
        lines.push(`${s.actorName} ${s.skillName} ${s.targetName} [${parts.join(' ')}]`)
        break
      }
      case 'summon':
        lines.push(`${s.actorName} 招将 ${s.将名} → ${s.槽位}`)
        break
      case 'item-use':
        lines.push(`${s.actorName} 对 ${s.targetName} 使用 ${s.物品名} 恢复${s.恢复量}${s.恢复类型}`)
        break
      case 'poison-dmg':
        lines.push(`${s.targetName} 毒发 -${s.damage}`)
        break
      case 'ruin-explode':
        lines.push(`${s.targetName} 毁爆 -${s.雷Damage}(雷)`)
        s.溅射?.forEach(j => lines.push(`${j.目标} -${j.伤害}(火)`))
        break
      case 'buff-expire-control':
        lines.push(`${s.targetName} ${s.buffName}失效(原成功率=${s.原成功率}%)`)
        break
      case 'mount-heal':
        // 木牛流马回合末触发，战况归入「下一回合前置」段（见 orderPreRoundBattleTextSteps），不在本回合行动块重复
        break
    }
  }
  return lines
}

function stripMainSuffix(name) {
  return String(name || '').replace(/-主将$/, '')
}

function extractDisplayName(name) {
  const s = String(name || '')
  const idx = s.lastIndexOf('-')
  return idx >= 0 ? s.slice(idx + 1) : s
}

/** 回合前展示顺序：毁 → 毒 → 无双相关 → 木牛流马 → 围乱封二次判定 */
function orderPreRoundBattleTextSteps(roundSteps = [], musouSteps = [], mountSteps = []) {
  const ruin = []
  const poison = []
  const musou = []
  const mount = []
  const ctrl = []
  const pushCat = (s) => {
    if (!s || typeof s !== 'object') return
    const t = String(s.type || '')
    if (t === 'buff-detonate' || t === 'buff-detonate-splash') ruin.push(s)
    else if (t === 'buff-tick' && s.buff === '毒') poison.push(s)
    else if (t === 'mount-heal') mount.push(s)
    else if (t === 'control-second-check') ctrl.push(s)
    else if (
      t === 'musou-end' ||
      t === 'musou-close' ||
      t === 'musou-roll' ||
      t === 'musou-skip' ||
      t === 'musou-activate' ||
      t === 'musou-activate-batch' ||
      t === 'musou-speed-change'
    ) {
      musou.push(s)
    }
  }
  for (const s of roundSteps) pushCat(s)
  for (const s of musouSteps) pushCat(s)
  for (const s of mountSteps) pushCat(s)
  return [...ruin, ...poison, ...musou, ...mount, ...ctrl]
}

/** 战况文本系统：回合前单条（与 `orderPreRoundBattleTextSteps` 输出一致） */
function formatPreRoundEventSystemLine(s) {
  if (!s || typeof s !== 'object') return null
  switch (s.type) {
    case 'buff-detonate':
      return `${s.targetName || '目标'}的毁天灭地生效，受到${Math.max(0, Math.round(Number(s.damage) || 0))}点落雷伤害`
    case 'buff-detonate-splash':
      return `${s.targetName || '目标'}受到毁天灭地余波${Math.max(0, Math.round(Number(s.damage) || 0))}点妖火伤害`
    case 'buff-tick':
      if (s.buff === '毒') return `${s.targetName} 毒发 -${s.damage}`
      return null
    case 'mount-heal': {
      const who = s.targetName || s.actorName || '未知'
      if (s.气血恢复量 != null && s.气血恢复量 > 0) return `${who}的木牛流马回复了${s.气血恢复量}点气血`
      if (s.精力恢复量 != null && s.精力恢复量 > 0) return `${who}的木牛流马回复了${s.精力恢复量}点精力`
      if (s.amount && s.healType === 'hp') return `${who}的木牛流马回复了${s.amount}点气血`
      if (s.amount && s.healType === 'mp') return `${who}的木牛流马回复了${s.amount}点精力`
      return null
    }
    case 'control-second-check': {
      const sk = String(s.skillDisplayName || s.skillName || '')
      return `${sk}二次判定 ${s.targetName} [原成功率=${s.原成功率}% 实际成功率=${s.实际成功率}% ${s.控制成功 ? '控制成功' : '控制失败'}]`
    }
    case 'musou-close':
      return `无双已开启：${s.targetName} 无双关闭`
    case 'musou-roll': {
      const r = s.无双几率 != null ? `${s.无双几率}%` : '—'
      if (s.success) return `无双未开启：${s.targetName} 无双几率=${r} 开启无双成功`
      return `无双未开启：${s.targetName} 无双几率=${r} 开启无双失败`
    }
    case 'musou-skip': {
      if (s.reason === 'count') return null
      const r = s.无双几率 != null ? `${s.无双几率}%` : '—'
      if (s.reason === 'link-skip') return `无双未开启：${s.targetName} 无双几率=${r} 无双衔接跳过回合`
      return null
    }
    default:
      return null
  }
}

function formatPreRoundEventUserBrief(s) {
  if (!s || typeof s !== 'object') return null
  switch (s.type) {
    case 'buff-detonate':
      return `${s.targetName} 毁爆落雷 -${Math.max(0, Math.round(Number(s.damage) || 0))}`
    case 'buff-detonate-splash':
      return `${s.targetName} 毁爆余波 -${Math.max(0, Math.round(Number(s.damage) || 0))}`
    case 'buff-tick':
      if (s.buff === '毒') return `${s.targetName} 毒发 -${s.damage}`
      return null
    case 'mount-heal': {
      const who = s.targetName || s.actorName || ''
      if (s.精力恢复量) return `${who} 木牛流马 +${s.精力恢复量}精力`
      if (s.气血恢复量) return `${who} 木牛流马 +${s.气血恢复量}气血`
      if (s.amount && s.healType === 'mp') return `${who} 木牛流马 +${s.amount}精力`
      if (s.amount && s.healType === 'hp') return `${who} 木牛流马 +${s.amount}气血`
      return null
    }
    case 'control-second-check':
      return `${s.skillName} ${extractDisplayName(s.targetName)} ${s.控制成功 ? '二次判定通过' : '挣脱控制'}`
    case 'musou-close':
      return `${extractDisplayName(s.targetName)} 无双结束`
    case 'musou-roll':
      return `${extractDisplayName(s.targetName)} ${s.success ? '开启无双' : '无双未触发'}`
    case 'musou-skip':
      if (s.reason === 'count') return `${extractDisplayName(s.targetName)} 无双已达次数上限`
      if (s.reason === 'link-skip') return `${extractDisplayName(s.targetName)} 无双衔接跳过`
      return null
    default:
      return null
  }
}

/** 用户可见「下一回合前置」：无双三句式、围乱封二次判定、木牛流马等（不含速度排名） */
function formatUserRoundEndPreLine(s) {
  if (!s || typeof s !== 'object') return null
  switch (s.type) {
    case 'buff-detonate':
      return `${stripMainSuffix(s.targetName || '')} 毁爆落雷 -${Math.max(0, Math.round(Number(s.damage) || 0))}`
    case 'buff-detonate-splash':
      return `${stripMainSuffix(s.targetName || '')} 毁爆余波 -${Math.max(0, Math.round(Number(s.damage) || 0))}`
    case 'buff-tick':
      if (s.buff === '毒') return `${stripMainSuffix(s.targetName || '')} 毒发 -${s.damage}`
      return null
    case 'mount-heal': {
      const who = stripMainSuffix(s.targetName || s.actorName || '')
      if (s.精力恢复量) return `${who} 木牛流马 +${s.精力恢复量}精力`
      if (s.气血恢复量) return `${who} 木牛流马 +${s.气血恢复量}气血`
      if (s.amount && s.healType === 'mp') return `${who} 木牛流马 +${s.amount}精力`
      if (s.amount && s.healType === 'hp') return `${who} 木牛流马 +${s.amount}气血`
      return null
    }
    case 'control-second-check': {
      const sk = String(s.skillDisplayName || s.skillName || '')
      const tn = String(s.targetName || '')
      const ok = s.控制成功 ? '控制成功' : '控制失败'
      return `${sk}二次判定 ${tn} [原成功率=${s.原成功率}% 实际成功率=${s.实际成功率}% ${ok}]`
    }
    case 'musou-close':
      return `无双已开启：${s.targetName} 无双关闭`
    case 'musou-roll': {
      const tn = String(s.targetName || '')
      const r = s.无双几率 != null ? `${s.无双几率}%` : '—'
      if (s.success) return `无双未开启：${tn} 无双几率=${r} 开启无双成功`
      return `无双未开启：${tn} 无双几率=${r} 开启无双失败`
    }
    case 'musou-skip':
      if (s.reason === 'count') return null
      if (s.reason === 'link-skip') {
        const tn = String(s.targetName || '')
        const r = s.无双几率 != null ? `${s.无双几率}%` : '—'
        return `无双未开启：${tn} 无双几率=${r} 无双衔接跳过回合`
      }
      return null
    default:
      return null
  }
}

/**
 * 累计 / 单回合战况：第 N（N≥2）回合「前置」展示行。
 * 顺序与 `orderPreRoundBattleTextSteps` 一致：毁 → 毒 → 无双相关 → 木牛（含上回合末延迟并入）→ 围乱封二次判定 → 最后追加行动前速度行。
 * `stateForSpeed` 须与 `resolveRound` 内 `initialSpeedState` 一致（回合初 buff + 无双之后、行动循环之前），勿用回合末 `state`。
 */
export function buildAccumulationRoundPreBattleLines(orderedSteps, roundUnits, stateForSpeed) {
  const lines = []
  for (const s of orderedSteps || []) {
    const t = String(s?.type || '')
    if (t === 'musou-end' || t === 'musou-speed-change' || t === 'musou-activate' || t === 'musou-activate-batch') {
      continue
    }
    const line = formatPreRoundEventSystemLine(s)
    if (line) lines.push(line)
  }
  if (roundUnits?.length) {
    lines.push(`速度排名：${buildSpeedRankString(roundUnits, stateForSpeed, false)}`)
  }
  return lines
}

function buildUserRoundStartPreLines(orderedSteps) {
  const lines = []
  for (const s of orderedSteps || []) {
    const t = String(s?.type || '')
    if (
      t === 'musou-end' ||
      t === 'musou-speed-change' ||
      t === 'musou-activate' ||
      t === 'musou-activate-batch' ||
      t === 'musou-close' ||
      t === 'musou-roll' ||
      t === 'musou-skip' ||
      t === 'control-second-check'
    ) {
      continue
    }
    const line = formatUserRoundEndPreLine(s)
    if (line) lines.push(line)
  }
  return lines
}

function executeAction(action, unit, roundUnits, state, ctx) {
  const st = state[unit.key] || {}
  const hp = Math.max(0, Math.round(Number(st.气血 ?? unit.气血) || 0))
  if (hp <= 0) {
    return { 日志: null, 效果: {} }
  }
  const buff = normalizeBuffState(st.buff)
  const has围 = getBuffRounds(buff, '围') > 0
  const has乱 = getBuffRounds(buff, '乱') > 0
  const has封 = getBuffRounds(buff, '封') > 0
  if (has封) {
    return {
      日志: null,
      过程: [{ type: 'buff-block', actorKey: unit.key, actorName: `${unit.用户名}-${unit.显示名}`, buff: '封' }],
      效果: {},
    }
  }
  if (has乱) {
    const randomTarget = pickRandomAliveAnyTarget(unit, roundUnits, state)
    if (!randomTarget) {
      return { 日志: null, 效果: {} }
    }
    return execAttackAnyTarget({ ...action, 操作: '攻击', 目标: randomTarget.key }, unit, roundUnits, state, '乱')
  }
  if (has围 && (action.操作 === '攻击' || action.操作 === '技能')) {
    return {
      日志: null,
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

export const 技能定义 = {
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

function getSkillTargetCount(name, baseCount, unit, 技能项) {
  if (name === '画地为牢' && unit.isMain && 技能项?.等级 === '化境极') return 4
  return baseCount
}

function execSkill(action, unit, roundUnits, state) {
  const name = String(action.技能 || '').trim()
  const def = 技能定义[name]
  if (!name || !def) {
    return { 日志: null, 效果: {} }
  }
  const 技能项 = getSkillSlot(unit, name)
  const 耗精 = calcSkillMpCost(name, 技能项)
  const curMp = Math.max(0, Math.round(Number(state[unit.key]?.精力 ?? unit.精力) || 0))
  if (耗精 > curMp) {
    return {
      日志: null,
      过程: [{
        type: 'skill-fail',
        actorKey: unit.key,
        actorName: `${unit.用户名}-${unit.显示名}`,
        skillName: 显示技能名(name, unit),
        reason: '精力不足',
      }],
      效果: {},
    }
  }
  if (name === '舍命一击') {
    const 自损面板 = Math.max(0, Math.round(getSkillMetric(name, 技能项, '自损气血')))
    const 当前气血 = Math.max(0, Math.round(Number(state[unit.key]?.气血 ?? unit.气血) || 0))
    if (自损面板 >= 当前气血 && 当前气血 <= 1000) {
      return {
        日志: null,
        过程: [{
          type: 'skill-fail',
          actorKey: unit.key,
          actorName: `${unit.用户名}-${unit.显示名}`,
          skillName: 显示技能名(name, unit),
          reason: '气血不足',
        }],
        效果: {},
      }
    }
  }
  const isDamageKind = ['physical_skill', 'hp_percent', 'hp_percent_multi', 'magic_wind', 'magic_fire', 'magic_thunder', 'magic_poison'].includes(def.kind)
  if (!isDamageKind) {
    const preferred = roundUnits.find(u => u.key === action.目标)
    const pool = roundUnits.filter(u => (def.side === 'self') ? (u.isSelf === unit.isSelf) : (u.isSelf !== unit.isSelf))
    const alivePool = pool.filter(u => u.气血 > 0)
    const count = getSkillTargetCount(name, def.count, unit, 技能项)
    const targets = pickSkillTargets(unit, alivePool, state, preferred?.key || null, def.side, count)
    if (!targets.length) return { 日志: null, 效果: {} }
    return resolveControlSkill(name, unit, targets, 技能项, 耗精, state, roundUnits)
  } else {
    const preferred = roundUnits.find(u => u.key === action.目标)
    const pool = roundUnits.filter(u => u.isSelf !== unit.isSelf && u.气血 > 0)
    const count = getSkillTargetCount(name, def.count, unit, 技能项)
    const targets = pickSkillTargets(unit, pool, state, preferred?.key || null, 'enemy', count)
    if (!targets.length) return { 日志: null, 效果: {} }
    return resolveDamageSkill(name, unit, targets, 技能项, 耗精, state)
  }
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
      const base = poison.原伤害 ? Number(poison.原伤害) : (Number(poison.值) || 1)
      const isMaxTier = poison.等级 === '化境极'
      let raw
      if (isMaxTier) {
        const n = Math.max(0, poison.剩余回合 - 1)
        raw = Math.max(1, Math.round(base * Math.pow(0.75, n)))
      } else {
        raw = Math.max(1, Math.round(base * 0.5))
      }
      const fortify = getFortifyBonus(state, u.key)
      const curRes = Math.max(0, (Number(u.抗毒术) || 0) + fortify.抗法术)
      const dmg = Math.max(1, Math.round(raw * (1 - curRes / 100)))
      s.气血 = Math.max(0, s.气血 - dmg)
      if (s.气血 <= 0) s.死亡 = true
      日志.push(`${u.用户名}-${u.显示名}受到毒伤害${dmg}`)
      过程.push({ type: 'buff-tick', targetKey: u.key, targetName: `${u.用户名}-${u.显示名}`, buff: '毒', damage: dmg, 来源技能: poison.来源技能 || null, 暴击: !!poison.暴击 })
      if (poison.剩余回合 <= 1) {
        delete buff.毒
      } else {
        buff.毒 = { ...poison, 剩余回合: poison.剩余回合 - 1 }
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
    for (const ctrlName of ['围', '乱', '封']) {
      const ctrlBuff = buff[ctrlName]
      const defaultSkillName =
        ctrlName === '围' ? '画地为牢' : ctrlName === '乱' ? '趁火打劫' : ctrlName === '封' ? '四面楚歌' : ''
      const skillNameRaw = String(ctrlBuff?.来源技能 || defaultSkillName || '')
      const skillNameBase = normalizeSkillNameForRates(skillNameRaw)
      const caster = ctrlBuff?.来源 ? roundUnits.find((x) => x.key === ctrlBuff.来源) : null
      if (
        ctrlBuff &&
        caster &&
        skillNameBase &&
        !ctrlBuff.二次判定通过 &&
        ctrlBuff.剩余回合 >= 1
      ) {
        const target = u
        const 技能项 = caster ? getSkillSlot(caster, skillNameBase) : { 等级: '化境极', 熟练度: 0 }
        const ratesNow =
          caster
            ? calcControlSkillRates(skillNameBase, caster, target, 技能项, state)
            : { 原成功率: 0, 实际成功率: 0 }
        const 原显示 =
          ctrlBuff.原成功率 != null ? roundSkillEffect1(Number(ctrlBuff.原成功率)) : ratesNow.原成功率
        const 实际显示 = ratesNow.实际成功率
        const ok = rollBattleRate(实际显示)
        const skillDisplayName = caster ? 显示技能名(skillNameBase, caster) : skillNameRaw || skillNameBase
        if (!ok) {
          delete buff[ctrlName]
          日志.push(`${u.用户名}-${u.显示名}的${ctrlName}控制失效`)
          过程.push({
            type: 'control-second-check',
            skillName: skillNameBase,
            skillDisplayName,
            buffName: ctrlName,
            targetKey: u.key,
            targetName: `${u.用户名}-${u.显示名}`,
            原成功率: 原显示,
            实际成功率: 实际显示,
            控制成功: false,
          })
        } else {
          ctrlBuff.二次判定通过 = true
          过程.push({
            type: 'control-second-check',
            skillName: skillNameBase,
            skillDisplayName,
            buffName: ctrlName,
            targetKey: u.key,
            targetName: `${u.用户名}-${u.显示名}`,
            原成功率: 原显示,
            实际成功率: 实际显示,
            控制成功: true,
          })
        }
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
    skillName: 显示技能名(name, caster),
    mpCost: 耗精,
  })
  let 舍命气血消耗 = 0
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    let dmgHp = 1
    let dmgMp = 0
    let magicCrit = false
    let tRawDmg = 0
    let tFloatDmg = 0
    let hpPctRaw = null
    let hpPctActual = null
    if (name === '舍命一击') {
      const 面板 = getSkillMetric(name, 技能项, '伤害')
      const 舍命 = Number(caster.天赋技能效果?.舍命 || 0) / 100
      const 舍攻 = Number(caster.天赋技能效果?.舍攻 || 0) / 100
      const 强攻 = Number(caster.天赋技能效果?.强攻 || 0) / 100
      const 神将技 = 神将技增幅值(caster, name) / 100
      const atk = Number(caster.战斗攻击 || 0)
      const rawDamage = (面板 + atk * 0.5) * (1 + 舍命) * (1 + 神将技) + atk * 舍攻 * (1 + 强攻)
      const fortify = getFortifyBonus(state, t.key)
      const eff = effectivePhysicalResist(t, caster.穿透率, fortify.抗物理)
      dmgHp = rawDamage * (1 - eff / 100)
      tRawDmg = Math.round(rawDamage)
      if (i === 0) {
        const 自损面板 = Math.max(0, Math.round(getSkillMetric(name, 技能项, '自损气血')))
        const 当前气血 = Math.max(0, Math.round(Number(state[caster.key]?.气血 ?? caster.气血) || 0))
        let 自损 = 自损面板
        if (自损面板 >= 当前气血 && 当前气血 > 1000) {
          自损 = 当前气血 - 1
        }
        if (自损 > 0) {
          effects.push({ type: 'damage', targetKey: caster.key, 伤害: 自损, fromSkillCost: true })
          舍命气血消耗 = 自损
        }
      }
    } else if (name === '力劈华山' || name === '排山倒海') {
      const pct = roundSkillEffect1(getSkillMetric(name, 技能项, '百分比') + 神将技增幅值(caster, name)) / 100
      const fixedCfg = Math.round(getSkillMetric(name, 技能项, '固定伤害'))
      const fixed = name === '力劈华山' ? fixedCfg : (i === 0 ? fixedCfg : 0)
      const hpBase = Math.max(0, Number((state[t.key]?.气血 ?? t.气血) || 0))
      const rawDamage = hpBase * pct + fixed
      tRawDmg = Math.round(rawDamage)
      tFloatDmg = tRawDmg
      const fortify = getFortifyBonus(state, t.key)
      const resist = Math.max(0, Math.min(100, (Number(t.抗玄击) || 0) + fortify.抗法术))
      dmgHp = rawDamage * (1 - resist / 100)
      const mpBase = Math.max(0, Number((state[t.key]?.精力 ?? t.精力) || 0))
      dmgMp = mpBase * pct * (1 - resist / 100)
      hpPctRaw = roundSkillEffect1(pct * 100)
      hpPctActual = roundSkillEffect1(pct * (1 - resist / 100) * 100)
    } else {
      const 面板 = getSkillMetric(name, 技能项, '伤害')
      const fx = caster.天赋技能效果 || {}
      const talent =
        name === '呼风唤雨' ? Number(fx.风沙 || 0) / 100 :
          name === '妖火燎原' ? Number(fx.妖火 || 0) / 100 :
            name === '五雷轰顶' ? Number(fx.落雷 || 0) / 100 :
              Number(fx.毒术 || 0) / 100
      const 神将技 = 神将技增幅值(caster, name) / 100
      const rawBase = 面板 * (1 + talent + (Number(caster.法伤力) || 0) / 100) * (1 + 神将技)
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
      let floatDamage
      if (crit) {
        floatDamage = rawBase * (1.5 + (Number(caster.爆伤力) || 0) / 100)
      } else {
        floatDamage = rawBase
      }
      tRawDmg = Math.round(rawBase)
      tFloatDmg = Math.round(floatDamage)
      dmgHp = floatDamage * (1 - effRes / 100)
    }
    const isPhysicalSkill = name === '舍命一击' || name === '力劈华山' || name === '排山倒海'
    if (isPhysicalSkill && dmgHp > 0) {
      const tFortify = getFortifyBonus(state, caster.key)
      const tResist = Math.max(0, Math.min(100, clampRate(Number(state[caster.key]?.抗物理) || 0) + tFortify.抗物理))
      const counterDmg = Math.max(1, Math.round(dmgHp * (1 - tResist / 100)))
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
        原伤害: Math.max(1, tFloatDmg),
        衰减: getPoisonDecayByTier(技能项.等级),
        等级: 技能项.等级,
        来源: caster.key,
        来源技能: name,
        暴击: magicCrit,
      })
    }
    const hitStep = {
      type: 'skill-hit',
      actorKey: caster.key,
      targetKey: t.key,
      actorName: `${caster.用户名}-${caster.显示名}`,
      targetName: `${t.用户名}-${t.显示名}`,
      skillName: 显示技能名(name, caster),
      damage: dmgHp,
      mpDamage: dmgMp,
      crit: magicCrit,
      rawDamage: tRawDmg,
    }
    if (name !== '舍命一击') {
      hitStep.floatDamage = tFloatDmg
    }
    hitStep.精力消耗 = 耗精
    if (name === '舍命一击' && 舍命气血消耗 > 0) {
      hitStep.气血消耗 = 舍命气血消耗
    }
    if (hpPctRaw != null) hitStep.原效果 = hpPctRaw
    if (hpPctActual != null) hitStep.实际效果 = hpPctActual
    logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${t.用户名}-${t.显示名} -${dmgHp}气血${dmgMp ? ` -${dmgMp}精力` : ''}`)
    steps.push(hitStep)
  }
  return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false }
}

function resolveControlSkill(name, caster, targets, 技能项, 耗精, state, roundUnits) {
  const effects = [{ type: 'mana-cost', targetKey: caster.key, 消耗: 耗精 }]
  const steps = [{
    type: 'skill-cast',
    actorKey: caster.key,
    actorName: `${caster.用户名}-${caster.显示名}`,
    skillName: 显示技能名(name, caster),
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
    logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${target.用户名}-${target.显示名} 毁`)
    steps.push({ type: 'skill-control', actorKey: caster.key, targetKey: target.key, skillName: 显示技能名(name, caster), success: true, rate: 100, buffName: '毁' })
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
      logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${target.用户名}-${target.显示名} 解除围乱封`)
    } else {
      logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${target.用户名}-${target.显示名} 失效`)
      if (神将技增幅 > 0) {
        const maxHp = Math.max(1, Math.round(Number(state[target.key]?.最大气血) || 1))
        healAmount = Math.min(Math.round(神将技增幅 / 100 * maxHp), maxHp - Math.max(0, Math.round(Number(state[target.key]?.气血 || 0))))
        if (healAmount > 0) {
          effects.push({ type: 'heal', targetKey: target.key, 量: healAmount, 上限: maxHp })
          logs.push(`神将技回复${target.用户名}-${target.显示名}${healAmount}点气血`)
        }
      }
    }
    steps.push({ type: 'skill-control', actorKey: caster.key, targetKey: target.key, skillName: 显示技能名(name, caster), success: ok && has文人Buff, rate, healAmount })
    return { 日志: logs.join('；'), 过程: steps, 效果: effects, 已结算状态: false, 状态提示: stateHint }
  }
  const buffName = name === '画地为牢' ? '围'
    : name === '趁火打劫' ? '乱'
      : name === '四面楚歌' ? '封'
        : name === '固若金汤' ? '固'
          : name === '凌波微步' ? '速'
            : name === '暗渡陈仓' ? '隐' : ''
  const rounds = getControlBuffRounds(name, 技能项)
  const is凌波 = name === '凌波微步'
  const 凌波速度变化 = []
  for (const target of targets) {
    const rates = calcControlSkillRates(name, caster, target, 技能项, state)
    const rate = rates.实际成功率
    const tb = normalizeBuffState(state[target.key]?.buff)
    const has围 = getBuffRounds(tb, '围') > 0
    const has乱 = getBuffRounds(tb, '乱') > 0
    const has封 = getBuffRounds(tb, '封') > 0
    /** 围不可覆盖封/乱；封/乱可互相覆盖并可覆盖围（见策划文档） */
    const blocked围因封乱 = buffName === '围' && (has乱 || has封)
    const hasSame = getBuffRounds(tb, buffName) > 0
    const ok = blocked围因封乱 ? false : !hasSame && rollBattleRate(rate)

    if (is凌波) {
      const tState = state[target.key]
      const tUnit = roundUnits.find(u => u.key === target.key)
      const baseSpeed = Math.max(0, Number(tUnit?.速度) || 0)
      const oldSpeed = getEffectiveSpeed(tUnit, state)
      const oldRank = tUnit?.排名 ?? 999
      const speedPct = roundSkillEffect1(getBuffPanelMetric(凌波微步数值表.速度提升, 技能项) + 神将技增幅值(caster, name))
      const newSpeed = ok ? Math.max(0, Math.round(baseSpeed * (1 + speedPct / 100))) : oldSpeed
      凌波速度变化.push({
        targetKey: target.key,
        targetName: `${target.用户名}-${target.显示名}`,
        原速度: oldSpeed,
        原速度排名: oldRank,
        新速度: newSpeed,
        新速度排名: oldRank,
      })
    }

    let buffValue = null
    let buffValue抗物理 = null
    let buffValue抗法术 = null
    if (name === '固若金汤') {
      buffValue = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.防御, 技能项))
      buffValue抗物理 = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.抗物理, 技能项) + 神将技增幅值(caster, name))
      buffValue抗法术 = roundSkillEffect1(getBuffPanelMetric(固若金汤数值表.抗法术, 技能项))
    } else if (name === '凌波微步') {
      buffValue = roundSkillEffect1(getBuffPanelMetric(凌波微步数值表.速度提升, 技能项) + 神将技增幅值(caster, name))
    }

    if (ok) {
      if ((buffName === '乱' || buffName === '封') && (has围 || has乱 || has封)) {
        const rm = ['围', '乱', '封'].filter((b) => b !== buffName && getBuffRounds(tb, b) > 0)
        if (rm.length) effects.push({ type: 'remove-buffs', targetKey: target.key, buffs: rm })
      }
      const ext = { type: 'apply-buff', targetKey: target.key, buffName, 剩余回合: rounds, 来源: caster.key, 来源技能: name }
      if (buffName === '围' || buffName === '乱' || buffName === '封') {
        ext.成功率 = roundSkillEffect1(rate)
        ext.原成功率 = rates.原成功率
      }
      if (name === '固若金汤') {
        ext.值 = buffValue
        ext.额外值 = buffValue抗物理
        ext.衰减 = buffValue抗法术
      } else if (name === '凌波微步') {
        ext.值 = buffValue
      }
      effects.push(ext)
      logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${target.用户名}-${target.显示名} +${buffName}`)
      if (name === '暗渡陈仓') {
        const 神将技增幅 = 神将技增幅值(caster, name)
        if (神将技增幅 > 0) {
          const maxHp = Math.max(1, Math.round(Number(state[target.key]?.最大气血) || 1))
          const healAmount = Math.min(Math.round(神将技增幅 / 100 * maxHp), maxHp - Math.max(0, Math.round(Number(state[target.key]?.气血 || 0))))
          if (healAmount > 0) {
            effects.push({ type: 'heal', targetKey: target.key, 量: healAmount, 上限: maxHp })
            logs.push(`神将技 ${target.用户名}-${target.显示名} +${healAmount}气血`)
          }
        }
      }
    } else {
      const why = blocked围因封乱 ? '（目标带有封/乱，围困不可覆盖）' : hasSame ? '（已有buff）' : '（未命中）'
      logs.push(`${caster.用户名}-${caster.显示名} ${name} → ${target.用户名}-${target.显示名} ${why}`)
    }
    const step = {
      type: 'skill-hit',
      actorKey: caster.key,
      targetKey: target.key,
      actorName: `${caster.用户名}-${caster.显示名}`,
      targetName: `${target.用户名}-${target.显示名}`,
      skillName: 显示技能名(name, caster),
      success: ok,
      buffName,
      buffValue,
    }
    const hasSuccessRate = ['画地为牢', '趁火打劫', '四面楚歌', '金蝉脱壳', '暗渡陈仓'].includes(name)
    if (hasSuccessRate) {
      step.原成功率 = rates.原成功率
      step.实际成功率 = rates.实际成功率
      step.控制成功 = ok
      step.控制失败 = !ok
    }
    if (name === '固若金汤') {
      step.防御提升 = buffValue
      step.抗物理提升 = buffValue抗物理
      step.抗法术提升 = buffValue抗法术
    }
    if (is凌波) {
      step.速度提升 = buffValue
    }
    steps.push(step)
  }
  if (is凌波 && 凌波速度变化.length) {
    // 临时将新速buff写入state以计算排名
    for (const item of 凌波速度变化) {
      if (!state[item.targetKey]) state[item.targetKey] = {}
      if (!state[item.targetKey].buff) state[item.targetKey].buff = {}
      state[item.targetKey].buff['速'] = {
        名称: '速',
        剩余回合: rounds,
        来源: caster.key,
        值: roundSkillEffect1(getBuffPanelMetric(凌波微步数值表.速度提升, 技能项) + 神将技增幅值(caster, name)),
        来源技能: '凌波微步',
      }
    }
    recomputeRoundRanks(roundUnits, state)
    for (const item of 凌波速度变化) {
      const unit = roundUnits.find(u => u.key === item.targetKey)
      item.新速度排名 = unit?.排名 ?? item.新速度排名
    }
    const 速度排名字符串 = buildSpeedRankString(roundUnits, state, true)
    steps.push({
      type: 'lingbo-speed-change',
      actorKey: caster.key,
      actorName: `${caster.用户名}-${caster.显示名}`,
      skillName: 显示技能名('凌波微步', caster),
      速度提升: roundSkillEffect1(getBuffPanelMetric(凌波微步数值表.速度提升, 技能项) + 神将技增幅值(caster, name)),
      速度排名: 速度排名字符串,
      items: 凌波速度变化.map(i => ({
        targetKey: i.targetKey,
        targetName: i.targetName,
        原速度: i.原速度,
        原速度排名: i.原速度排名,
        新速度: i.新速度,
        新速度排名: i.新速度排名,
      })),
    })
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

function calcControlSkillRates(skillName, caster, target, 技能项, state) {
  const base = getControlSkillPanel(skillName, 技能项)
  const fx = caster.天赋技能效果 || {}
  const mount = getSkillMountBonus(caster, skillName)
  const shen = 神将技增幅值(caster, skillName)
  if (skillName === '固若金汤' || skillName === '凌波微步' || skillName === '毁天灭地') {
    return { 原成功率: 100, 实际成功率: 100 }
  }
  if (!['画地为牢', '趁火打劫', '四面楚歌', '金蝉脱壳', '暗渡陈仓'].includes(skillName)) {
    return { 原成功率: 0, 实际成功率: 0 }
  }
  let 原 = base
  let 实际 = base
  if (skillName === '画地为牢') {
    原 += Number(fx.围困 || 0) + shen + mount
    实际 = 原
    const fortify = getFortifyBonus(state, target.key)
    实际 -= Math.max(0, (Number(target.抗围困) || 0) + fortify.抗法术)
  } else if (skillName === '趁火打劫') {
    原 += Number(fx.扰乱 || 0) + shen + mount
    实际 = 原
    const fortify = getFortifyBonus(state, target.key)
    实际 -= Math.max(0, (Number(target.抗扰乱) || 0) + fortify.抗法术)
  } else if (skillName === '四面楚歌') {
    原 += Number(fx.封锁 || 0) + shen + mount
    实际 = 原
    const fortify = getFortifyBonus(state, target.key)
    实际 -= Math.max(0, (Number(target.抗封锁) || 0) + fortify.抗法术)
  } else if (skillName === '金蝉脱壳') {
    原 += mount
    实际 = 原
  } else if (skillName === '暗渡陈仓') {
    原 += Number(fx.暗渡 || 0) + mount
    实际 = 原
  }
  return { 原成功率: roundSkillEffect1(Math.max(0, 原)), 实际成功率: roundSkillEffect1(Math.max(0, 实际)) }
}

function calcControlSkillRate(skillName, caster, target, 技能项, state) {
  return calcControlSkillRates(skillName, caster, target, 技能项, state).实际成功率
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
      日志: null,
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
  let mateName = null
  let rawDmg = 0
  let floatDmg = 0
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
    mode = '忽视攻击'
    rawDmg = atk
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round(floatDmg))
  } else if (rollBattleRate(attacker.忽视率)) {
    mode = '忽视攻击'
    rawDmg = atk
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round(floatDmg))
  } else if (rollBattleRate(attacker.暴击率)) {
    mode = '暴击攻击'
    const critPower = Number(attacker.暴击力) || 0
    rawDmg = atk * (1.5 + critPower / 100)
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round((floatDmg - def) * resFactor))
  } else if (rollBattleRate(attacker.致命率)) {
    mode = '致命攻击'
    const doomK = Number(attacker.夺命系数) || 0
    const doom = (Number(target.最大气血) || 0) * 0.2 * (1 + doomK)
    rawDmg = atk + doom
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round((floatDmg - def) * resFactor))
  } else if (rollBattleRate(attacker.合击率)) {
    mode = '合击攻击'
    const mate = findFastestAliveMate(roundUnits, attacker)
    mateName = mate ? `${mate.用户名}-${mate.显示名}` : ''
    const mateAtk = Math.max(0, Math.round(Number(mate?.战斗攻击) || 0))
    const teamAtk = atk + mateAtk
    rawDmg = teamAtk
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round((floatDmg - def) * resFactor))
  } else {
    mode = '普通攻击'
    rawDmg = atk
    floatDmg = rawDmg * 浮动
    dmg = Math.max(1, Math.round((floatDmg - def) * resFactor))
  }
  effects.push({ type: 'damage', targetKey: target.key, 伤害: dmg })
  steps.push({
    type: 'melee',
    actorKey: attacker.key,
    targetKey: target.key,
    actorName: `${attacker.用户名}-${attacker.显示名}`,
    targetName: `${target.用户名}-${target.显示名}`,
    attackKind: mode,
    rawDamage: Math.round(rawDmg),
    floatDamage: Math.round(floatDmg),
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
      const counterRawDmg = counterAtk
      const counterFloat = counterRawDmg * damageFloatMultiplier()
      let counterDmg = Math.max(1, Math.round((counterFloat - counterDef) * counterFactor))
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
        rawDamage: Math.round(counterRawDmg),
        floatDamage: Math.round(counterFloat),
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
    log: `${attacker.用户名}-${attacker.显示名} ${mode} ${target.用户名}-${target.显示名} -${dmg}`,
    steps,
    effects,
  }
}

function execDefend(action, unit, roundUnits, state) {
  return {
    日志: null,
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
          二次判定通过: false,
        }
        if (eff.成功率 != null) buff[name].成功率 = roundSkillEffect1(Number(eff.成功率))
        if (eff.原成功率 != null) buff[name].原成功率 = roundSkillEffect1(Number(eff.原成功率))
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
