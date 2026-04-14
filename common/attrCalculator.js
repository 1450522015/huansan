import {
  装备部位列表,
  解析装备格汇总,
  坐骑战斗加成,
  修正属性分配,
  计算风格,
  天赋百分比,
  当前角色分类,
  等级系数,
  主将战斗职业轴,
  副将有效成长,
  副将无双成长增量,
  副将初值中点,
  展开战斗用副将占位,
  副将默契战斗加成,
  帮派战斗加成,
  职业原始战斗属性,
  主将前世槽攻血连乘系数,
  主将前世槽速度连乘系数,
  主将前世槽抗性加算,
  主将今世抗性加算,
  天赋效果类别,
} from './gameCatalog.js'

const 基础属性键 = ['气血', '精力', '攻击', '防御', '速度']

const 特殊属性键 = [
  '命中率',
  '暴击率',
  '反击率',
  '致命率',
  '法爆率',
  '反震率',
  '躲避率',
  '抗物理',
  '抗玄击',
  '抗封锁',
  '抗扰乱',
  '抗围困',
  '抗风沙',
  '抗妖火',
  '抗毒术',
  '抗落雷',
  '暴击力',
  '穿透率',
  '爆伤力',
  '法伤力',
  '连击率',
  '连击数',
  '法穿率',
]

const 四维键 = ['体质', '智力', '力量', '敏捷']

/** 与 `finalizeBattleResult` 输出一致的数值键；字符串型（如连击数 `2~3`）跳过 */
const 战斗属性输出数值键 = [...基础属性键, ...特殊属性键, '忽视率']

function emptyAcc() {
  const acc = {}
  for (const k of [...基础属性键, ...特殊属性键, ...四维键]) acc[k] = 0
  acc.忽视率 = 0
  return acc
}

function sum主将装备与宝石(装备) {
  const acc = emptyAcc()
  if (!装备 || typeof 装备 !== 'object') return acc
  for (const 部位 of 装备部位列表) {
    const 格 = 装备[部位]
    if (!格 || typeof 格 !== 'object') continue
    const merged = 解析装备格汇总(部位, 格)
    for (const [k, v] of Object.entries(merged)) {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      if (acc[k] === undefined) acc[k] = 0
      acc[k] += n
    }
  }
  return acc
}

function sum副将宝石(宝石列表) {
  const acc = emptyAcc()
  if (!Array.isArray(宝石列表)) return acc
  for (const g of 宝石列表.slice(0, 9)) {
    if (!g || typeof g !== 'object' || !g.属性) continue
    const val = Number(g.数值)
    if (!Number.isFinite(val)) continue
    const attr = g.属性
    if (acc[attr] === undefined) acc[attr] = 0
    acc[attr] += val
  }
  return acc
}

function mergeNumericObjects(...parts) {
  const out = {}
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'string') {
        if (out[k] === undefined) out[k] = v
        continue
      }
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      if (typeof out[k] === 'string') continue
      out[k] = (out[k] || 0) + n
    }
  }
  return out
}

function 有效四维(分配, 装备四维加成) {
  return {
    体质: (Number(分配?.体质) || 0) + (Number(装备四维加成?.体质) || 0),
    智力: (Number(分配?.智力) || 0) + (Number(装备四维加成?.智力) || 0),
    力量: (Number(分配?.力量) || 0) + (Number(装备四维加成?.力量) || 0),
    敏捷: (Number(分配?.敏捷) || 0) + (Number(装备四维加成?.敏捷) || 0),
  }
}

