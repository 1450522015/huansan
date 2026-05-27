import {天赋百分比, 技能等级档位列表, 神将技增幅比例, 技能目标个数表, 技能持续回合数表} from '../gameCatalog.js'
import {
    力劈华山固定伤害表,
    固若金汤表,
    技能当前效果两位小数,
    技能当前效果表,
    技能精力消耗表,
    排山倒海固定伤害表,
    舍命气血消耗表,
} from './constants.js'

function 角色分类转职业(角色分类) {
    const s = String(角色分类 || '')
    if (s.endsWith('武')) return '武人'
    if (s.endsWith('文')) return '文人'
    if (s.endsWith('异')) return '异人'
    return '武人'
}

function 技能档位范围(档位) {
    return 技能等级档位列表.find((r) => r.档位 === 档位) || 技能等级档位列表[0]
}

function clamp熟练度到档位(档位, 熟练度) {
    const row = 技能档位范围(档位)
    let x = Number(熟练度)
    if (!Number.isFinite(x)) x = row.熟练度最小
    if (x > row.熟练度最大) x = row.熟练度最大
    if (x < row.熟练度最小) x = row.熟练度最小
    return x
}

function 技能熟练度边界(档位) {
    if (档位 === '1') return [1, 6000]
    if (档位 === '2') return [6000, 12000]
    if (档位 === '3') return [12000, 18000]
    if (档位 === '4') return [18000, 24000]
    if (档位 === '5') return [24000, 30000]
    if (档位 === '化境极') return [0, 50000]
    return [0, 20000]
}

function 技能插值(档位, 熟练度, table) {
    const range = table?.[档位]
    if (!Array.isArray(range)) return null
    const [start, end] = range
    const [p0, p1] = 技能熟练度边界(档位)
    const p = Math.max(p0, Math.min(p1, Number(熟练度) || p0))
    if (p1 === p0) return Number(end)
    const t = (p - p0) / (p1 - p0)
    return start + (end - start) * t
}

function 技能效果保留两位小数(x) {
    return Math.round(Number(x) * 100) / 100
}

function 取战斗属性增幅(战斗属性, key) {
    const fx = 战斗属性 && typeof 战斗属性 === 'object' ? (战斗属性.天赋效果 || {}) : {}
    return Number(fx?.[key] || 0)
}

function 取天赋列表增幅(天赋列表, 名称) {
    const arr = Array.isArray(天赋列表) ? 天赋列表 : []
    const row = arr.find((t) => String(t?.名称 || '') === String(名称))
    if (!row) return 0
    return Number(天赋百分比(名称, Number(row.等级) || 160)) || 0
}

function 取司南车增幅(上下文) {
    const m = 上下文?.坐骑
    if (!m || typeof m !== 'object') return 0
    if (String(m.种类 || '') !== '司南车') return 0
    return 0.1 * Math.max(0, Number(m.等级) || 0)
}

function 计算神将技增幅(神将技名称, 副将等级) {
    const ratio = 神将技增幅比例[神将技名称]
    if (ratio == null) return 0
    return ratio * Math.max(0, Number(副将等级) || 0)
}

