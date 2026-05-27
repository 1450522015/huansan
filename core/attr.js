import {calculateMainGeneral} from "./attr/main-general-calculator.js";
import {calculateSubGeneral} from "./attr/sub-general-calculator.js";

/**
 * 玩家配置转玩家属性
 * @param {import('./types').玩家配置} config
 * @returns {import('./types').玩家属性}
 */
export function 玩家配置转玩家属性(config) {
    if (!config || typeof config !== 'object') return null

    const 主将 = calculateMainGeneral(config.主将)
    if (!主将) return null

    const 副将列表 = []

    if (Array.isArray(config.副将列表)) {
        for (const subGeneral of config.副将列表) {
            const attrs = calculateSubGeneral(subGeneral)
            if (attrs) {
                副将列表.push(attrs)
            }
        }
    }

    return {
        主将,
        副将列表,
    }
}

function buildAttrsResult(cfg, 含无双 = false) {
    if (!cfg || typeof cfg !== 'object') {
        return { 主将: null, 副将1: null, 副将2: null, 副将3: null }
    }

    const 主将 = calculateMainGeneral(cfg.主将)

    const 副将结果 = {}
    if (Array.isArray(cfg.副将列表)) {
        for (let i = 0; i < Math.min(cfg.副将列表.length, 3); i++) {
            const deputyCfg = cfg.副将列表[i]
            const attrs = calculateSubGeneral(deputyCfg)
            if (attrs) {
                副将结果[`副将${i + 1}`] = 含无双 && attrs.无双属性
                    ? { ...attrs, ...attrs.无双属性 }
                    : attrs
            } else {
                副将结果[`副将${i + 1}`] = null
            }
        }
    }

    return {
        主将,
        副将1: 副将结果.副将1 || null,
        副将2: 副将结果.副将2 || null,
        副将3: 副将结果.副将3 || null,
    }
}

export function computeAttrsFromConfig(config) {
    return buildAttrsResult(config, false)
}

export function computeAttrsFromConfig无双(config) {
    return buildAttrsResult(config, true)
}

export function computeAttrsFromConfigDebug(config) {
    const result = buildAttrsResult(config, false)
    const 完整 = 玩家配置转玩家属性(config)
    return {
        ...result,
        调试: 完整,
    }
}