/** 仅五维，不含职业原始常数（调试分层第 2 层） */
function 主将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, 职业经历) {
  const { 体质: 体, 智力: 智, 力量: 力, 敏捷: 敏 } = 有效四维(分配, 装备四维加成)
  const lv = Math.min(160, Math.max(1, Number(等级) || 1))
  const K = 等级系数(lv)
  const 轴 = 主将战斗职业轴(角色分类)
  const m = 主将前世槽攻血连乘系数(职业经历)
  let 气血
  let 精力
  let 攻击
  let 速度
  const 防御 = 体 * 2
  if (轴 === '武') {
    气血 = 360 + 体 * 1.1 * K * m.气血
    精力 = 200 + 智 * 0.6 * K
    攻击 = 80 + 力 * 1.3 * K * 0.2 * m.攻击
    速度 = 10 + 敏
  } else if (轴 === '文') {
    气血 = 330 + 体 * 1.1 * K * m.气血
    精力 = 280 + 智 * 1.0 * K
    攻击 = 70 + 力 * 1.0 * K * 0.2 * m.攻击
    速度 = (10 + 敏) * 0.95
  } else {
    气血 = 300 + 体 * 1.0 * K * m.气血
    精力 = 360 + 智 * 1.3 * K
    攻击 = 60 + 力 * 0.7 * K * 0.2 * m.攻击
    速度 = (10 + 敏) * 1.1
  }
  return { 气血, 精力, 攻击, 防御, 速度 }
}

/** 主将：职业轴取当前世；前世攻/血连乘见 `主将前世槽攻血连乘系数`；前世速度乘在加算层之后 */
function 主将战斗基础(分配, 等级, 装备四维加成, 角色分类, 职业经历) {
  const 五 = 主将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, 职业经历)
  const 轴 = 主将战斗职业轴(角色分类)
  return { ...五, ...职业原始战斗属性(轴, true) }
}

/** 仅五维，不含职业原始常数（调试分层第 2 层）。前世攻/血/速度与主将同源：`主将前世槽攻血连乘系数`、`主将前世槽速度连乘系数`（见 docs/私有文档/副将.md）。 */
function 副将战斗基础五维用成长(分配, 等级, 装备四维加成, 角色分类, cfg, 成长) {
  const { 体质: 体, 智力: 智, 力量: 力, 敏捷: 敏 } = 有效四维(分配, 装备四维加成)
  const lv = Math.min(160, Math.max(1, Number(等级) || 1))
  const 初 = 副将初值中点(cfg.人物)
  const 职业经历 = cfg.职业经历
  const m = 主将前世槽攻血连乘系数(职业经历)
  const v速 = 主将前世槽速度连乘系数(职业经历)
  const 气血 = 初.血 + (初.血 * 0.7 + 体) * 成长 * lv * m.气血
  const 精力 = 初.精 + (初.精 * 0.7 + 智) * 成长 * lv
  const 攻击 = 初.攻 + (初.攻 * 0.7 + 力) * 成长 * lv * 0.2 * m.攻击
  const 防御 = 体 * 2
  const 轴 = 主将战斗职业轴(角色分类)
  const 速无前世 = (初.速 + 敏) * 成长
  const 速基 = Math.round(速无前世) * v速
  let 速度
  if (轴 === '文') 速度 = 速基 * 0.9
  else if (轴 === '异') 速度 = 速基 * 1.02
  else 速度 = 速基
  return { 气血, 精力, 攻击, 防御, 速度 }
}

function 副将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, cfg, 含无双成长增量 = false) {
  let 成长 = 副将有效成长(cfg.人物, {
    星级: cfg.星级,
    真: cfg.真,
    转数: cfg.转数,
  })
  if (含无双成长增量) {
    成长 = Math.round((成长 + 副将无双成长增量(cfg.无双等级)) * 1000) / 1000
  }
  return 副将战斗基础五维用成长(分配, 等级, 装备四维加成, 角色分类, cfg, 成长)
}

/** 副将：docs/项目介绍/15-deputy.md；前世攻/血/速与主将同源（五维内乘）；特殊战斗常数见 16-class-bonuses.md §1 */
function 副将战斗基础(分配, 等级, 装备四维加成, 角色分类, cfg, 含无双成长增量 = false) {
  const 五 = 副将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, cfg, 含无双成长增量)
  const 轴 = 主将战斗职业轴(角色分类)
  return { ...五, ...职业原始战斗属性(轴, false) }
}

