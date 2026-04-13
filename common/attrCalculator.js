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
  副将初值中点,
  展开战斗用副将占位,
  副将默契战斗加成,
  帮派战斗加成,
  职业原始战斗属性,
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

function emptyAcc() {
  const acc = {}
  for (const k of [...基础属性键, ...特殊属性键, ...四维键]) acc[k] = 0
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
      const n = Number(v)
      if (!Number.isFinite(n)) continue
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
function 主将战斗基础五维(分配, 等级, 装备四维加成, 角色分类) {
  const { 体质: 体, 智力: 智, 力量: 力, 敏捷: 敏 } = 有效四维(分配, 装备四维加成)
  const lv = Math.min(160, Math.max(1, Number(等级) || 1))
  const K = 等级系数(lv)
  const 轴 = 主将战斗职业轴(角色分类)
  let 气血
  let 精力
  let 攻击
  let 速度
  const 防御 = 体 * 2
  if (轴 === '武') {
    气血 = 360 + 体 * 1.1 * K
    精力 = 200 + 智 * 0.6 * K
    攻击 = 80 + 力 * 1.3 * K * 0.2
    速度 = 10 + 敏
  } else if (轴 === '文') {
    气血 = 330 + 体 * 20 * 1.1 * K
    精力 = 280 + 智 * 20 * 1.0 * K
    攻击 = 70 + 力 * 1.0 * K * 0.2
    速度 = (10 + 敏) * 0.8
  } else {
    气血 = 300 + 体 * 20 * 1.0 * K
    精力 = 360 + 智 * 20 * 1.3 * K
    攻击 = 60 + 力 * 0.7 * K * 0.2
    速度 = (10 + 敏) * 1.1
  }
  return { 气血, 精力, 攻击, 防御, 速度 }
}

/** 主将：docs/项目介绍/主将.md（职业轴取当前世；武人条按原文无体质×20） */
function 主将战斗基础(分配, 等级, 装备四维加成, 角色分类) {
  const 五 = 主将战斗基础五维(分配, 等级, 装备四维加成, 角色分类)
  const 轴 = 主将战斗职业轴(角色分类)
  return { ...五, ...职业原始战斗属性(轴) }
}

/** 仅五维，不含职业原始常数（调试分层第 2 层） */
function 副将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, cfg) {
  const { 体质: 体, 智力: 智, 力量: 力, 敏捷: 敏 } = 有效四维(分配, 装备四维加成)
  const lv = Math.min(160, Math.max(1, Number(等级) || 1))
  const 初 = 副将初值中点(cfg.人物)
  const 成长 = 副将有效成长(cfg.人物, {
    星级: cfg.星级,
    真: cfg.真,
    转数: cfg.转数,
  })
  const 气血 = 初.血 * (1 + 0.91 * lv) + 体 * 成长 * lv
  const 精力 = 初.精 * (1 + 0.91 * lv) + 智 * 成长 * lv
  const 攻击 = 初.攻 * (0.002 * lv) * lv + 力 * 成长 * lv * 0.2
  const 防御 = 体 * 2
  const 轴 = 主将战斗职业轴(角色分类)
  const 速基 = (初.速 + 敏) * 成长
  let 速度
  if (轴 === '文') 速度 = 速基 * 0.9
  else if (轴 === '异') 速度 = 速基 * 1.02
  else 速度 = 速基
  return { 气血, 精力, 攻击, 防御, 速度 }
}

/** 副将：docs/项目介绍/副将.md；速度按当前世 武/文/异；特殊战斗常数见 职业加成.md §1 */
function 副将战斗基础(分配, 等级, 装备四维加成, 角色分类, cfg) {
  const 五 = 副将战斗基础五维(分配, 等级, 装备四维加成, 角色分类, cfg)
  const 轴 = 主将战斗职业轴(角色分类)
  return { ...五, ...职业原始战斗属性(轴) }
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
    if (name === '暴击') acc.爆伤力 += p
    if (name === '法爆') acc.法爆率 += p
    if (name === '爆率') acc.暴击率 += p
    if (name === '反击') acc.反击率 += p
    if (name === '躲避') acc.躲避率 += p
    if (name === '致命') acc.致命率 += p
    if (name === '忽视') acc.穿透率 += p * 0.5
    if (name === '风沙' || name === '妖火' || name === '落雷' || name === '毒术') {
      acc.法伤力 += p * 2
    }
  }
  return acc
}

