import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty + 30
  const frames = 50
  const bubbles = 60

  const bubbleData = []
  for (let b = 0; b < bubbles; b++) {
    bubbleData.push({
      x: (Math.random() - 0.5) * 130,
      y: Math.random() * 30,
      size: 5 + Math.random() * 14,
      speed: 0.5 + Math.random() * 1.2,
      offset: Math.random() * Math.PI * 2,
    })
  }

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.1 ? t / 0.1 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
    ctx.globalAlpha = alpha

    const swampW = 140 * (0.5 + t * 0.5)
    const swampH = 40 * (0.5 + t * 0.5)

    ctx.beginPath()
    ctx.ellipse(cx, cy, swampW, swampH, 0, 0, Math.PI * 2)
    const swampGrad = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy, swampW)
    swampGrad.addColorStop(0, 'rgba(80, 180, 60, 0.7)')
    swampGrad.addColorStop(0.5, 'rgba(60, 140, 40, 0.8)')
    swampGrad.addColorStop(0.8, 'rgba(40, 100, 30, 0.6)')
    swampGrad.addColorStop(1, 'rgba(30, 80, 20, 0.3)')
    ctx.fillStyle = swampGrad
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(cx, cy, swampW, swampH, 0, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(100, 200, 70, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let b = 0; b < bubbles; b++) {
      const bd = bubbleData[b]
      const bx = cx + bd.x + Math.sin(t * Math.PI * 2 + bd.offset) * 8
      const by = cy + bd.y - t * bd.speed * 30
      const bSize = bd.size * (1 - t * 0.3)

      if (by < cy + 10) {
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, bSize)
        grad.addColorStop(0, 'rgba(150, 255, 100, 0.9)')
        grad.addColorStop(0.5, 'rgba(80, 200, 50, 0.7)')
        grad.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.arc(bx, by, bSize, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
