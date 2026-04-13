/**
 * 游戏静态表与计算（机器可读，供 mobile + nodejs 共用）
 *
 * 人类可读的完整规格说明见：docs/项目介绍/
 * （装备/坐骑/宝石/天赋分段/属性点与风格等均以该目录 Markdown 为准，改表请先改文档再同步代码）
 *
 * 任务对齐参考：docs/当前任务.md
 */

export const 装备部位列表 = ['头盔', '项饰', '武器', '护腕', '铠甲', '战靴']

export const 角色分类列表 = ['男武', '男文', '男异', '女武', '女文', '女异']

export function 解析角色分类(角色分类) {
  const s = String(角色分类 || '男武')
  const 性别 = s.startsWith('女') ? '女' : '男'
  const 职业 = s.includes('武') ? '武人' : s.includes('文') ? '文人' : '异人'
  return { 性别, 职业 }
}

/**
 * 帮派能力（docs/项目介绍/主将.md）：主抗性 +20、副抗性 +10；可只配主、只配副、不配或都配；都配时不可相同。
 */
export const 帮派抗性可选 = [
  '抗物理',
  '抗封锁',
  '抗扰乱',
  '抗围困',
  '抗风沙',
  '抗妖火',
  '抗毒术',
  '抗落雷',
]

export function normalize帮派抗性项(v) {
  if (v == null || v === '') return null
  const s = String(v).trim()
  return 帮派抗性可选.includes(s) ? s : null
}

/** 主有则 +20，副有则 +10；同键不累加冲突（校验保证主≠副） */
export function 帮派战斗加成(主抗性, 副抗性) {
  const 主 = normalize帮派抗性项(主抗性)
  const 副 = normalize帮派抗性项(副抗性)
  const o = {}
  if (主) o[主] = 20
  if (副) o[副] = 10
  return o
}

/** @returns {string} 空串表示合法 */
export function validate帮派配置(帮派) {
  if (!帮派 || typeof 帮派 !== 'object') return ''
  const 主 = normalize帮派抗性项(帮派.主抗性)
  const 副 = normalize帮派抗性项(帮派.副抗性)
  if (帮派.主抗性 != null && 帮派.主抗性 !== '' && !主) return '帮派主抗性不合法'
  if (帮派.副抗性 != null && 帮派.副抗性 !== '' && !副) return '帮派副抗性不合法'
  if (主 && 副 && 主 === 副) return '帮派主抗性与副抗性不能相同'
  return ''
}

export const 坐骑列表 = [
  '战马',
  '乌云踏雪',
  '里飞沙',
  '绝影',
  '夜照玉狮子',
  '的卢',
  '爪黄飞电',
  '燎原火',
  '赤兔胭脂兽',
  '逍遥灰影',
  '天马白鸽',
  '如山乌孙',
  '百里惊帆',
  '嘶啸奔雷',
  '不死黑云',
  '南蛮象骑',
  '攻城锤',
  '司南车',
  '诸葛连弩',
  '木牛流马',
]

/**
 * 坐骑战斗加成（docs/项目介绍/坐骑.md）
 * 成长值 G = 1 + 转数×0.1（如 3 转为 1.3）；未列出的坐骑不加属性。
 */
export function 坐骑战斗加成(种类名, 坐骑等级, 转数 = 3) {
  const name = String(种类名 || '')
  const L = Math.min(160, Math.max(1, Number(坐骑等级) || 1))
  const z = Math.min(3, Math.max(0, Math.trunc(Number(转数)) || 0))
  const G = 1 + z * 0.1
  const core = 50 + (L * 0.2 + 7) * L * G
  const atkHeavy = 100 + (L * 0.2 + 14) * L * G
  const core100x5 = (100 + (L * 0.2 + 14) * L * G) * 5

  if (name === '战马') {
    return {
      攻击: Math.round(50 + (L * 0.2 + 7) * L * G),
      速度: Math.round((L - 50) * G),
    }
  }
  if (name === '乌云踏雪') {
    return {
      气血: Math.round(core * 5),
      攻击: Math.round(atkHeavy),
    }
  }
  if (name === '绝影') {
    return {
      气血: Math.round(core * 5),
      精力: Math.round(core * 5),
    }
  }
  if (name === '里飞沙') {
    return {
      攻击: Math.round(atkHeavy),
      速度: Math.round(L * G),
    }
  }
  if (name === '夜照玉狮子') {
    return {
      气血: Math.round(core * 5),
      速度: Math.round(L * G),
    }
  }
  if (name === '的卢') {
    return {
      气血: Math.round(core100x5),
    }
  }
  if (name === '爪黄飞电') {
    return {
      精力: Math.round(core100x5),
    }
  }
  if (name === '燎原火') {
    return {
      攻击: Math.round(200 + (L * 0.2 + 28) * L * G),
    }
  }
  if (name === '赤兔胭脂兽') {
    return {
      速度: Math.round((50 + L) * G),
    }
  }
  return {}
}

