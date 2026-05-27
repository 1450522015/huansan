/**
 * 副将属性计算模块
 */
import {calculateGems} from './gem-calculator.js'
import {finalizeBattleResult, mergeNumericObjects, roundBeforeTalentMultiply} from './utils.js'
import {主将战斗职业轴, 修正属性分配, 副将默契战斗加成, 当前角色分类, 计算风格,} from './game-data.js'
import {calculateSubGeneralBase} from './base-calculator.js'
import {收集天赋乘系数, 计算天赋加法} from './talent.js'

export function calculateSubGeneral(subGeneralConfig) {
    if (!subGeneralConfig || typeof subGeneralConfig !== 'object') return null

    const 等级 = subGeneralConfig.等级 ?? 160
    const 分配 = 修正属性分配(等级, subGeneralConfig.属性分配)
    const 角色分类 = 当前角色分类(subGeneralConfig)

    const 宝石属性 = calculateGems(subGeneralConfig.宝石, 9)
    const 宝石四维 = {
        体质: 宝石属性.体质 || 0,
        智力: 宝石属性.智力 || 0,
        力量: 宝石属性.力量 || 0,
        敏捷: 宝石属性.敏捷 || 0
    }

    const 装备其他属性 = {}
    for (const [k, v] of Object.entries(宝石属性)) {
        if (!['体质', '智力', '力量', '敏捷'].includes(k)) {
            装备其他属性[k] = v
        }
    }

    const 天加 = 计算天赋加法(subGeneralConfig.天赋)
    const 默契 = 副将默契战斗加成(subGeneralConfig.默契度, 主将战斗职业轴(角色分类))

    const baseCore = calculateSubGeneralBase(分配, 等级, 宝石四维, 角色分类, subGeneralConfig, false)
    const merged加完 = mergeNumericObjects(baseCore, 装备其他属性, 天加, 默契)
    const merged = {...merged加完}
    roundBeforeTalentMultiply(merged)

    const 天乘 = 收集天赋乘系数(subGeneralConfig.天赋)
    merged.攻击 = (Number(merged.攻击) || 0) * 天乘.攻
    merged.气血 = (Number(merged.气血) || 0) * 天乘.血

    const 风格 = 计算风格(等级, 分配)

    const result = finalizeBattleResult({风格, 角色分类, merged, cfg: subGeneralConfig})

    const baseCore无双 = calculateSubGeneralBase(分配, 等级, 宝石四维, 角色分类, subGeneralConfig, true)
    const merged加完无双 = mergeNumericObjects(baseCore无双, 装备其他属性, 天加, 默契)
    const merged无双 = {...merged加完无双}
    roundBeforeTalentMultiply(merged无双)
    merged无双.攻击 = (Number(merged无双.攻击) || 0) * 天乘.攻
    merged无双.气血 = (Number(merged无双.气血) || 0) * 天乘.血

    result.无双属性 = {
        气血: Math.max(0, Math.round(merged无双.气血 || 0)),
        精力: Math.max(0, Math.round(merged无双.精力 || 0)),
        攻击: Math.max(0, Math.round(merged无双.攻击 || 0)),
        速度: Math.max(0, Math.round(merged无双.速度 || 0)),
    }

    return result
}
