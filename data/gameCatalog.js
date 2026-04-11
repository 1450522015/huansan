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

/** 坐骑按序号的简易战斗加成（任务未给具体表，占位可后续替换） */
export function 坐骑战斗加成(种类名, 坐骑等级) {
  const idx = Math.max(0, 坐骑列表.indexOf(String(种类名)))
  const n = idx < 0 ? 0 : idx + 1
  const k = (Number(坐骑等级) || 160) / 160
  return {
    气血: Math.round(60 * n * k),
    精力: Math.round(30 * n * k),
    攻击: Math.round(4 * n * k),
    防御: Math.round(3 * n * k),
    速度: Math.round(2 * n * k),
  }
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
  '抗玄击',
  '抗封锁',
  '抗扰乱',
  '抗围困',
  '抗风沙',
  '抗妖火',
  '抗毒术',
  '抗落雷',
]

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

/** 等级降低等导致溢出时：四维全部=当前等级 */
export function 修正属性分配(等级, 分配) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  const cap = 等级总点(L)
  const d = 默认四维(L)
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

export function 计算风格(等级, 分配) {
  const L = Math.min(160, Math.max(1, Number(等级) || 1))
  const a = 修正属性分配(L, 分配)
  const opt = 可选点上限(L)
  const e体 = Math.max(0, a.体质 - L)
  const e智 = Math.max(0, a.智力 - L)
  const e力 = Math.max(0, a.力量 - L)
  const e敏 = Math.max(0, a.敏捷 - L)
  if (e体 >= opt && e智 + e力 + e敏 === 0) return '气血型'
  if (e智 >= opt && e体 + e力 + e敏 === 0) return '精力型'
  if (e力 >= opt && e体 + e智 + e敏 === 0) return '攻击型'
  if (e敏 >= opt && e体 + e智 + e力 === 0) return '速度型'
  if (e体 + e智 + e力 + e敏 === 0) return '混合型'
  const order = [
    ['体质', e体],
    ['智力', e智],
    ['力量', e力],
    ['敏捷', e敏],
  ]
  order.sort((x, y) => y[1] - x[1])
  const k1 = order[0][0]
  const k2 = order[1][0]
  const set = new Set([k1, k2])
  if (set.has('体质') && set.has('智力')) return '血精型'
  if (set.has('力量') && set.has('敏捷')) return '攻速型'
  if (set.has('体质') && set.has('力量')) return '血攻型'
  if (set.has('体质') && set.has('敏捷')) return '血速型'
  if (set.has('智力') && set.has('力量')) return '精攻型'
  if (set.has('智力') && set.has('敏捷')) return '精读型'
  return '混合型'
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

export const 技能等级说明 =
  '1级熟练度1–6000；2级6000–12000；3级12000–18000；4级18000–24000；5级24000–30000；化境1–3级熟练度各0–20000；化境极0–50000。'

export function empty技能槽(名称) {
  return { 名称, 等级: 1, 熟练度: 0 }
}

export function 默认技能组(角色分类) {
  return 固定技能列表(角色分类).map((n) => empty技能槽(n))
}

export function normalize天赋项(raw) {
  if (!raw || typeof raw !== 'object') return { 名称: null, 等级: 1 }
  if (typeof raw === 'string') return { 名称: raw, 等级: 160 }
  return {
    名称: raw.名称 != null ? raw.名称 : null,
    等级: Math.min(160, Math.max(1, Number(raw.等级) || 1)),
  }
}

export function normalize技能项(raw, 默认名) {
  if (!raw || typeof raw !== 'object') {
    return { 名称: 默认名, 等级: 1, 熟练度: 0 }
  }
  return {
    名称: String(raw.名称 || 默认名),
    等级: Math.min(160, Math.max(1, Number(raw.等级) || 1)),
    熟练度: Math.max(0, Number(raw.熟练度) || 0),
  }
}

function build主将装备() {
  const 装备 = {}
  for (const p of 装备部位列表) {
    装备[p] = normalize装备槽(p, empty装备槽())
  }
  return 装备
}

function empty副将单位() {
  const 角色分类 = 角色分类列表[0]
  return {
    角色分类,
    等级: 160,
    转数: 3,
    属性分配: { 体质: 160, 智力: 160, 力量: 160, 敏捷: 160 },
    宝石: [],
    天赋: [
      { 名称: null, 等级: 1 },
      { 名称: null, 等级: 1 },
      { 名称: null, 等级: 1 },
      { 名称: null, 等级: 1 },
    ],
    技能: 默认技能组(角色分类),
  }
}

export function getDefaultConfig() {
  const 角色分类 = 角色分类列表[0]
  return {
    主将: {
      角色分类,
      等级: 160,
      转数: 3,
      属性分配: { 体质: 160, 智力: 160, 力量: 160, 敏捷: 160 },
      装备: build主将装备(),
      坐骑: { 种类: 坐骑列表[0], 转数: 3, 等级: 160 },
      天赋: [
        { 名称: null, 等级: 1 },
        { 名称: null, 等级: 1 },
        { 名称: null, 等级: 1 },
        { 名称: null, 等级: 1 },
      ],
      技能: 默认技能组(角色分类),
    },
    副将1: empty副将单位(),
    副将2: empty副将单位(),
    副将3: empty副将单位(),
  }
}

export function normalizeConfigDeep(raw) {
  const d = getDefaultConfig()
  if (!raw || typeof raw !== 'object') return d

  function migrate角色(u, target) {
    if (u.角色分类 && 角色分类列表.includes(u.角色分类)) {
      target.角色分类 = u.角色分类
    } else if (u.职业 && u.性别) {
      const 性 = u.性别 === '女' ? '女' : '男'
      const 职 = u.职业
      if (职 === '武人') target.角色分类 = 性 + '武'
      else if (职 === '文人') target.角色分类 = 性 + '文'
      else target.角色分类 = 性 + '异'
    }
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

  const units = ['主将', '副将1', '副将2', '副将3']
  for (const key of units) {
    const u = raw[key]
    const t = d[key]
    if (!u || typeof u !== 'object') continue
    migrate角色(u, t)
    t.等级 = Math.min(160, Math.max(1, Number(u.等级) || t.等级))
    t.转数 = Math.min(3, Math.max(0, Number(u.转数) ?? t.转数))
    t.属性分配 = 修正属性分配(t.等级, u.属性分配 || t.属性分配)
    t.天赋 = pad天赋(u.天赋)
    t.技能 = pad技能(t.角色分类, u.技能)

    if (key === '主将') {
      t.坐骑 = {
        种类: u.坐骑?.种类 != null ? String(u.坐骑.种类) : t.坐骑.种类,
        转数: Math.min(3, Math.max(0, Number(u.坐骑?.转数) ?? t.坐骑.转数)),
        等级: Math.min(160, Math.max(1, Number(u.坐骑?.等级) || t.坐骑.等级)),
      }
      const eq = u.装备 || {}
      const legacy项链 = eq.项链
      for (const p of 装备部位列表) {
        let slot = eq[p]
        if (p === '项饰' && !slot && legacy项链) slot = legacy项链
        t.装备[p] = normalize装备槽(p, slot && typeof slot === 'object' && slot.名称 != null ? slot : {})
      }
    } else {
      const gems = Array.isArray(u.宝石) ? u.宝石 : []
      t.宝石 = gems
        .slice(0, 9)
        .map((g) => ({ 属性: g.属性, 数值: Math.min(15, Math.max(1, Number(g.数值) || 15)) }))
    }
  }
  return d
}