export const 主将装备宝石属性 = [
  '体质',
  '智力',
  '力量',
  '敏捷',
  '气血',
  '精力',
  '攻击',
  '防御',
  '速度',
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

export const 副将宝石属性 = [
  '抗物理',
  '抗封锁',
  '抗扰乱',
  '抗围困',
  '抗风沙',
  '抗妖火',
  '抗毒术',
  '抗落雷',
]

/** 副将头衔（配置页先选头衔再选人物；目前仅神将，可扩展国士等） */
export const 副将头衔列表 = ['神将']

/** 神将人物列表（与 docs/项目介绍/副将.md 表一致） */
export const 副将神将名称列表 = [
  '水·赵云',
  '土·黄忠',
  '神·诸葛亮',
  '仙·貂蝉',
  '金·马超',
  '木·关羽',
  '魔·吕布',
  '火·张飞',
  '虞姬',
  '张良',
  '刘邦',
  '项羽',
  '韩信',
  '萧何',
  '吕雉',
  '关圣帝君',
  '左慈',
  '水镜先生',
  '南华仙人',
  '于吉',
]

export function 副将人物选项(头衔) {
  if (头衔 === '神将') return [...副将神将名称列表]
  return []
}

export function 副将星级边界(头衔) {
  if (头衔 === '神将') return { 最小: 4, 最大: 6, 默认: 6 }
  return { 最小: 4, 最大: 6, 默认: 6 }
}

export function normalize副将头衔(s) {
  const v = String(s ?? '').trim()
  return 副将头衔列表.includes(v) ? v : 副将头衔列表[0]
}

export function normalize副将人物(name, 头衔) {
  const opts = 副将人物选项(头衔)
  const v = String(name ?? '').trim()
  if (opts.includes(v)) return v
  return opts[0] ?? ''
}

/** 未配置槽不强制默认神将名，人物保持空串 */
export function normalize副将人物可空(name, 头衔, 已配置) {
  if (!已配置) return ''
  return normalize副将人物(name, 头衔)
}

export function normalize副将星级(raw, 头衔) {
  const { 最小, 最大, 默认 } = 副将星级边界(头衔)
  const x = Math.trunc(Number(raw))
  if (!Number.isFinite(x)) return 默认
  return Math.min(最大, Math.max(最小, x))
}

export function normalize副将真(v) {
  if (v === true || v === '是' || v === '真') return true
  if (v === false || v === '否' || v === '假') return false
  return true
}

export function normalize无双等级(raw) {
  const x = Math.trunc(Number(raw))
  if (!Number.isFinite(x)) return 160
  return Math.min(160, Math.max(0, x))
}

/**
 * 主将等级系数（与 docs/项目介绍/主将.md）：每 5 级一档，档内线性。
 * 例：1–5 → 20–24，6–10 → 24–28，95–100 → 96–100，160 → 148。
 */
export function 等级系数(等级) {
  const L = Math.min(160, Math.max(1, Math.trunc(Number(等级) || 1)))
  const k = Math.floor((L - 1) / 5)
  const L0 = 1 + k * 5
  const c0 = 20 + k * 4
  return c0 + (L - L0)
}

/** 主将战斗用职业轴：男武/女武 → 武，男文/女文 → 文，男异/女异 → 异 */
export function 主将战斗职业轴(角色分类) {
  const s = String(角色分类 || '')
  if (s.endsWith('武')) return '武'
  if (s.endsWith('文')) return '文'
  if (s.endsWith('异')) return '异'
  return '武'
}

/** 与 docs/项目介绍/职业加成.md §1 一致；男/女同轴共用一套数 */
const 职业原始战斗属性表 = {
  武: {
    命中率: 85,
    暴击率: 15,
    反击率: 15,
    致命率: 5,
    法爆率: 0,
    反震率: 15,
    躲避率: 5,
  },
  文: {
    命中率: 80,
    暴击率: 10,
    反击率: 10,
    致命率: 5,
    法爆率: 0,
    反震率: 10,
    躲避率: 5,
  },
  异: {
    命中率: 75,
    暴击率: 10,
    反击率: 10,
    致命率: 5,
    法爆率: 5,
    反震率: 10,
    躲避率: 5,
  },
}

/**
 * 战斗基础层：按 **战斗职业轴**（武/文/异）取命中率、暴击率等常数表（职业加成.md §1）。
 * 主将、副将共用；未含穿透率等，由装备/天赋等在后续层叠加。
 */
export function 职业原始战斗属性(战斗职业轴) {
  const 轴 = 战斗职业轴 === '文' || 战斗职业轴 === '异' ? 战斗职业轴 : '武'
  return { ...职业原始战斗属性表[轴] }
}

/**
 * 神将初值区间 [min,max]、成长区间（与 docs/项目介绍/副将.md 表一致；速可为负）
 * 战斗计算取区间中点作初值，成长在中点上叠加 转数/星级/真/无双。
 */
export const 副将属性表 = {
  '水·赵云': { 血: [115, 145], 精: [102, 122], 攻: [155, 185], 速: [51, 62], 成长: [1.1, 1.3] },
  '土·黄忠': { 血: [122, 132], 精: [95, 115], 攻: [135, 165], 速: [27, 35], 成长: [1.1, 1.3] },
  '神·诸葛亮': { 血: [112, 132], 精: [116, 136], 攻: [8, 18], 速: [104, 120], 成长: [1.1, 1.3] },
  '仙·貂蝉': { 血: [99, 119], 精: [240, 290], 攻: [0, 10], 速: [88, 100], 成长: [1.1, 1.3], 性别: '女' },
  '金·马超': { 血: [97, 117], 精: [104, 124], 攻: [150, 200], 速: [104, 120], 成长: [1.1, 1.3] },
  '木·关羽': { 血: [205, 255], 精: [98, 118], 攻: [160, 210], 速: [49, 70], 成长: [1.1, 1.3] },
  '魔·吕布': { 血: [220, 270], 精: [0, 10], 攻: [240, 290], 速: [33, 45], 成长: [1.1, 1.3] },
  '火·张飞': { 血: [195, 245], 精: [70, 80], 攻: [200, 250], 速: [-11, -5], 成长: [1.1, 1.3] },
  虞姬: { 血: [82, 102], 精: [140, 190], 攻: [0, 10], 速: [93, 105], 成长: [1.1, 1.3], 性别: '女' },
  张良: { 血: [49, 59], 精: [110, 140], 攻: [21, 31], 速: [99, 110], 成长: [1.1, 1.3] },
  刘邦: { 血: [240, 290], 精: [150, 180], 攻: [104, 124], 速: [88, 100], 成长: [1.1, 1.3] },
  项羽: { 血: [200, 250], 精: [20, 30], 攻: [290, 340], 速: [36, 48], 成长: [1.1, 1.3] },
  韩信: { 血: [89, 109], 精: [106, 126], 攻: [140, 190], 速: [99, 115], 成长: [1.1, 1.3] },
  萧何: { 血: [69, 79], 精: [106, 126], 攻: [5, 15], 速: [104, 120], 成长: [1.1, 1.3] },
  吕雉: { 血: [112, 132], 精: [100, 120], 攻: [39, 49], 速: [51, 62], 成长: [1.1, 1.3], 性别: '女' },
  关圣帝君: { 血: [110, 140], 精: [98, 118], 攻: [160, 210], 速: [49, 70], 成长: [1.1, 1.3] },
  左慈: { 血: [66, 76], 精: [106, 126], 攻: [15, 25], 速: [99, 115], 成长: [1.1, 1.3] },
  水镜先生: { 血: [53, 63], 精: [120, 150], 攻: [2, 12], 速: [93, 105], 成长: [1.1, 1.3] },
  南华仙人: { 血: [250, 300], 精: [104, 124], 攻: [63, 73], 速: [88, 95], 成长: [1.1, 1.3] },
  于吉: { 血: [116, 136], 精: [85, 105], 攻: [92, 112], 速: [88, 100], 成长: [1.1, 1.3] },
}

export function 副将属性行(人物名) {
  const row = 副将属性表[人物名]
  if (row) return row
  return 副将属性表['水·赵云']
}

function 区间中点(pair) {
  return (Number(pair[0]) + Number(pair[1])) / 2
}

/** 血/精/攻/速 初值（表中点） */
export function 副将初值中点(人物名) {
  const r = 副将属性行(人物名)
  return {
    血: 区间中点(r.血),
    精: 区间中点(r.精),
    攻: 区间中点(r.攻),
    速: 区间中点(r.速),
  }
}

/** 副将表「性别」列：未标性别的神将视为男；人物名为空时按男处理（编辑占位）。 */
export function 副将配置性别(人物名) {
  const n = String(人物名 || '').trim()
  if (!n) return '男'
  const row = 副将属性表[n]
  if (row && row.性别 === '女') return '女'
  return '男'
}

/**
 * 默契度战斗加成（docs/项目介绍/副将.md）
 * 满 500000 时为：命中率+25、暴击率+15、反击率+15、致命率+10、躲避率+20、反震率+5；不足时按比例下浮。
 */
export function 副将默契战斗加成(默契度) {
  const cap = 500000
  const v = Math.min(cap, Math.max(0, Math.trunc(Number(默契度)) || 0))
  const p = cap > 0 ? v / cap : 0
  return {
    命中率: Math.round(25 * p),
    暴击率: Math.round(15 * p),
    反击率: Math.round(15 * p),
    致命率: Math.round(10 * p),
    躲避率: Math.round(20 * p),
    反震率: Math.round(5 * p),
  }
}

/** 按当前人物表性别，把四世「武/文/异」轴写回完整角色分类（规范化与换将时用）。 */
export function sync副将职业经历性别(单位) {
  if (!单位 || typeof 单位 !== 'object' || !Array.isArray(单位.职业经历)) return
  const prefix = 副将配置性别(单位.人物)
  for (let i = 0; i < 4; i++) {
    const axis = 分类转职业轴(单位.职业经历[i])
    单位.职业经历[i] = 职业轴与前缀成分类(prefix, axis)
  }
}

/**
 * 成长：表区间中点 + 转数×0.1 + (星级−4)×0.05 + 真+0.05。
 * 无双等级×0.001 仅在无双形态生效（副将.md），静态战斗面板不计入。
 */
export function 副将有效成长(人物名, { 星级, 真, 转数 } = {}) {
  const r = 副将属性行(人物名)
  let g = 区间中点(r.成长)
  const zs = Math.min(6, Math.max(4, Math.trunc(Number(星级)) || 6))
  const zr = Math.min(3, Math.max(0, Math.trunc(Number(转数)) || 0))
  const 真字 = 真 === true || 真 === '是' || 真 === '真'
  g += zr * 0.1 + (zs - 4) * 0.05 + (真字 ? 0.05 : 0)
  return Math.round(g * 1000) / 1000
}

/** 头盔名称 -> 词条选项；兽骨魔神盔 仅一项 */
export const 头盔配置 = {
  凤翅鎏金盔: { 词条: ['抗围困', '抗扰乱', '抗封锁'], 数值: 10 },
  绣银逍遥巾: { 词条: ['抗风沙', '抗妖火', '抗落雷', '抗毒术'], 数值: 10 },
  兽骨魔神盔: { 词条: ['抗物理'], 数值: 10 },
  苍云天龙冠: { 词条: ['抗风沙', '抗妖火', '抗落雷', '抗毒术'], 数值: 10 },
}

export const 项饰名称列表 = ['缀星项链']

export const 武器名称列表 = ['九转盘龙枪', '太乙神钩', '八楞紫金锤', '苍龙五虎剑', '八宝驼龙刀']

export const 护腕名称列表 = ['星链护腕']

export const 铠甲名称列表 = ['凤翅鎏金甲', '凝血战袍', '兽骨魔神甲', '金缕玉衣', '斗战圣铠']

export const 战靴名称列表 = ['龙骨靴']

export const 头盔名称列表 = Object.keys(头盔配置)

const 武器表 = {
  九转盘龙枪: { 攻击: 2450 },
  太乙神钩: { 攻击: 2450 },
  八楞紫金锤: { 攻击: 4900 },
  苍龙五虎剑: { 攻击: 2450 },
  八宝驼龙刀: { 攻击: 3430 },
}

const 铠甲表 = {
  凤翅鎏金甲: { 防御: 2500 },
  凝血战袍: { 防御: 2500 },
  兽骨魔神甲: { 防御: 5000 },
  金缕玉衣: { 防御: 2500 },
  斗战圣铠: { 防御: 3500 },
}

export function 解析装备格(部位, 格) {
  const out = {}
  if (!格 || typeof 格 !== 'object') return out
  const 名称 = 格.名称
  const 词条 = 格.词条
  if (部位 === '头盔' && 名称 && 头盔配置[名称]) {
    const cfg = 头盔配置[名称]
    const key = 词条 && cfg.词条.includes(词条) ? 词条 : cfg.词条[0]
    out[key] = cfg.数值
    return out
  }
  if (部位 === '项饰' && 名称 === '缀星项链') {
    out.精力 = 3200
    return out
  }
  if (部位 === '武器' && 名称 && 武器表[名称]) {
    Object.assign(out, 武器表[名称])
    return out
  }
  if (部位 === '护腕' && 名称 === '星链护腕') {
    out.气血 = 3200
    return out
  }
  if (部位 === '铠甲' && 名称 && 铠甲表[名称]) {
    Object.assign(out, 铠甲表[名称])
    return out
  }
  if (部位 === '战靴' && 名称 === '龙骨靴') {
    if (词条 === '敏捷') out.敏捷 = 100
    else out.速度 = 100
  }
  return out
}

/**
 * 单件装备展示/汇总：部位固定属性（`解析装备格`）与三槽宝石同键相加。
 * 与 `nodejs` 中主将装备+宝石累加口径一致。
 */
export function 解析装备格汇总(部位, 格) {
  const out = { ...解析装备格(部位, 格) }
  if (!格 || !Array.isArray(格.宝石)) return out
  for (const g of 格.宝石) {
    if (!g || typeof g !== 'object' || !g.属性) continue
    const val = Math.min(15, Math.max(1, Number(g.数值) || 15))
    const attr = g.属性
    out[attr] = (Number(out[attr]) || 0) + val
  }
  return out
}

export function empty装备槽() {
  return { 名称: '', 词条: null, 宝石: [null, null, null] }
}

export function normalize装备槽(部位, raw) {
  const slot = empty装备槽()
  if (!raw || typeof raw !== 'object') return slot
  if (raw.名称 != null) slot.名称 = String(raw.名称)
  if (raw.词条 != null) slot.词条 = raw.词条
  const gems = Array.isArray(raw.宝石) ? raw.宝石 : []
  for (let i = 0; i < 3; i++) {
    const g = gems[i]
    if (g && typeof g === 'object' && g.属性) {
      slot.宝石[i] = { 属性: g.属性, 数值: Math.min(15, Math.max(1, Number(g.数值) || 15)) }
    }
  }
  if (!slot.名称) {
    if (部位 === '头盔') slot.名称 = 头盔名称列表[0]
    if (部位 === '项饰') slot.名称 = 项饰名称列表[0]
    if (部位 === '武器') slot.名称 = 武器名称列表[0]
    if (部位 === '护腕') slot.名称 = 护腕名称列表[0]
    if (部位 === '铠甲') slot.名称 = 铠甲名称列表[0]
    if (部位 === '战靴') {
      slot.名称 = 战靴名称列表[0]
      slot.词条 = '速度'
    }
  }
  const hc = 头盔配置[slot.名称]
  if (部位 === '头盔' && hc && (!slot.词条 || !hc.词条.includes(slot.词条))) {
    slot.词条 = hc.词条[0]
  }
  return slot
}

/** 单维可配置上限（与 docs/当前任务.md 一致，最大等级 160 时三位数足够） */
export const 单维属性上限 = 800

export function 等级总点(等级) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  return 8 * L
}

