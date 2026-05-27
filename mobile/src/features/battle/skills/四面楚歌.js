import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const fx = tx
  const fy = ty - 100
  const frames = 30

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const y = fy + t * 120
    const alpha = i < 5 ? i / 5 : i > 25 ? 1 - (i - 25) / 5 : 1

    ctx.globalAlpha = alpha

    ctx.beginPath()
    ctx.moveTo(fx, y)
    ctx.lineTo(fx, y - 80)
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.95)'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(fx + 2, y - 78)
    ctx.lineTo(fx + 36, y - 66)
    ctx.lineTo(fx + 36, y - 42)
    ctx.lineTo(fx + 2, y - 54)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 50, 50, 0.95)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(fx + 2, y - 54)
    ctx.lineTo(fx + 36, y - 42)
    ctx.lineTo(fx + 30, y - 34)
    ctx.lineTo(fx - 4, y - 46)
    ctx.closePath()
    ctx.fillStyle = 'rgba(200, 30, 30, 0.7)'
    ctx.fill()

    if (i === 20) {
      ctx.beginPath()
      ctx.ellipse(fx, y + 3, 18, 6, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(139, 69, 19, 0.25)'
      ctx.fill()
    }

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