/** 步骤 3：加法型天赋（与装备等同加）；强攻/强血见 `收集天赋乘系数` */
function 应用天赋加法部分(天赋列表) {
  const acc = emptyAcc()
  if (!Array.isArray(天赋列表)) return acc
  for (const t of 天赋列表) {
    if (!t || typeof t !== 'object' || !t.名称) continue
    const name = t.名称
    const lv = Number(t.等级) || 1
    const p = 天赋百分比(name, lv)
    if (!p) continue
    if (name === '忽视') {
      acc.忽视率 += p
      continue
    }
    if (name === '暴击') acc.暴击力 += p
    if (name === '法爆') acc.法爆率 += p
    if (name === '爆率') acc.暴击率 += p
    if (name === '反击') acc.反击率 += p
    if (name === '躲避') acc.躲避率 += p
    if (name === '致命') acc.致命率 += p
  }
  return acc
}

function 汇总天赋技能占位(天赋列表) {
  const out = {}
  if (!Array.isArray(天赋列表)) return out
  for (const t of 天赋列表) {
    if (!t || typeof t !== 'object' || !t.名称) continue
    if (天赋效果类别(t.名称) !== '技能占位') continue
    const p = 天赋百分比(t.名称, Number(t.等级) || 1)
    out[t.名称] = Math.round(p * 100) / 100
  }
  return out
}

/**
 * 天赋强攻/强血乘算前：对上述键做一次四舍五入取整（主将速度乘已应用）。
 * 取整后的攻击、气血再乘 ∏(1+p/100)；避免未取整底数导致乘算后再取整与「先取整再乘」不一致（如 11894.6×1.5→17842，round(11894.6)×1.5→17843）。
 */
function 天赋乘算前战斗属性四舍五入(merged) {
  if (!merged || typeof merged !== 'object') return
  for (const k of 战斗属性输出数值键) {
    const v = merged[k]
    if (v === undefined || v === null) continue
    if (typeof v === 'string') continue
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    merged[k] = Math.round(n)
  }
}

/** 步骤 4：强攻/强血对「步骤 3 合并且已取整」后的攻击、气血整体连乘，∏(1+p/100) */
function 收集天赋乘系数(天赋列表) {
  let 攻 = 1
  let 血 = 1
  if (!Array.isArray(天赋列表)) return { 攻, 血 }
  for (const t of 天赋列表) {
    if (!t || typeof t !== 'object' || !t.名称) continue
    const p = 天赋百分比(t.名称, Number(t.等级) || 1)
    if (!p) continue
    if (t.名称 === '强攻') 攻 *= 1 + p / 100
    if (t.名称 === '强血') 血 *= 1 + p / 100
  }
  return { 攻, 血 }
}

function finalizeBattleResult(pack) {
  if (!pack) return null
  const { 风格, 角色分类, merged, cfg } = pack
  const result = {
    风格,
    角色分类,
    ...Object.fromEntries(基础属性键.map((k) => [k, Math.max(0, Math.round(merged[k] || 0))])),
  }
  for (const k of 特殊属性键) {
    const v = merged[k]
    result[k] = typeof v === 'string' ? v : Math.max(0, Math.round(v || 0))
  }
  result.忽视率 = Math.max(0, Math.round(merged.忽视率 || 0))
  const sk = 汇总天赋技能占位(cfg?.天赋)
  if (Object.keys(sk).length) result.天赋技能效果 = sk
  return result
}

