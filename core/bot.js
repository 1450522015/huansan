/**
 * AI出招生成（人机永远是黑方）
 * @param {import('./types').战局} 战局
 * @param {import('./types').玩家出招[]} 红方出招 可空
 * @param {string} ai类型 AI类型，如'只会攻击'、'只会防御'
 * @returns {import('./types').玩家出招[]}
 */
export function 出招(战局, 红方出招, ai类型 = '只会攻击') {
    const 黑方用户名 = 战局.黑方.用户名

    function getBlackUnits() {
        const units = []
        const 状态 = 战局.黑方.状态
        if (状态.主将) units.push(状态.主将)
        if (状态.副将列表) {
            for (const 副将 of 状态.副将列表) {
                if (副将) units.push(副将)
            }
        }
        return units
    }

    const 黑方单位 = getBlackUnits()
    const 存活黑方 = 黑方单位.filter(u => u.气血 > 0)
    if (存活黑方.length === 0) return []

    const actions = []

    if (ai类型 === '只会防御') {
        for (const unit of 存活黑方) {
            actions.push({
                出招方玩家名: 黑方用户名,
                出招方武将下标: unit.武将下标,
                操作: '防御',
            })
        }
    } else if (ai类型 === '只会攻击') {
        // 出招为空数组，代表自动攻击
    }

    return actions
}