function 技能当前效果增幅值(名称, base, 战斗属性, 上下文 = {}) {
    const atk = Math.max(0, Number(战斗属性?.战斗攻击 || 战斗属性?.攻击 || 0))
    const 法伤 = Math.max(0, Number(战斗属性?.法伤力 || 0))
    const 舍命 = 取战斗属性增幅(战斗属性, '舍命')
    const 舍攻 = 取战斗属性增幅(战斗属性, '舍攻')
    const 强攻 = (() => {
        const byAttr = 取战斗属性增幅(战斗属性, '强攻')
        if (byAttr > 0) return byAttr
        return 取天赋列表增幅(上下文?.天赋, '强攻')
    })()
    const 神将技名称 = 上下文?.神将技 || ''
    const 副将等级 = Math.max(0, Number(上下文?.等级) || 0)
    const 神将技 = 神将技名称 === 名称 ? 计算神将技增幅(神将技名称, 副将等级) : 0
    const mount = 取司南车增幅(上下文)
    let v
    if (名称 === '舍命一击') {
        const n1 = (base + atk * 0.5) * (1 + 舍命 / 100) * (1 + 神将技 / 100)
        const n2 = atk * (舍攻 / 100) * (1 + 强攻 / 100)
        v = n1 + n2
    } else if (名称 === '力劈华山' || 名称 === '排山倒海') v = base + 神将技
    else if (名称 === '固若金汤') v = base + 神将技
    else if (名称 === '凌波微步') v = base + 神将技
    else if (名称 === '呼风唤雨') v = base * (1 + 取战斗属性增幅(战斗属性, '风沙') / 100 + 法伤 / 100) * (1 + 神将技 / 100)
    else if (名称 === '妖火燎原') v = base * (1 + 取战斗属性增幅(战斗属性, '妖火') / 100 + 法伤 / 100) * (1 + 神将技 / 100)
    else if (名称 === '五雷轰顶') v = base * (1 + 取战斗属性增幅(战斗属性, '落雷') / 100 + 法伤 / 100) * (1 + 神将技 / 100)
    else if (名称 === '巫蛊极毒') v = base * (1 + 取战斗属性增幅(战斗属性, '毒术') / 100 + 法伤 / 100) * (1 + 神将技 / 100)
    else if (名称 === '画地为牢') v = base + 取战斗属性增幅(战斗属性, '围困') + 神将技 + mount
    else if (名称 === '趁火打劫') v = base + 取战斗属性增幅(战斗属性, '扰乱') + 神将技 + mount
    else if (名称 === '四面楚歌') v = base + 取战斗属性增幅(战斗属性, '封锁') + 神将技 + mount
    else if (名称 === '暗渡陈仓') v = base + 取战斗属性增幅(战斗属性, '暗渡') + mount
    else if (名称 === '金蝉脱壳') v = base + mount
    else v = base
    if (技能当前效果两位小数.has(名称) && Number.isFinite(v)) return 技能效果保留两位小数(v)
    return v
}

function 构建基础技能条目(名称, 档位, 熟练度, 战斗属性, 上下文) {
    const def = 技能当前效果表[名称]
    if (!def) return null

    const baseRaw = 技能插值(档位, 熟练度, def.表)
    const base = Number.isFinite(baseRaw) ? baseRaw : 0
    const v = 技能当前效果增幅值(名称, base, 战斗属性, 上下文)
    const 当前效果 = 技能当前效果两位小数.has(名称) ? 技能效果保留两位小数(v) : Math.round(v)

    return {
        名称,
        当前效果,
        是神将技: 上下文?.神将技 === 名称,
    }
}

function 填充通用字段(entry, 名称, 档位, 熟练度, 上下文) {
    if (技能目标个数表[名称] !== undefined) {
        let 目标个数 = 技能目标个数表[名称]
        if (名称 === '画地为牢' && 上下文?.是主将 && 档位 === '化境极') {
            目标个数++
        }
        entry.目标个数 = 目标个数
    }
    if (技能持续回合数表[名称] !== undefined) {
        entry.持续回合数 = 技能持续回合数表[名称]
    }

    const 职业 = 角色分类转职业(上下文?.角色分类)
    const 精力表 = 技能精力消耗表[职业]
    const 精力Range = 精力表?.[档位]
    if (Array.isArray(精力Range)) {
        const [e0, e1] = 精力Range
        const [p0, p1] = 技能熟练度边界(档位)
        const p = Math.max(p0, Math.min(p1, Number(熟练度) || p0))
        entry.精力消耗 = Math.round(e0 + (e1 - e0) * (p - p0) / (p1 - p0))
    }
}

