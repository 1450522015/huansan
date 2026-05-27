/**
 * 主将属性计算模块
 */
import {separateFourDimensions} from './gem-calculator.js'
import {finalizeBattleResult, mergeNumericObjects, roundBeforeTalentMultiply} from './utils.js'
import {
    主将今世抗性加算,
    主将前世槽抗性加算,
    主将前世槽速度连乘系数,
    修正属性分配,
    坐骑战斗加成,
    当前角色分类,
    计算风格,
} from './game-data.js'
import {calculateMainGeneralBase} from './base-calculator.js'
import {收集天赋乘系数, 计算天赋加法} from './talent.js'

function sumMainGeneralEquipment(equipment) {
    const acc = {体质: 0, 智力: 0, 力量: 0, 敏捷: 0}
    if (!equipment || typeof equipment !== 'object') return acc

    const 装备部位列表 = ['头盔', '项饰', '武器', '护腕', '铠甲', '战靴']

    for (const 部位 of 装备部位列表) {
        const 格 = equipment[部位]
        if (!格 || typeof 格 !== 'object') continue
        if (格.名称 === '无') continue
        const merged = parseEquipmentSlot(部位, 格)
        for (const [k, v] of Object.entries(merged)) {
            const n = Number(v)
            if (!Number.isFinite(n)) continue
            if (acc[k] === undefined) acc[k] = 0
            acc[k] += n
        }
    }
    return acc
}

function parseEquipmentSlot(部位, 格) {
    const out = {}
    if (!格 || typeof 格 !== 'object') return out
    const 名称 = 格.名称
    if (名称 === '无') return out
    const 词条 = 格.词条

    const 头盔配置 = {
        凤翅鎏金盔: {词条: ['抗围困', '抗扰乱', '抗封锁'], 数值: 10},
        绣银逍遥巾: {词条: ['抗风沙', '抗妖火', '抗落雷', '抗毒术'], 数值: 10},
        兽骨魔神盔: {词条: ['抗物理'], 数值: 10},
        苍云天龙冠: {词条: ['抗风沙', '抗妖火', '抗落雷', '抗毒术'], 数值: 10},
    }
    const 武器表 = {
        九转盘龙枪: {攻击: 2450},
        太乙神钩: {攻击: 2450},
        八楞紫金锤: {攻击: 4900},
        苍龙五虎剑: {攻击: 2450},
        八宝驼龙刀: {攻击: 3430},
    }
    const 铠甲表 = {
        凤翅鎏金甲: {防御: 2500},
        凝血战袍: {防御: 2500},
        兽骨魔神甲: {防御: 5000},
        金缕玉衣: {防御: 2500},
        斗战圣铠: {防御: 3500},
    }

    if (部位 === '头盔' && 名称 && 头盔配置[名称]) {
        const cfg = 头盔配置[名称]
        const key = 词条 && cfg.词条.includes(词条) ? 词条 : cfg.词条[0]
        out[key] = cfg.数值
    } else if (部位 === '项饰' && 名称 === '缀星项链') {
        out.精力 = 3200
    } else if (部位 === '武器' && 名称 && 武器表[名称]) {
        Object.assign(out, 武器表[名称])
    } else if (部位 === '护腕' && 名称 === '星链护腕') {
        out.气血 = 3200
    } else if (部位 === '铠甲' && 名称 && 铠甲表[名称]) {
        Object.assign(out, 铠甲表[名称])
    } else if (部位 === '战靴' && 名称 === '龙骨靴') {
        if (词条 === '敏捷') out.敏捷 = 100
        else out.速度 = 100
    }

    if (Array.isArray(格.宝石)) {
        for (const g of 格.宝石) {
            if (!g || typeof g !== 'object' || !g.属性) continue
            const val = Number(g.数值)
            if (!Number.isFinite(val)) continue
            out[g.属性] = (Number(out[g.属性]) || 0) + val
        }
    }
    return out
}

export function calculateMainGeneral(mainGeneralConfig) {
    if (!mainGeneralConfig || typeof mainGeneralConfig !== 'object') return null

    const 等级 = mainGeneralConfig.等级 ?? 160
    const 分配 = 修正属性分配(等级, mainGeneralConfig.属性分配)
    const 角色分类 = 当前角色分类(mainGeneralConfig)

    const 装备和 = sumMainGeneralEquipment(mainGeneralConfig.装备)
    const {fourDims: 宝石四维, otherAttrs: 装备其他属性} = separateFourDimensions(装备和)

    const 骑 = mainGeneralConfig.坐骑
        ? 坐骑战斗加成(mainGeneralConfig.坐骑.种类, mainGeneralConfig.坐骑.等级, mainGeneralConfig.坐骑.转数)
        : {}

    const baseCore = calculateMainGeneralBase(分配, 等级, 宝石四维, 角色分类, mainGeneralConfig.职业经历)
    const 前世抗 = 主将前世槽抗性加算(mainGeneralConfig.职业经历)
    const 今世抗 = 主将今世抗性加算(角色分类)
    const 天加 = 计算天赋加法(mainGeneralConfig.天赋)
    const 帮 = mainGeneralConfig.帮派
        ? calculateGuildBonus(mainGeneralConfig.帮派.主抗性, mainGeneralConfig.帮派.副抗性)
        : {}

    const merged加完 = mergeNumericObjects(baseCore, 前世抗, 今世抗, 装备其他属性, 骑, 天加, 帮)
    const merged = {...merged加完}

    const v速 = 主将前世槽速度连乘系数(mainGeneralConfig.职业经历)
    const 速加算后 = Number(merged.速度) || 0
    merged.速度 = Math.round(速加算后) * v速

    roundBeforeTalentMultiply(merged)

    const 天乘 = 收集天赋乘系数(mainGeneralConfig.天赋)
    merged.攻击 = (Number(merged.攻击) || 0) * 天乘.攻
    merged.气血 = (Number(merged.气血) || 0) * 天乘.血

    const 风格 = 计算风格(等级, 分配)

    return finalizeBattleResult({风格, 角色分类, merged, cfg: {...mainGeneralConfig, 是主将: true}})
}

function calculateGuildBonus(主抗性, 副抗性) {
    const 帮派抗性可选 = ['抗物理', '抗封锁', '抗扰乱', '抗围困', '抗风沙', '抗妖火', '抗毒术', '抗落雷']

    function normalize(v) {
        if (v == null || v === '') return null
        const s = String(v).trim()
        return 帮派抗性可选.includes(s) ? s : null
    }

    const 主 = normalize(主抗性)
    const 副 = normalize(副抗性)
    const o = {}
    if (主) o[主] = 20
    if (副) o[副] = 10
    return o
}