/** 与正式计算同一条流水线，供调试查看分层与中间量（勿依赖字段名做持久化协议） */
function computeUnitLayers(cfg, { 主将: 是否主将, 副将无双成长: 副将无双成长 = false } = {}) {
  if (!cfg || typeof cfg !== 'object') return null
  const 等级 = cfg.等级 ?? 160
  const 分配 = 修正属性分配(等级, cfg.属性分配)
  const 风格 = 计算风格(等级, 分配)
  const lv公式 = Math.min(160, Math.max(1, Number(等级) || 1))

  let 装备和 = {}
  let 宝石四维 = { 体质: 0, 智力: 0, 力量: 0, 敏捷: 0 }
  if (是否主将 && cfg.装备) {
    装备和 = sum主将装备与宝石(cfg.装备)
    for (const k of 四维键) {
      宝石四维[k] = Number(装备和[k]) || 0
      delete 装备和[k]
    }
  }
  if (!是否主将) {
    const g = sum副将宝石(cfg.宝石)
    for (const k of 四维键) {
      宝石四维[k] = Number(g[k]) || 0
    }
    for (const [k, v] of Object.entries(g)) {
      if (四维键.includes(k)) continue
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      装备和[k] = (装备和[k] || 0) + n
    }
  }

  const 骑 =
    是否主将 && cfg.坐骑
      ? 坐骑战斗加成(cfg.坐骑.种类, cfg.坐骑.等级, cfg.坐骑.转数)
      : {}

  const 角色分类 = 当前角色分类(cfg)
  const 维有效 = 有效四维(分配, 宝石四维)
  const 五维基础 = 是否主将
    ? 主将战斗基础五维(分配, 等级, 宝石四维, 角色分类, cfg.职业经历)
    : 副将战斗基础五维(分配, 等级, 宝石四维, 角色分类, cfg, !是否主将 && 副将无双成长)
  const baseCore = 是否主将
    ? 主将战斗基础(分配, 等级, 宝石四维, 角色分类, cfg.职业经历)
    : 副将战斗基础(分配, 等级, 宝石四维, 角色分类, cfg, !是否主将 && 副将无双成长)
  const 天加 = 应用天赋加法部分(cfg.天赋)
  const 天乘 = 收集天赋乘系数(cfg.天赋)

  const 默契 =
    !是否主将 ? 副将默契战斗加成(cfg.默契度, 主将战斗职业轴(角色分类)) : {}

  const 帮 =
    是否主将 && cfg.帮派 ? 帮派战斗加成(cfg.帮派.主抗性, cfg.帮派.副抗性) : {}

  const 前世抗 = 主将前世槽抗性加算(cfg.职业经历)
  const 今世抗 = 主将今世抗性加算(角色分类)

  const merged加完 = mergeNumericObjects(baseCore, 前世抗, 今世抗, 装备和, 骑, 天加, 帮, 默契)
  const merged = { ...merged加完 }
  if (是否主将) {
    const v速 = 主将前世槽速度连乘系数(cfg.职业经历)
    const 速加算后 = Number(merged.速度) || 0
    merged.速度 = Math.round(速加算后) * v速
  }
  天赋乘算前战斗属性四舍五入(merged)

  const meta = {
    等级配置: 等级,
    等级用于公式: lv公式,
    等级系数K: 等级系数(lv公式),
    角色分类,
    战斗职业轴: 主将战斗职业轴(角色分类),
    宝石四维,
    属性分配修正后: 分配,
    天赋乘法系数: { 攻击总倍率: 天乘.攻, 气血总倍率: 天乘.血 },
  }
  if (是否主将) {
    const ab = 主将前世槽攻血连乘系数(cfg.职业经历)
    meta.前世槽连乘 = {
      攻击倍率: ab.攻击,
      气血倍率: ab.气血,
      速度倍率: 主将前世槽速度连乘系数(cfg.职业经历),
    }
    meta.主将职业抗性加算 = { 前世: 前世抗, 今世: 今世抗 }
  }
  if (!是否主将) {
    meta.副将初值中点 = 副将初值中点(cfg.人物)
    meta.副将有效成长 = 副将有效成长(cfg.人物, {
      星级: cfg.星级,
      真: cfg.真,
      转数: cfg.转数,
    })
    const ab = 主将前世槽攻血连乘系数(cfg.职业经历)
    meta.副将前世槽连乘 = {
      攻击倍率: ab.攻击,
      气血倍率: ab.气血,
      速度倍率: 主将前世槽速度连乘系数(cfg.职业经历),
    }
    meta.副将职业抗性加算 = { 前世: 前世抗, 今世: 今世抗 }
  }

  /** 调试：有效四维 → 仅五维 → 加算未取整 → 天赋乘算前已取整 → 强攻强血乘算后（未最终取整） */
  const merged乘算前取整快照 = { ...merged }
  merged.攻击 = (Number(merged.攻击) || 0) * 天乘.攻
  merged.气血 = (Number(merged.气血) || 0) * 天乘.血
  const layers = [
    { 名称: '1·有效四维（已加算）', 属性: { ...维有效 } },
    { 名称: '2·四维对应属性（仅五维）', 属性: { ...五维基础 } },
    { 名称: '3·加算后（全量·未取整）', 属性: { ...merged加完 } },
    { 名称: '4·天赋乘算前（已四舍五入·含主将速度乘）', 属性: { ...merged乘算前取整快照 } },
    { 名称: '5·强攻强血乘算后（未最终取整）', 属性: { ...merged } },
  ]

  return { 风格, 角色分类, merged, layers, meta, cfg }
}

