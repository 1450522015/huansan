export function getDeputyName(玩家信息, 武将下标) {
    if (武将下标 === -1) return 玩家信息.用户名
    const 副将配置 = 玩家信息.配置.副将列表[武将下标]
    if (!副将配置) throw new Error(`[battle] 副将${武将下标}缺少配置数据`)
    if (!副将配置.人物) throw new Error(`[battle] 副将${武将下标}缺少人物名称`)
    let 副将名称 = 副将配置.人物
    if (副将配置?.真) 副将名称 = '(真)' + 副将名称
    if (玩家信息.状态.副将列表.find(o => o && o.武将下标 === 武将下标)?.无双?.是否开启) 副将名称 = '无双-' + 副将名称
    return 副将名称
}
