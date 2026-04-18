export function buildActionList(selfTeam, actionsMap, autoMode) {
  const actionList = []
  const selfUnits = (Array.isArray(selfTeam) ? selfTeam : []).filter((u) => u.type === 'unit')
  for (const u of selfUnits) {
    const saved = actionsMap?.[u.key]
    actionList.push({
      unitKey: u.key,
      操作: saved?.操作 || null,
      目标: saved?.目标 || null,
      物品: saved?.物品 || null,
      招将: saved?.招将 || null,
      招将槽位: saved?.招将槽位 ?? null,
      技能: saved?.技能 || null,
    })
  }
  return actionList
}

export function fillAutoAttackActions(selfTeam, opponentTeam, oldActionsMap = {}) {
  const selfUnits = (Array.isArray(selfTeam) ? selfTeam : []).filter(
    (u) => u.type === 'unit' && (u.curHp > 0 || String(u.key || '').endsWith(':主将')),
  )
  const enemyUnits = (Array.isArray(opponentTeam) ? opponentTeam : []).filter(
    (eu) => eu.type === 'unit' && eu.curHp > 0,
  )
  const fastestEnemy = [...enemyUnits].sort(
    (a, b) => Number(a.速度排名 || 999) - Number(b.速度排名 || 999),
  )[0] || null
  const nextMap = { ...oldActionsMap }
  for (const u of selfUnits) {
    if (!nextMap[u.key] || !nextMap[u.key].操作) {
      nextMap[u.key] = { 操作: '攻击', 目标: fastestEnemy?.key || null }
    }
  }
  return nextMap
}