function 计算单位(cfg, { 主将: 是否主将, 副将无双成长: 副将无双成长 = false } = {}) {
  const pack = computeUnitLayers(cfg, { 主将: 是否主将, 副将无双成长 })
  if (!pack) return null
  return finalizeBattleResult({ ...pack, cfg })
}

export function computeAttrsFromConfig(配置) {
  if (!配置 || typeof 配置 !== 'object') {
    return { 主将: null, 副将1: null, 副将2: null, 副将3: null }
  }
  const flat = 展开战斗用副将占位(配置)
  return {
    主将: 计算单位(flat.主将, { 主将: true }),
    副将1: 计算单位(flat.副将1, { 主将: false }),
    副将2: 计算单位(flat.副将2, { 主将: false }),
    副将3: 计算单位(flat.副将3, { 主将: false }),
  }
}

/** 单单位战斗属性（副将配置页按槽即时算，与是否「已战」无关） */
export function computeUnitAttrs(cfg, { 主将: 是否主将 }) {
  return 计算单位(cfg, { 主将: 是否主将, 副将无双成长: false })
}

/**
 * 副将走与 `computeUnitAttrs` 相同流水线，仅在基础五维使用 **有效成长 + 无双增量**（`副将无双成长增量`）。
 */
export function computeUnitAttrs副将无双形态(cfg) {
  return 计算单位(cfg, { 主将: false, 副将无双成长: true })
}

/**
 * 调试：返回与 `computeUnitAttrs` 一致的最终结果；分层为五步（含「天赋乘算前已取整」与「强攻强血乘算后」）。
 * 仅用于开发/排错；字段可能随实现调整。
 */
export function computeUnitBattleDebug(cfg, { 主将: 是否主将 }) {
  const pack = computeUnitLayers(cfg, { 主将: 是否主将, 副将无双成长: false })
  if (!pack) return null
  return {
    结果: finalizeBattleResult({ ...pack, cfg }),
    分层: pack.layers,
    /** 强攻强血乘算后、`finalizeBattleResult` 再四舍五入前的 merged */
    乘算后未取整: { ...pack.merged },
    中间: pack.meta,
  }
}

export function computeAttrsFromConfigDebug(配置) {
  if (!配置 || typeof 配置 !== 'object') {
    return { 主将: null, 副将1: null, 副将2: null, 副将3: null }
  }
  const flat = 展开战斗用副将占位(配置)
  return {
    主将: computeUnitBattleDebug(flat.主将, { 主将: true }),
    副将1: computeUnitBattleDebug(flat.副将1, { 主将: false }),
    副将2: computeUnitBattleDebug(flat.副将2, { 主将: false }),
    副将3: computeUnitBattleDebug(flat.副将3, { 主将: false }),
  }
}