export function 可选点上限(等级) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  return 4 * L
}

export function 默认四维(等级) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  return { 体质: L, 智力: L, 力量: L, 敏捷: L }
}

/** 等级降低等导致溢出时：四维全部=当前等级；单维不超过 单维属性上限 */
export function 修正属性分配(等级, 分配) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  const cap = 等级总点(L)
  const d = 默认四维(L)
  const maxV = 单维属性上限
  let 体 = Number(分配?.体质)
  let 智 = Number(分配?.智力)
  let 力 = Number(分配?.力量)
  let 敏 = Number(分配?.敏捷)
  if (![体, 智, 力, 敏].every((x) => Number.isFinite(x))) {
    return { ...d }
  }
  if (体 < L) 体 = L
  if (智 < L) 智 = L
  if (力 < L) 力 = L
  if (敏 < L) 敏 = L
  体 = Math.min(maxV, 体)
  智 = Math.min(maxV, 智)
  力 = Math.min(maxV, 力)
  敏 = Math.min(maxV, 敏)
  if (体 + 智 + 力 + 敏 > cap) {
    return { ...d }
  }
  return { 体质: 体, 智力: 智, 力量: 力, 敏捷: 敏 }
}

export function 空闲点(等级, 分配) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  const a = 修正属性分配(L, 分配)
  return 等级总点(L) - a.体质 - a.智力 - a.力量 - a.敏捷
}

