/**
 * 宝石属性计算模块
 */
import {createEmptyAccumulator} from './utils.js'
import {四维键} from './constants.js'

/**
 * 计算单个宝石的属性
 * @param {import('../types').宝石} gem
 * @returns {Object} 属性对象
 */
function calculateGemAttr(gem) {
    if (!gem || typeof gem !== 'object' || !gem.属性) return {}
    const val = Number(gem.数值)
    if (!Number.isFinite(val)) return {}

    return {[gem.属性]: val}
}

/**
 * 计算宝石列表的总属性
 * @param {import('../types').宝石[]} gemList
 * @param {number} maxCount 最大数量（副将最多9个）
 * @returns {Object} 累加属性
 */
export function calculateGems(gemList, maxCount = Infinity) {
    const acc = createEmptyAccumulator()
    if (!Array.isArray(gemList)) return acc

    const list = gemList.slice(0, maxCount)
    for (const gem of list) {
        const attr = calculateGemAttr(gem)
        for (const [k, v] of Object.entries(attr)) {
            const n = Number(v)
            if (!Number.isFinite(n)) continue
            if (acc[k] === undefined) acc[k] = 0
            acc[k] += n
        }
    }

    return acc
}

/**
 * 从宝石属性中分离四维属性
 * @param {Object} gemAttrs
 * @returns {{ fourDims: Object, otherAttrs: Object }}
 */
export function separateFourDimensions(gemAttrs) {
    const fourDims = {体质: 0, 智力: 0, 力量: 0, 敏捷: 0}
    const otherAttrs = {}

    for (const [k, v] of Object.entries(gemAttrs)) {
        if (四维键.includes(k)) {
            fourDims[k] = Number(v) || 0
        } else {
            otherAttrs[k] = v
        }
    }

    return {fourDims, otherAttrs}
}
