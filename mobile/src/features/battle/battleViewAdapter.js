export function swapBattleSideKey(key) {
  if (!key) return key
  if (key.startsWith('self:')) return key.replace(/^self:/, 'enemy:')
  if (key.startsWith('enemy:')) return key.replace(/^enemy:/, 'self:')
  return key
}

export function viewerIsBattleStarter(currentUsername, extra, snapshot) {
  const starter = extra?.发起用户名 || snapshot?.战局?.发起用户名
  return !!(starter && starter === currentUsername)
}

export function serverUnitKeyToViewerKey(serverKey, currentUsername, extra, snapshot) {
  if (!serverKey) return serverKey
  const isStarter = viewerIsBattleStarter(currentUsername, extra, snapshot)
  return isStarter ? serverKey : swapBattleSideKey(serverKey)
}

export function viewerSelfKeyToServerKey(viewerKey, currentUsername, extra, snapshot) {
  if (!viewerKey) return viewerKey
  const isStarter = viewerIsBattleStarter(currentUsername, extra, snapshot)
  return isStarter ? viewerKey : swapBattleSideKey(viewerKey)
}

export function deputyBaseName(显示) {
  let s = String(显示 || '').trim()
  if (!s) return ''
  s = s.replace(/^无双-/, '')
  s = s.replace(/^\(真\)/, '')
  return s
}