/**
 * 风格：只根据「可选点」超出底数 L 的部分 e=max(0, 属性−L) 判定。
 * 将血/精/攻/速按 e 降序、并列按体→智→力→敏 排序得第一、第二名 e₁、e₂。
 * - 若 e₁>0 且 e₂=0（仅第一名配了可选点）：返回 **气血型 / 精力型 / 攻击型 / 速度型** 之一。
 * - 否则（前二都没配 e 全 0，或前二都配了 e₁>0 且 e₂>0）：取前两名简称拼 **双字型**（如血精型）。
 */
export function 计算风格(等级, 分配) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  const a = 修正属性分配(L, 分配)
  const items = [
    { k: '血', v: Math.max(0, a.体质 - L), i: 0 },
    { k: '精', v: Math.max(0, a.智力 - L), i: 1 },
    { k: '攻', v: Math.max(0, a.力量 - L), i: 2 },
    { k: '速', v: Math.max(0, a.敏捷 - L), i: 3 },
  ]
  items.sort((x, y) => {
    if (y.v !== x.v) return y.v - x.v
    return x.i - y.i
  })
  const e1 = items[0].v
  const e2 = items[1].v
  if (e1 > 0 && e2 === 0) {
    const 单型 = { 血: '气血型', 精: '精力型', 攻: '攻击型', 速: '速度型' }
    return 单型[items[0].k]
  }
  return items[0].k + items[1].k + '型'
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** 分段线性：多段 [等级起, 等级止, 值起, 值止] */
export function 分段天赋值(等级, 段列表) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  for (const [from, to, v0, v1] of 段列表) {
    if (L >= from && L <= to) {
      if (to === from) return v0
      const t = (L - from) / (to - from)
      return lerp(v0, v1, t)
    }
  }
  return 段列表.length ? 段列表[段列表.length - 1][3] : 0
}