function 填充技能专属字段(entry, 名称, 档位, 熟练度, 战斗属性, 上下文) {
    if (名称 === '舍命一击') {
        const 消耗Range = 舍命气血消耗表[档位]
        if (Array.isArray(消耗Range)) {
            const [c0, c1] = 消耗Range
            const [p0, p1] = 技能熟练度边界(档位)
            const p = Math.max(p0, Math.min(p1, Number(熟练度) || p0))
            entry.气血消耗 = Math.round(c0 + (c1 - c0) * (p - p0) / (p1 - p0))
        }
    } else if (名称 === '力劈华山') {
        entry.力劈华山固定伤害 = 力劈华山固定伤害表[档位] ?? 0
    } else if (名称 === '排山倒海') {
        entry.排山倒海固定伤害 = 排山倒海固定伤害表[档位] ?? 0
    } else if (名称 === '固若金汤') {
        const 固表 = 固若金汤表[档位]
        if (固表) {
            entry.固若金汤防御 = 固表.防御
            const [r0, r1] = 固表.抗法术
            const [p0, p1] = 技能熟练度边界(档位)
            const p = Math.max(p0, Math.min(p1, Number(熟练度) || p0))
            entry.固若金汤抗法术 = Math.round(r0 + (r1 - r0) * (p - p0) / (p1 - p0))
        }
    } else if (名称 === '巫蛊极毒') {
        if (档位 === '化境3' || 档位 === '化境极') {
            entry.巫蛊极毒衰减模式 = '上一回合的75%'
        } else {
            entry.巫蛊极毒衰减模式 = '第一回合的50%'
        }
    }
}

function 构建毁天灭地条目(档位, 熟练度, 战斗属性, 上下文) {
    const 五雷面板 = 技能当前效果表['五雷轰顶']
    const 妖火面板 = 技能当前效果表['妖火燎原']
    const 五雷BaseRaw = 技能插值(档位, 熟练度, 五雷面板?.表)
    const 五雷Base = Number.isFinite(五雷BaseRaw) ? 五雷BaseRaw : 0
    const 妖火BaseRaw = 技能插值(档位, 熟练度, 妖火面板?.表)
    const 妖火Base = Number.isFinite(妖火BaseRaw) ? 妖火BaseRaw : 0
    const 法伤 = Math.max(0, Number(战斗属性?.法伤力 || 0))
    const 神将技名称 = 上下文?.神将技 || ''
    const 副将等级 = Math.max(0, Number(上下文?.等级) || 0)
    const 神将技 = 神将技名称 === '毁天灭地' ? 计算神将技增幅(神将技名称, 副将等级) : 0
    const 主体伤害 = 五雷Base * (1 + 取战斗属性增幅(战斗属性, '落雷') / 100 + 法伤 / 100) * (1 + 神将技 / 100)
    const 溅射伤害 = 妖火Base * (1 + 取战斗属性增幅(战斗属性, '妖火') / 100 + 法伤 / 100) * (1 + 神将技 / 100)

    const entry = {
        名称: '毁天灭地',
        当前效果: Number.isFinite(主体伤害) ? Math.round(主体伤害) : 0,
        是神将技: 上下文?.神将技 === '毁天灭地',
        毁天灭地溅射伤害: Number.isFinite(溅射伤害) ? Math.round(溅射伤害) : 0,
        持续回合数: 技能持续回合数表['毁天灭地'],
    }

    const 职业 = 角色分类转职业(上下文?.角色分类)
    const 精力表 = 技能精力消耗表[职业]
    const 精力Range = 精力表?.[档位]
    if (Array.isArray(精力Range)) {
        const [e0, e1] = 精力Range
        const [p0, p1] = 技能熟练度边界(档位)
        const p = Math.max(p0, Math.min(p1, Number(熟练度) || p0))
        entry.精力消耗 = Math.round(e0 + (e1 - e0) * (p - p0) / (p1 - p0))
    }

    return entry
}

export function 计算技能效果列表(技能列表, 战斗属性, 上下文 = {}) {
    if (!Array.isArray(技能列表)) return {}
    const result = {}
    for (const 技能项 of 技能列表) {
        const s = 技能项 && typeof 技能项 === 'object' ? 技能项 : {}
        const 名称 = String(s.名称 || '').trim()
        if (!名称) continue

        const 档位 = 技能档位范围(String(s.等级 || '')).档位
        const 熟练度 = clamp熟练度到档位(档位, s.熟练度)

        if (名称 === '毁天灭地') {
            result[名称] = 构建毁天灭地条目(档位, 熟练度, 战斗属性, 上下文)
            continue
        }

        const entry = 构建基础技能条目(名称, 档位, 熟练度, 战斗属性, 上下文)
        if (!entry) continue

        填充通用字段(entry, 名称, 档位, 熟练度, 上下文)
        填充技能专属字段(entry, 名称, 档位, 熟练度, 战斗属性, 上下文)

        result[名称] = entry
    }
    return result
}
