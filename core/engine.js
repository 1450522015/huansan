import {战局初始化} from './engine/init.js'
import {战局结算} from './engine/jiesuan.js'

/**
 * 玩家配置转玩家属性
 * @param {string} id
 * @param {string} 红方用户名
 * @param {import('./types').玩家配置} 红方配置
 * @param {string} 黑方用户名
 * @param {import('./types').玩家配置} 黑方配置
 * @returns {import('./types').战局}
 */
export function 初始化(id, 红方用户名, 红方配置, 黑方用户名, 黑方配置) {
    return 战局初始化(id, 红方用户名, 红方配置, 黑方用户名, 黑方配置)
}

/**
 * @param {import('./types').战局} 战局
 * @param {import('./types').玩家出招[]} 红方出招 可空
 * @param {import('./types').玩家出招[]} 黑方出招 可空
 * @returns {import('./types').战局}
 */
export function 结算(战局, 红方出招, 黑方出招) {
    return 战局结算(战局, 红方出招, 黑方出招)
}

/**
 * @param {import('./types').战局} 战局
 */
export function 当前回合数据(战局) {
    return {
        战局描述: 战局.战局描述,
        红方: 战局.红方,
        黑方: 战局.黑方,
        回合信息: 战局.战局描述.当前回合 === 1 ? null : 战局.回合信息[战局.回合信息.length - 1],
    }
}