const 天赋段 = {
  强攻: [
    [1, 100, 0.2, 20],
    [100, 120, 20, 30],
    [120, 140, 30, 40],
    [140, 160, 40, 50],
  ],
  舍命: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  舍攻: [
    [1, 100, 0.4, 40],
    [100, 120, 40, 60],
    [120, 140, 60, 80],
    [140, 160, 80, 100],
  ],
  忽视: [
    [1, 100, 0.2, 20],
    [100, 120, 20, 30],
    [120, 140, 30, 40],
    [140, 160, 40, 50],
  ],
  暴击: [
    [1, 100, 0.5, 50],
    [100, 120, 50, 70],
    [120, 140, 70, 90],
    [140, 160, 90, 120],
  ],
  围困: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  扰乱: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  封锁: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  风沙: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  妖火: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  落雷: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  毒术: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
  法爆: [
    [1, 100, 0.09, 9],
    [100, 120, 9, 12],
    [120, 140, 12, 15],
    [140, 160, 15, 18],
  ],
  爆率: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 20],
    [120, 140, 20, 30],
    [140, 160, 30, 40],
  ],
  反击: [
    [1, 100, 0.1, 20],
    [100, 120, 20, 30],
    [120, 140, 30, 40],
    [140, 160, 40, 50],
  ],
  躲避: [
    [1, 100, 0.1, 20],
    [100, 120, 20, 30],
    [120, 140, 30, 40],
    [140, 160, 40, 50],
  ],
  致命: [
    [1, 100, 0.1, 20],
    [100, 120, 20, 30],
    [120, 140, 30, 40],
    [140, 160, 40, 50],
  ],
  强血: [
    [1, 100, 0.1, 10],
    [100, 120, 10, 15],
    [120, 140, 15, 20],
    [140, 160, 20, 25],
  ],
}

export const 天赋名称列表 = Object.keys(天赋段).concat(['合击', '暗度', '夺命'])

export const 天赋说明 = {
  强攻: '加攻击力：1–100（0.2%–20%），100–120（20%–30%），120–140（30%–40%），140–160（40%–50%）',
  舍命: '加舍命一击伤害：1–100（0.1%–10%），…，140–160（20%–25%）',
  舍攻: '加舍命一击伤害：1–100（0.4%–40%），…，140–160（80%–100%）',
  忽视: '加忽视概率：1–100（0.2%–20%），…，140–160（40%–50%）',
  暴击: '加暴击伤害：1–100（0.5%–50%），…，140–160（90%–120%）',
  合击: '加合击概率：暂定 0',
  围困: '加画地为牢成功率：1–100（0.1%–10%），…，140–160（20%–25%）',
  扰乱: '加趁火打劫成功率：同上区间',
  封锁: '加四面楚歌成功率：同上区间',
  暗度: '加暗度陈仓成功率：暂定 0',
  夺命: '加夺命成功率：暂定 0',
  风沙: '加呼风唤雨伤害：1–100（0.1%–10%），…，140–160（20%–25%）',
  妖火: '加妖火燎原伤害：同上',
  落雷: '加五雷轰顶伤害：同上',
  毒术: '加巫蛊极毒伤害：同上',
  法爆: '加法术暴击率：1–100（0.09%–9%），…，140–160（15%–18%）',
  爆率: '加物理暴击率：1–100（0.1%–10%），…，140–160（30%–40%）',
  反击: '加反击率：1–100（0.1%–20%），…，140–160（40%–50%）',
  躲避: '加躲避率：同上',
  致命: '加致命率：同上',
  强血: '加气血：1–100（0.1%–10%），…，140–160（20%–25%）',
}

export function 天赋百分比(名称, 等级) {
  const seg = 天赋段[名称]
  if (!seg) return 0
  return 分段天赋值(等级, seg)
}

const 固定技能表 = {
  男武: ['舍命一击', '力劈华山', '固若金汤', '凌波微步'],
  女武: ['舍命一击', '排山倒海', '固若金汤', '凌波微步'],
  男文: ['画地为牢', '趁火打劫', '金蝉脱壳', '暗度陈仓'],
  女文: ['画地为牢', '四面楚歌', '金蝉脱壳', '暗度陈仓'],
  男异: ['呼风唤雨', '妖火燎原', '五雷轰顶', '毁天灭地'],
  女异: ['呼风唤雨', '妖火燎原', '巫蛊极毒', '毁天灭地'],
}

export function 固定技能列表(角色分类) {
  return 固定技能表[String(角色分类)] || 固定技能表.男武
}

/** 配置里「当前世」= 职业经历第 4 项，兼容旧字段 角色分类 */
export function 当前角色分类(cfg) {
  if (!cfg || typeof cfg !== 'object') return '男武'
  const arr = cfg.职业经历
  if (Array.isArray(arr) && arr[3] && 角色分类列表.includes(arr[3])) return arr[3]
  if (cfg.角色分类 && 角色分类列表.includes(cfg.角色分类)) return cfg.角色分类
  return '男武'
}

/** 副将编辑：职业仅武/文/异；性别由副将表「性别」列决定（与主将无关） */
export const 副将职业轴选项 = ['武', '文', '异']

export function 主将性别前缀(主将) {
  const c = 当前角色分类(主将)
  return String(c).startsWith('女') ? '女' : '男'
}

export function 职业轴与前缀成分类(前缀, 轴) {
  const a = String(轴 || '武')
  if (a === '文') return 前缀 + '文'
  if (a === '异') return 前缀 + '异'
  return 前缀 + '武'
}

export function 分类转职业轴(分类) {
  const s = String(分类 || '')
  if (s.endsWith('文')) return '文'
  if (s.endsWith('异')) return '异'
  return '武'
}

/** 技能「等级」为档位 key，熟练度须在对应区间内；超出时由 clamp 函数压到合法范围 */
export const 技能等级档位列表 = [
  { 档位: '1', 显示: '1级', 熟练度最小: 1, 熟练度最大: 6000 },
  { 档位: '2', 显示: '2级', 熟练度最小: 6000, 熟练度最大: 12000 },
  { 档位: '3', 显示: '3级', 熟练度最小: 12000, 熟练度最大: 18000 },
  { 档位: '4', 显示: '4级', 熟练度最小: 18000, 熟练度最大: 24000 },
  { 档位: '5', 显示: '5级', 熟练度最小: 24000, 熟练度最大: 30000 },
  { 档位: '化境1', 显示: '化境1级', 熟练度最小: 0, 熟练度最大: 20000 },
  { 档位: '化境2', 显示: '化境2级', 熟练度最小: 0, 熟练度最大: 20000 },
  { 档位: '化境3', 显示: '化境3级', 熟练度最小: 0, 熟练度最大: 20000 },
  { 档位: '化境极', 显示: '化境极', 熟练度最小: 0, 熟练度最大: 50000 },
]