/** 步骤 4：强攻/强血对步骤 3 后的攻击、气血整体连乘，∏(1+p/100) */
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

function finalizeBattleResult({ 风格, 角色分类, merged }) {
  const result = {
    风格,
    角色分类,
    ...Object.fromEntries(基础属性键.map((k) => [k, Math.max(0, Math.round(merged[k] || 0))])),
  }
  for (const k of 特殊属性键) {
    result[k] = Math.max(0, Math.round(merged[k] || 0))
  }
  return result
}

/** 与正式计算同一条流水线，供调试查看分层与中间量（勿依赖字段名做持久化协议） */
function computeUnitLayers(cfg, { 主将: 是否主将 }) {
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
    ? 主将战斗基础五维(分配, 等级, 宝石四维, 角色分类)
    : 副将战斗基础五维(分配, 等级, 宝石四维, 角色分类, cfg)
  const baseCore = 是否主将
    ? 主将战斗基础(分配, 等级, 宝石四维, 角色分类)
    : 副将战斗基础(分配, 等级, 宝石四维, 角色分类, cfg)
  const 天加 = 应用天赋加法部分(cfg.天赋)
  const 天乘 = 收集天赋乘系数(cfg.天赋)

  const 默契 = !是否主将 ? 副将默契战斗加成(cfg.默契度) : {}

  const 帮 =
    是否主将 && cfg.帮派 ? 帮派战斗加成(cfg.帮派.主抗性, cfg.帮派.副抗性) : {}

  const merged加完 = mergeNumericObjects(baseCore, 装备和, 骑, 天加, 帮, 默契)
  const merged = { ...merged加完 }
  merged.攻击 = (Number(merged.攻击) || 0) * 天乘.攻
  merged.气血 = (Number(merged.气血) || 0) * 天乘.血

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
  if (!是否主将) {
    meta.副将初值中点 = 副将初值中点(cfg.人物)
    meta.副将有效成长 = 副将有效成长(cfg.人物, {
      星级: cfg.星级,
      真: cfg.真,
      转数: cfg.转数,
    })
  }

  /** 调试四层：有效四维 → 仅五维 → 加算全量 → 乘算全量（未取整）；与面板展示一致 */
  const layers = [
    { 名称: '1·有效四维（已加算）', 属性: { ...维有效 } },
    { 名称: '2·四维对应属性（仅五维）', 属性: { ...五维基础 } },
    { 名称: '3·加算后（全量）', 属性: { ...merged加完 } },
    { 名称: '4·乘算后（全量·未取整）', 属性: { ...merged } },
  ]

  return { 风格, 角色分类, merged, layers, meta }
}

function 计算单位(cfg, { 主将: 是否主将 }) {
  const pack = computeUnitLayers(cfg, { 主将: 是否主将 })
  if (!pack) return null
  return finalizeBattleResult(pack)
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
  return 计算单位(cfg, { 主将: 是否主将 })
}

/**
 * 调试：返回与 `computeUnitAttrs` 一致的最终结果；分层为四步（有效四维→仅五维→加算全量→乘算未取整）。
 * 仅用于开发/排错；字段可能随实现调整。
 */
export function computeUnitBattleDebug(cfg, { 主将: 是否主将 }) {
  const pack = computeUnitLayers(cfg, { 主将: 是否主将 })
  if (!pack) return null
  return {
    结果: finalizeBattleResult(pack),
    分层: pack.layers,
    /** 同分层第 4 层：乘算后、四舍五入成整数前 */
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
