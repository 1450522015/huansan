import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty - 20
  const frames = 40

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const scale = t < 0.15 ? t / 0.15 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1
    const alpha = t < 0.1 ? t / 0.1 : t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.globalAlpha = alpha

    ctx.beginPath()
    ctx.ellipse(0, 8, 14, 5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(60, 60, 60, 0.3)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, 14, 0, Math.PI * 2)
    ctx.fillStyle = '#3a3a3a'
    ctx.fill()
    ctx.strokeStyle = '#555555'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.strokeStyle = '#444444'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(-1, -14)
    ctx.quadraticCurveTo(-1, -24, 1, -28)
    ctx.quadraticCurveTo(3, -30, 2, -26)
    ctx.strokeStyle = '#6a5a4a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()

    const sparkFlicker = Math.sin(t * Math.PI * 8) > 0
    if (sparkFlicker) {
      ctx.beginPath()
      ctx.arc(1, -28, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#FFD700'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(1, -28, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#FF6600'
      ctx.fill()
    }

    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#888888'
    ctx.fillText('毁', 0, 1)

    ctx.restore()

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