export function 技能档位范围(档位) {
  return 技能等级档位列表.find((r) => r.档位 === 档位) || 技能等级档位列表[0]
}

/** 新建技能槽、缺省规范化时使用的档位（与任务：默认化境极 + 满熟练） */
export const 默认技能档位 = '化境极'

/** 熟练度超出当前档位范围时，压到该档最大值（或低于下限时抬到最小值） */
export function clamp熟练度到档位(档位, 熟练度) {
  const row = 技能档位范围(档位)
  let x = Number(熟练度)
  if (!Number.isFinite(x)) x = row.熟练度最小
  if (x > row.熟练度最大) x = row.熟练度最大
  if (x < row.熟练度最小) x = row.熟练度最小
  return x
}

export const 技能等级说明 =
  '1级熟练度1–6000；2级6000–12000；3级12000–18000；4级18000–24000；5级24000–30000；化境1–3级熟练度各0–20000；化境极0–50000。'

export function empty技能槽(名称) {
  const row = 技能档位范围(默认技能档位)
  return { 名称, 等级: 默认技能档位, 熟练度: row.熟练度最大 }
}

export function 默认技能组(角色分类) {
  return 固定技能列表(角色分类).map((n) => empty技能槽(n))
}

export function normalize天赋项(raw) {
  if (!raw || typeof raw !== 'object') return { 名称: null, 等级: 160 }
  if (typeof raw === 'string') return { 名称: raw, 等级: 160 }
  const 名称 = raw.名称 != null ? raw.名称 : null
  if (名称 === null || 名称 === '') {
    return { 名称: null, 等级: 160 }
  }
  const rawLv = raw.等级
  const 等级 =
    rawLv == null || rawLv === ''
      ? 160
      : Math.min(160, Math.max(1, Number(rawLv) || 160))
  return { 名称, 等级 }
}

export function normalize技能项(raw, 默认名) {
  const 默认行 = 技能档位范围(默认技能档位)
  if (!raw || typeof raw !== 'object') {
    return { 名称: 默认名, 等级: 默认技能档位, 熟练度: 默认行.熟练度最大 }
  }
  const 合法档 = new Set(技能等级档位列表.map((r) => r.档位))
  let 档 =
    raw.等级 != null && String(raw.等级) !== '' ? String(raw.等级) : 默认技能档位
  if (!合法档.has(档)) {
    const n = Number(raw.等级)
    if (Number.isFinite(n) && n >= 1 && n <= 5) 档 = String(Math.floor(n))
    else 档 = 默认技能档位
  }
  let row = 技能档位范围(档)
  const rawProf = raw.熟练度
  let 熟练度 =
    rawProf == null || rawProf === ''
      ? row.熟练度最大
      : clamp熟练度到档位(档, rawProf)
  // 旧版默认：1 档 + 熟练度 1 → 升级为化境极满熟练
  if (档 === '1' && Number(熟练度) === 1) {
    档 = 默认技能档位
    row = 默认行
    熟练度 = row.熟练度最大
  }
  return {
    名称: String(raw.名称 || 默认名),
    等级: 档,
    熟练度,
  }
}

function build主将装备() {
  const 装备 = {}
  for (const p of 装备部位列表) {
    装备[p] = normalize装备槽(p, empty装备槽())
  }
  return 装备
}

function default职业经历() {
  const r = 角色分类列表[0]
  return [r, r, r, r]
}

function empty副将单位() {
  const 职业经历 = default职业经历()
  const 角色分类 = 职业经历[3]
  const 头衔 = 副将头衔列表[0]
  return {
    职业经历: [...职业经历],
    头衔,
    人物: normalize副将人物('', 头衔),
    星级: 副将星级边界(头衔).默认,
    真: true,
    无双等级: 160,
    默契度: 500000,
    等级: 160,
    转数: 3,
    属性分配: { 体质: 160, 智力: 160, 力量: 160, 敏捷: 160 },
    宝石: [],
    天赋: [
      { 名称: null, 等级: 160 },
      { 名称: null, 等级: 160 },
      { 名称: null, 等级: 160 },
      { 名称: null, 等级: 160 },
    ],
    技能: 默认技能组(角色分类),
  }
}

/** 配置中副将槽位数（含空位「无」） */
export const 副将槽位总数 = 10

/** 空槽：未配置、休、人物空（展示「无」） */
export function empty副将槽() {
  const u = empty副将单位()
  return {
    ...u,
    已配置: false,
    状态: '休',
    人物: '',
  }
}

function 压制超额战槽(列表) {
  const 战Idx = []
  for (let i = 0; i < 列表.length; i++) {
    if (列表[i].状态 === '战') 战Idx.push(i)
  }
  if (战Idx.length <= 3) return
  战Idx.sort((a, b) => a - b)
  for (let k = 3; k < 战Idx.length; k++) {
    列表[战Idx[k]].状态 = '休'
  }
}

function migrate职业经历(u, target) {
  if (Array.isArray(u.职业经历) && u.职业经历.length > 0) {
    const m = u.职业经历
      .slice(0, 4)
      .map((x) => (角色分类列表.includes(x) ? x : 角色分类列表[0]))
    while (m.length < 4) m.push(m[m.length - 1] || 角色分类列表[0])
    target.职业经历 = m
    return
  }
  let r = 角色分类列表[0]
  if (u.角色分类 && 角色分类列表.includes(u.角色分类)) {
    r = u.角色分类
  } else if (u.职业 && u.性别) {
    const 性 = u.性别 === '女' ? '女' : '男'
    const 职 = u.职业
    if (职 === '武人') r = 性 + '武'
    else if (职 === '文人') r = 性 + '文'
    else r = 性 + '异'
  }
  target.职业经历 = [r, r, r, r]
}

function normalize副将槽项(raw, template) {
  const t = { ...template }
  if (!raw || typeof raw !== 'object') return t
  t.已配置 = raw.已配置 === true || raw.已配置 === '是'
  t.状态 = raw.状态 === '战' ? '战' : '休'
  migrate副将单位字段(raw, t)
  if (!t.已配置) {
    t.人物 = ''
    t.状态 = '休'
  }
  return t
}

