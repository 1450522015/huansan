/**
 * 工具函数
 */
import {四维键, 基础属性键, 特殊属性键} from './constants.js'
import {收集天赋效果} from './talent.js'
import {计算技能效果列表} from './skill-calculator.js'

export function createEmptyAccumulator() {
    const acc = {}
    for (const k of [...基础属性键, ...特殊属性键, ...四维键]) {
        acc[k] = 0
    }
    return acc
}

export function mergeNumericObjects(...parts) {
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

export function roundBeforeTalentMultiply(merged) {
    if (!merged || typeof merged !== 'object') return
    const 战斗属性输出数值键 = [...基础属性键, ...特殊属性键]
    for (const k of 战斗属性输出数值键) {
        const v = merged[k]
        if (v === undefined || v === null) continue
        if (typeof v === 'string') continue
        const n = Number(v)
        if (!Number.isFinite(n)) continue
        merged[k] = Math.round(n)
    }
}

export function finalizeBattleResult(pack) {
    if (!pack) return null
    const {风格, 角色分类, merged, cfg} = pack

    const result = {
        风格,
        角色分类,
    }

    for (const k of 基础属性键) {
        result[k] = Math.max(0, Math.round(merged[k] || 0))
    }

    for (const k of 特殊属性键) {
        const v = merged[k]
        result[k] = typeof v === 'string' ? v : Math.max(0, Math.round(v || 0))
    }

    result.天赋效果 = 收集天赋效果(cfg?.天赋)

    const 技能列表 = Array.isArray(cfg?.技能) ? cfg.技能 : []
    result.技能效果 = 计算技能效果列表(技能列表, result, {
        坐骑: cfg?.坐骑,
        天赋: cfg?.天赋,
        等级: cfg?.等级,
        神将技: cfg?.神将技,
        角色分类: 角色分类,
        是主将: cfg?.是主将,
    })

    const 坐骑 = cfg?.坐骑
    if (坐骑 && 坐骑.种类 && 坐骑.种类 !== '无') {
        const 坐骑种类 = String(坐骑.种类).trim()
        if (坐骑种类 === '木牛流马') {
            const L = Math.min(160, Math.max(1, Number(坐骑.等级) || 1))
            const pct = Math.round(0.1 * L)
            result.坐骑效果 = {[坐骑种类]: pct}
        }
    }

    return result
}
