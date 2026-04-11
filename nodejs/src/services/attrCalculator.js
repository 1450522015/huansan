import {
  装备部位列表,
  解析装备格,
  坐骑战斗加成,
  修正属性分配,
  计算风格,
  天赋百分比,
} from '../../../data/gameCatalog.js'

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
    const partStats = 解析装备格(部位, 格)
    for (const [k, v] of Object.entries(partStats)) {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      if (acc[k] === undefined) acc[k] = 0
      acc[k] += n
    }
    const gems = Array.isArray(格.宝石) ? 格.宝石 : []
    for (const g of gems) {
      if (!g || typeof g !== 'object' || !g.属性) continue
      const val = Number(g.数值)
      if (!Number.isFinite(val)) continue
      const attr = g.属性
      if (acc[attr] === undefined) acc[attr] = 0
      acc[attr] += val
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

/** 四维（含宝石/战靴提供的四维）推导基础战斗属性 */
function 四维基础(分配, 等级, 装备四维加成) {
  const 体 = (Number(分配?.体质) || 0) + (Number(装备四维加成?.体质) || 0)
  const 智 = (Number(分配?.智力) || 0) + (Number(装备四维加成?.智力) || 0)
  const 力 = (Number(分配?.力量) || 0) + (Number(装备四维加成?.力量) || 0)
  const 敏 = (Number(分配?.敏捷) || 0) + (Number(装备四维加成?.敏捷) || 0)
  const lv = Math.min(160, Math.max(1, Number(等级) || 1))
  const scale = lv / 160
  return {
    气血: Math.round((600 + 体 * 42 + 力 * 10) * scale),
    精力: Math.round((350 + 智 * 36 + 体 * 3) * scale),
    攻击: Math.round((100 + 力 * 8 + 智 * 2) * scale),
    防御: Math.round((90 + 体 * 5 + 力 * 2) * scale),
    速度: Math.round((70 + 敏 * 3.5 + 力 * 0.8) * scale),
    命中率: Math.round(72 + 敏 * 0.06),
    躲避率: Math.round(敏 * 0.07),
    暴击率: Math.round(力 * 0.035),
    穿透率: Math.round(力 * 0.028),
  }
}

function 应用天赋到战斗(天赋列表, 基础攻击, 基础气血, 基础爆伤) {
  const acc = emptyAcc()
  if (!Array.isArray(天赋列表)) return acc
  for (const t of 天赋列表) {
    if (!t || typeof t !== 'object' || !t.名称) continue
    const name = t.名称
    const lv = Number(t.等级) || 1
    const p = 天赋百分比(name, lv)
    if (!p) continue
    if (name === '强攻') acc.攻击 += (基础攻击 * p) / 100
    if (name === '强血') acc.气血 += (基础气血 * p) / 100
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

function 计算单位(cfg, { 主将: 是否主将 }) {
  if (!cfg || typeof cfg !== 'object') return null
  const 等级 = cfg.等级 ?? 160
  const 分配 = 修正属性分配(等级, cfg.属性分配)
  const 风格 = 计算风格(等级, 分配)

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
    Object.assign(装备和, g)
  }

  const 骑 = 是否主将 && cfg.坐骑 ? 坐骑战斗加成(cfg.坐骑.种类, cfg.坐骑.等级) : {}

  const baseCore = 四维基础(分配, 等级, 宝石四维)
  const 基础攻击 = baseCore.攻击
  const 基础气血 = baseCore.气血
  const 天 = 应用天赋到战斗(cfg.天赋, 基础攻击, 基础气血, 0)

  const merged = mergeNumericObjects(baseCore, 装备和, 骑, 天)
  const result = {
    风格,
    角色分类: cfg.角色分类,
    ...Object.fromEntries(基础属性键.map((k) => [k, Math.max(0, Math.round(merged[k] || 0))])),
  }
  for (const k of 特殊属性键) {
    result[k] = Math.max(0, Math.round(merged[k] || 0))
  }
  return result
}

export function computeAttrsFromConfig(配置) {
  if (!配置 || typeof 配置 !== 'object') {
    return { 主将: null, 副将1: null, 副将2: null, 副将3: null }
  }
  return {
    主将: 计算单位(配置.主将, { 主将: true }),
    副将1: 计算单位(配置.副将1, { 主将: false }),
    副将2: 计算单位(配置.副将2, { 主将: false }),
    副将3: 计算单位(配置.副将3, { 主将: false }),
  }
}