function migrate副将单位字段(u, t) {
  migrate职业经历(u, t)
  t.等级 = Math.min(160, Math.max(1, Number(u.等级) || t.等级))
  t.转数 = Math.min(3, Math.max(0, Number(u.转数) ?? t.转数))
  t.属性分配 = 修正属性分配(t.等级, u.属性分配 || t.属性分配)
  t.天赋 = pad天赋(u.天赋)
  const 当前世 = 当前角色分类(t)
  t.技能 = pad技能(当前世, u.技能)
  const 头衔 = normalize副将头衔(u.头衔)
  t.头衔 = 头衔
  t.人物 = normalize副将人物可空(u.人物, 头衔, t.已配置)
  t.星级 = normalize副将星级(u.星级, 头衔)
  t.真 = normalize副将真(u.真)
  t.无双等级 = normalize无双等级(u.无双等级)
  {
    const rawM = u.默契度
    t.默契度 =
      rawM === undefined || rawM === null || rawM === ''
        ? 500000
        : Math.min(500000, Math.max(0, Math.trunc(Number(rawM)) || 0))
  }
  const gems = Array.isArray(u.宝石) ? u.宝石 : []
  const 合法副将宝 = new Set(副将宝石属性)
  t.宝石 = gems
    .slice(0, 9)
    .map((g) => {
      let attr = g.属性
      if (attr === '抗玄击' || !合法副将宝.has(attr)) attr = 副将宝石属性[0]
      return { 属性: attr, 数值: Math.min(15, Math.max(1, Number(g.数值) || 15)) }
    })
  sync副将职业经历性别(t)
}

function pad天赋(arr) {
  const out = []
  const a = Array.isArray(arr) ? arr : []
  for (let i = 0; i < 4; i++) out.push(normalize天赋项(a[i]))
  return out
}

function pad技能(角色分类, arr) {
  const names = 固定技能列表(角色分类)
  const a = Array.isArray(arr) ? arr : []
  return names.map((n, i) => normalize技能项(a[i], n))
}

export function getDefaultConfig() {
  const 职业经历 = default职业经历()
  const 角色分类 = 职业经历[3]
  return {
    主将: {
      职业经历: [...职业经历],
      等级: 160,
      转数: 3,
      属性分配: { 体质: 160, 智力: 160, 力量: 160, 敏捷: 160 },
      装备: build主将装备(),
      坐骑: { 种类: 坐骑列表[0], 转数: 3, 等级: 160 },
      天赋: [
        { 名称: null, 等级: 160 },
        { 名称: null, 等级: 160 },
        { 名称: null, 等级: 160 },
        { 名称: null, 等级: 160 },
      ],
      技能: 默认技能组(角色分类),
      帮派: { 主抗性: null, 副抗性: null },
    },
    副将列表: Array.from({ length: 副将槽位总数 }, () => empty副将槽()),
    /** 已战槽的 0-based 下标，按上阵先后排序（最多 3 个）；与「战」状态一致 */
    副将上阵顺序: [],
  }
}

/** 使「副将上阵顺序」与副将列表中「战」状态一致（补缺、去重、超长则降级为休） */
export function 副将上阵顺序同步(d) {
  const list = d.副将列表
  let order = Array.isArray(d.副将上阵顺序) ? d.副将上阵顺序 : []
  order = [
    ...new Set(
      order
        .map((x) => Math.trunc(Number(x)))
        .filter((i) => i >= 0 && i < 副将槽位总数)
    ),
  ]
  order = order.filter((i) => list[i]?.状态 === '战')
  const 战下标 = []
  for (let i = 0; i < list.length; i++) {
    if (list[i]?.状态 === '战') 战下标.push(i)
  }
  for (const i of [...战下标].sort((a, b) => a - b)) {
    if (!order.includes(i)) order.push(i)
  }
  if (order.length > 3) {
    const demote = order.slice(3)
    for (const j of demote) {
      if (list[j]) list[j].状态 = '休'
    }
    order = order.slice(0, 3)
  }
  d.副将上阵顺序 = order
}

/**
 * 主页 / 配置页共用：设为已休并更新上阵顺序。
 * @returns {{ ok: true } | { ok: false, 错误: string }}
 */
export function 副将槽设为已休(配置, i) {
  const list = 配置?.副将列表
  if (!list || i < 0 || i >= 副将槽位总数) return { ok: false, 错误: '无效槽位' }
  list[i].状态 = '休'
  if (!Array.isArray(配置.副将上阵顺序)) 配置.副将上阵顺序 = []
  配置.副将上阵顺序 = 配置.副将上阵顺序.filter((x) => x !== i)
  return { ok: true }
}

/**
 * 已满 3 已战时，将原排行第 3 的槽改为休，再把本槽插入为新的第 3。
 * @returns {{ ok: true } | { ok: false, 错误: string }}
 */
export function 副将槽设为已战(配置, i) {
  const list = 配置?.副将列表
  const slot = list?.[i]
  if (!list || i < 0 || i >= 副将槽位总数) return { ok: false, 错误: '无效槽位' }
  if (!slot.已配置 || !String(slot.人物 || '').trim()) {
    return { ok: false, 错误: '未配置人物' }
  }
  if (slot.状态 === '战' && (配置.副将上阵顺序 || []).includes(i)) {
    return { ok: true }
  }
  if (!Array.isArray(配置.副将上阵顺序)) 配置.副将上阵顺序 = []
  let ord = [...new Set(配置.副将上阵顺序.map((x) => Math.trunc(Number(x))))].filter(
    (x) => x >= 0 && x < list.length && list[x]?.状态 === '战' && x !== i
  )
  if (ord.length >= 3) {
    const third = ord[2]
    list[third].状态 = '休'
    ord = ord.slice(0, 2)
  }
  ord.push(i)
  slot.状态 = '战'
  配置.副将上阵顺序 = ord
  return { ok: true }
}

/** 将配置中的副将列表展开为属性计算用的 副将1–3（按「副将上阵顺序」取前三个已配置「战」） */
export function 展开战斗用副将占位(配置) {
  const d = normalizeConfigDeep(配置)
  const 列表 = d.副将列表
  const ord = (d.副将上阵顺序 || []).filter(
    (i) =>
      i >= 0 &&
      i < 列表.length &&
      列表[i]?.状态 === '战' &&
      列表[i]?.已配置
  )
  const picks = ord.slice(0, 3).map((i) => {
    const s = 列表[i]
    const { 已配置: _a, 状态: _b, ...rest } = s
    return rest
  })
  while (picks.length < 3) picks.push(empty副将单位())
  return {
    主将: d.主将,
    副将1: picks[0],
    副将2: picks[1],
    副将3: picks[2],
  }
}

