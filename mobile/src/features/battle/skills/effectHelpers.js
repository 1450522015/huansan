export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function getTargetSide(tx, w) {
  return tx < w / 2 ? 'left' : 'right'
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t)
}

export function drawImpactFlash(ctx, x, y) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 100)
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  grad.addColorStop(0.2, 'rgba(255, 220, 100, 0.7)')
  grad.addColorStop(0.5, 'rgba(255, 180, 60, 0.3)')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, 100, 0, Math.PI * 2)
  ctx.fill()
}
