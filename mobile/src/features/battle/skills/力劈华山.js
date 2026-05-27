import { sleep, getTargetSide, easeOutQuad, drawImpactFlash } from './effectHelpers.js'

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const targetSide = getTargetSide(tx, w)
  const bladeW = 70
  const bladeH = 300
  const frontDist = 60
  const pivotX = targetSide === 'left' ? tx + frontDist : tx - frontDist
  const pivotY = ty + 30
  const frames = 30

  const startAngle = 0
  const endAngle = targetSide === 'left' ? -Math.PI * 0.55 : Math.PI * 0.55

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = i < 3 ? i / 3 : i > 24 ? 1 - (i - 24) / 6 : 1
    const glow = 25 + t * 40

    const angle = startAngle + (endAngle - startAngle) * easeOutQuad(t)

    ctx.save()
    ctx.translate(pivotX, pivotY)
    ctx.rotate(angle)
    ctx.globalAlpha = alpha

    ctx.shadowColor = 'rgba(255, 200, 60, 0.9)'
    ctx.shadowBlur = glow

    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(5, 0)
    ctx.lineTo(4, -20)
    ctx.lineTo(-4, -20)
    ctx.closePath()
    ctx.fillStyle = 'rgba(120, 80, 20, 0.95)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-25, -20)
    ctx.lineTo(25, -20)
    ctx.lineTo(22, -28)
    ctx.lineTo(-22, -28)
    ctx.closePath()
    ctx.fillStyle = 'rgba(180, 140, 40, 0.95)'
    ctx.fill()

    const grad = ctx.createLinearGradient(0, -28, 0, -bladeH)
    grad.addColorStop(0, 'rgba(180, 140, 40, 0.95)')
    grad.addColorStop(0.1, 'rgba(220, 190, 80, 0.98)')
    grad.addColorStop(0.25, 'rgba(255, 240, 160, 1)')
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.55, 'rgba(255, 240, 160, 1)')
    grad.addColorStop(0.75, 'rgba(220, 190, 80, 0.98)')
    grad.addColorStop(1, 'rgba(180, 140, 40, 0.95)')

    ctx.beginPath()
    ctx.moveTo(-bladeW / 2, -28)
    ctx.lineTo(bladeW / 2, -28)
    ctx.lineTo(bladeW * 0.4, -40)
    ctx.lineTo(bladeW * 0.25, -bladeH * 0.5)
    ctx.lineTo(0, -bladeH)
    ctx.lineTo(-bladeW * 0.25, -bladeH * 0.5)
    ctx.lineTo(-bladeW * 0.4, -40)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-bladeW * 0.08, -35)
    ctx.lineTo(bladeW * 0.08, -35)
    ctx.lineTo(bladeW * 0.05, -bladeH * 0.4)
    ctx.lineTo(0, -bladeH * 0.9)
    ctx.lineTo(-bladeW * 0.05, -bladeH * 0.4)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fill()

    ctx.strokeStyle = 'rgba(200, 160, 50, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-bladeW * 0.3, -40)
    ctx.lineTo(-bladeW * 0.15, -bladeH * 0.3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bladeW * 0.3, -40)
    ctx.lineTo(bladeW * 0.15, -bladeH * 0.3)
    ctx.stroke()

    ctx.restore()

    if (i >= 18 && i <= 24) {
      drawImpactFlash(ctx, tx, ty)
    }

    await sleep(16)
  }
}