/**
 * 槽位下标若处于出战前三，对应 GET /api/attrs 返回键 `副将1`～`副将3`；否则 null。
 * 规则与 {@link 展开战斗用副将占位} 一致。
 */
export function 槽位对应战斗属性键(配置, slot) {
  const i = Math.trunc(Number(slot))
  if (!Number.isFinite(i) || i < 0) return null
  const d = normalizeConfigDeep(配置)
  const 列表 = d.副将列表
  const ord = (d.副将上阵顺序 || [])
    .filter(
      (j) =>
        j >= 0 &&
        j < 列表.length &&
        列表[j]?.状态 === '战' &&
        列表[j]?.已配置
    )
    .slice(0, 3)
  const pos = ord.indexOf(i)
  if (pos < 0) return null
  return `副将${pos + 1}`
}

/**
 * 保存前校验；成功时返回规范化后的完整配置（与 normalize 一致）。
 * @returns {{ ok: true, 配置: object } | { ok: false, 错误: string }}
 */
export function validateConfigForSave(原始) {
  const d = normalizeConfigDeep(原始)
  const 战数 = d.副将列表.filter((s) => s.状态 === '战').length
  if (战数 > 3) return { ok: false, 错误: '上阵为「战」的副将超过 3 个' }

  function check单位(name, unit, is主将) {
    const L = Math.min(160, Math.max(1, Number(unit.等级) || 1))
    const cap = 等级总点(L)
    const a = unit.属性分配
    const sum = (Number(a.体质) || 0) + (Number(a.智力) || 0) + (Number(a.力量) || 0) + (Number(a.敏捷) || 0)
    if (sum > cap) return `${name} 属性点总和超过 ${cap}`
    for (const k of ['体质', '智力', '力量', '敏捷']) {
      if ((Number(a[k]) || 0) < L) return `${name} 的 ${k} 不可低于 ${L}`
      if ((Number(a[k]) || 0) > 单维属性上限) return `${name} 的 ${k} 不可超过 ${单维属性上限}`
    }
    if (!is主将) {
      const opts = 副将人物选项(unit.头衔)
      if (!opts.includes(unit.人物)) return `${name} 人物与头衔不匹配`
    }
    return ''
  }

  const e1 = check单位('主将', d.主将, true)
  if (e1) return { ok: false, 错误: e1 }
  const gErr = validate帮派配置(d.主将.帮派)
  if (gErr) return { ok: false, 错误: gErr }

  for (let i = 0; i < d.副将列表.length; i++) {
    const s = d.副将列表[i]
    const label = `副将槽 ${i + 1}`
    if (s.状态 === '战' && !s.已配置) return { ok: false, 错误: `${label} 为「战」但未配置人物` }
    if (!s.已配置) continue
    const err = check单位(label, s, false)
    if (err) return { ok: false, 错误: err }
  }
  return { ok: true, 配置: d }
}

export function normalizeConfigDeep(raw) {
  const d = getDefaultConfig()
  if (!raw || typeof raw !== 'object') return d

  const u主 = raw.主将
  if (u主 && typeof u主 === 'object') {
    const t = d.主将
    migrate职业经历(u主, t)
    t.等级 = Math.min(160, Math.max(1, Number(u主.等级) || t.等级))
    t.转数 = Math.min(3, Math.max(0, Number(u主.转数) ?? t.转数))
    t.属性分配 = 修正属性分配(t.等级, u主.属性分配 || t.属性分配)
    t.天赋 = pad天赋(u主.天赋)
    const 当前世 = 当前角色分类(t)
    t.技能 = pad技能(当前世, u主.技能)
    t.坐骑 = {
      种类: u主.坐骑?.种类 != null ? String(u主.坐骑.种类) : t.坐骑.种类,
      转数: Math.min(3, Math.max(0, Number(u主.坐骑?.转数) ?? t.坐骑.转数)),
      等级: Math.min(160, Math.max(1, Number(u主.坐骑?.等级) || t.坐骑.等级)),
    }
    const gIn = u主.帮派
    if (gIn && typeof gIn === 'object') {
      let 主 = normalize帮派抗性项(gIn.主抗性)
      let 副 = normalize帮派抗性项(gIn.副抗性)
      if (gIn.抗性 != null && gIn.抗性 !== '' && !主 && !副) {
        const r = normalize帮派抗性项(gIn.抗性)
        if (r) 主 = r
      }
      t.帮派 = { 主抗性: 主, 副抗性: 副 }
    } else {
      t.帮派 = { 主抗性: null, 副抗性: null }
    }
    const eq = u主.装备 || {}
    const legacy项链 = eq.项链
    for (const p of 装备部位列表) {
      let slot = eq[p]
      if (p === '项饰' && !slot && legacy项链) slot = legacy项链
      t.装备[p] = normalize装备槽(p, slot && typeof slot === 'object' && slot.名称 != null ? slot : {})
    }
  }

  let slots = []
  if (Array.isArray(raw.副将列表) && raw.副将列表.length > 0) {
    for (let i = 0; i < 副将槽位总数; i++) {
      slots.push(normalize副将槽项(raw.副将列表[i], empty副将槽()))
    }
  } else {
    slots = Array.from({ length: 副将槽位总数 }, () => empty副将槽())
    const keys = ['副将1', '副将2', '副将3']
    for (let i = 0; i < 3; i++) {
      const u = raw[keys[i]]
      if (u && typeof u === 'object') {
        slots[i] = normalize副将槽项({ ...u, 已配置: true, 状态: '战' }, empty副将槽())
      }
    }
  }
  压制超额战槽(slots)
  d.副将列表 = slots
  if (Array.isArray(raw.副将上阵顺序)) {
    d.副将上阵顺序 = raw.副将上阵顺序
      .map((x) => Math.trunc(Number(x)))
      .filter((i) => i >= 0 && i < 副将槽位总数)
  }
  副将上阵顺序同步(d)
  return d
}
