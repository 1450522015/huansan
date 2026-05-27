export function stripMainSuffix(name) {
  return String(name || '').replace(/-主将$/, '')
}

export function extractDisplayName(name) {
  const s = String(name || '')
  const idx = s.lastIndexOf('-')
  return idx >= 0 ? s.slice(idx + 1) : s
}

export function filterUserBattleDisplayLines(lines) {
  if (!Array.isArray(lines)) return []
  return lines.filter((ln) => {
    const s = String(ln || '')
    if (s.includes('因围困无法行动')) return false
    if (s.includes('因扰乱无法行动')) return false
    if (s.includes('因封锁无法行动')) return false
    return true
  })
}

export function buildUserBattleTextLinesFromEvents(events) {
  if (!Array.isArray(events)) return []
  return events.map(e => e.简要文本 || e.横幅显示 || '').filter(Boolean)
}

export function buildUserBattleTextLinePlanFromEvents(events) {
  if (!Array.isArray(events)) return []
  return events.map(e => {
    const text = e.简要文本 || e.横幅显示 || ''
    return text ? [text] : []
  })
}

export function buildUserBattleTextLines(steps) {
  const lines = []
  let i = 0
  while (i < steps.length) {
    const s = steps[i]
    if (!s) {
      i++
      continue
    }
    if (s.type === 'skill-hit' && s.skillName) {
      const skillName = s.skillName
      const actorName = stripMainSuffix(s.actorName)
      const group = [s]
      let j = i + 1
      while (
        j < steps.length &&
        steps[j].type === 'skill-hit' &&
        steps[j].actorKey === s.actorKey &&
        steps[j].skillName === skillName
      ) {
        group.push(steps[j])
        j++
      }
      if (skillName.includes('凌波微步') || skillName.includes('固若金汤')) {
        const targets = group.map(g => extractDisplayName(g.targetName)).join(' ')
        let suffix = ''
        if (group[0].速度提升 != null) {
          suffix = ` 效果=${group[0].buffValue}%`
        } else if (group[0].防御提升 != null) {
          suffix = ` 防御+${group[0].防御提升} 抗物理+${group[0].抗物理提升} 抗法术+${group[0].抗法术提升}`
        }
        lines.push(`${actorName} ${skillName} [${targets}]${suffix}`)
      } else if (
        group[0].控制成功 !== undefined ||
        group[0].控制失败 !== undefined ||
        group[0].原成功率 != null
      ) {
        const targetResults = group
          .map(g => {
            const tName = extractDisplayName(g.targetName)
            const result = g.控制成功 ? '成功' : g.控制失败 ? '失败' : ''
            return result ? `${tName}[${result}]` : tName
          })
          .join(' ')
        const skillDisplay = group[0].skillName
        lines.push(`${actorName} ${skillDisplay} ${targetResults}`)
      } else {
        for (const g of group) {
          const parts = []
          const isHpPct = g.原效果 != null
          if (isHpPct) {
            parts.push(`原效果=${g.原效果}% 实际效果=${g.实际效果}%`)
            if (g.damage != null) parts.push(`-${g.damage}气血`)
            if (g.mpDamage != null && g.mpDamage > 0) parts.push(`-${g.mpDamage}精力`)
          } else {
            if (g.damage != null && !g.防御提升) parts.push(`-${g.damage}气血`)
            if (g.mpDamage != null && g.mpDamage > 0) parts.push(`-${g.mpDamage}精力`)
          }
          if (g.控制成功) parts.push(`控制成功`)
          if (g.控制失败) parts.push(`控制失败`)
          if (g.防御提升 != null) {
            parts.push(`防御+${g.防御提升} 抗物理+${g.抗物理提升} 抗法术+${g.抗法术提升}`)
          } else if (g.buffValue != null && !isHpPct) {
            const val = g.速度提升 != null ? `${g.buffValue}%` : `${g.buffValue}`
            parts.push(`效果=${val}`)
          }
          if (g.气血消耗 != null && g.气血消耗 > 0) parts.push(`气血消耗=${g.气血消耗}`)
          if (g.精力消耗 != null && g.精力消耗 > 0) parts.push(`精力消耗=${g.精力消耗}`)
          const tName = extractDisplayName(g.targetName)
          lines.push(`${actorName} ${g.skillName} ${tName}${parts.length ? ' ' + parts.join(' ') : ''}`)
        }
      }
      i = j
      continue
    }
    switch (s.type) {
      case 'musou-activate':
      case 'musou-activate-batch':
      case 'musou-speed-change':
      case 'musou-end':
      case 'musou-close':
      case 'musou-roll':
      case 'musou-skip':
      case 'control-second-check':
        break
      case 'melee':
        lines.push(
          `${stripMainSuffix(s.actorName)} ${s.attackKind || '攻击'} ${extractDisplayName(s.targetName)} -${s.damage}`,
        )
        break
      case 'shock':
        lines.push(`${stripMainSuffix(s.actorName)} 反震 ${extractDisplayName(s.targetName)} -${s.damage}`)
        break
      case 'counter':
        lines.push(`${stripMainSuffix(s.actorName)} 反击 ${extractDisplayName(s.targetName)} -${s.damage}`)
        break
      case 'summon': {
        const deputy = s.deputyName || s.将名 || '副将'
        lines.push(`${stripMainSuffix(s.actorName)} 招将 ${deputy}`)
        break
      }
      case 'summon-fail':
        break
      case 'item': {
        const itemName = s.itemName || s.物品名 || '物品'
        const rec = s.recover ?? s.恢复量
        lines.push(
          `${stripMainSuffix(s.actorName)} 对 ${extractDisplayName(s.targetName)} 使用 ${itemName} +${rec}`,
        )
        break
      }
      case 'item-use':
        lines.push(
          `${stripMainSuffix(s.actorName)} 对 ${extractDisplayName(s.targetName)} 使用 ${s.物品名} +${s.恢复量}`,
        )
        break
      case 'miss':
        lines.push(
          `${stripMainSuffix(s.actorName)} 攻击未命中 ${extractDisplayName(s.targetName)}`,
        )
        break
      case 'skill-fail':
        break
      case 'buff-block':
        break
      case 'buff-tick':
        if (s.buff === '毒') {
          lines.push(`${stripMainSuffix(s.targetName)} 毒发 -${s.damage}`)
        }
        break
      case 'poison-dmg':
        lines.push(`${extractDisplayName(s.targetName)} 毒发 -${s.damage}`)
        break
      case 'buff-detonate': {
        const dmg = Math.max(0, Math.round(Number(s.damage) || 0))
        lines.push(`${stripMainSuffix(s.targetName || '')} 毁爆落雷 -${dmg}`)
        break
      }
      case 'buff-detonate-splash': {
        const dmg = Math.max(0, Math.round(Number(s.damage) || 0))
        lines.push(`${stripMainSuffix(s.targetName || '')} 毁爆余波 -${dmg}`)
        break
      }
      case 'ruin-explode':
        lines.push(`${extractDisplayName(s.targetName)} 毁天灭地 -${s.雷Damage}`)
        s.溅射?.forEach(jn => lines.push(`${extractDisplayName(jn.目标)} -${jn.伤害}`))
        break
      case 'defend':
        break
      case 'buff-expire-control':
      case 'mount-heal':
        break
    }
    i++
  }
  return lines
}

export function buildUserBattleTextLinePlan(steps) {
  const safe = Array.isArray(steps) ? steps : []
  const plan = safe.map(() => [])
  let prev = []
  let i = 0
  while (i < safe.length) {
    const s = safe[i]
    if (!s) {
      plan[i] = []
      i++
      continue
    }
    if (s.type === 'skill-hit' && s.skillName) {
      const skillName = s.skillName
      const actorKey = s.actorKey
      const group = [s]
      let j = i + 1
      while (
        j < safe.length &&
        safe[j].type === 'skill-hit' &&
        safe[j].actorKey === actorKey &&
        safe[j].skillName === skillName
      ) {
        group.push(safe[j])
        j++
      }
      const next = buildUserBattleTextLines(safe.slice(0, j))
      const added = next.slice(prev.length)
      prev = next
      const anchor = j - 1
      if (added.length) {
        plan[anchor] = (plan[anchor] || []).concat(added)
      }
      for (let t = i; t < j; t++) {
        if (t !== anchor && !plan[t].length) plan[t] = []
      }
      i = j
      continue
    }
    const next = buildUserBattleTextLines(safe.slice(0, i + 1))
    const added = next.slice(prev.length)
    prev = next
    plan[i] = added
    i++
  }
  return plan
}
