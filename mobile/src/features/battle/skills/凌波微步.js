import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty
  const frames = 30

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const scale = t < 0.2 ? t / 0.2 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.globalAlpha = alpha

    ctx.beginPath()
    ctx.arc(0, 0, 60, 0, Math.PI * 2)
    ctx.fillStyle = '#B0D4FF'
    ctx.fill()
    ctx.strokeStyle = '#6495ED'
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, 52, 0, Math.PI * 2)
    ctx.strokeStyle = '#87CEEB'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = '48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1a3a6c'
    ctx.fillText('速', 0, 2)

    ctx.restore()
    await sleep(16)
  }
}
