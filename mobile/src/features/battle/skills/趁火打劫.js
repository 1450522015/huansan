import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty - 20
  const frames = 45
  const orbitRadius = 40

  const eyeColors = [
    { inner: 'rgba(255, 80, 80, 1)', mid: 'rgba(200, 0, 0, 0.9)', outer: 'rgba(100, 0, 0, 0.7)' },
    { inner: 'rgba(80, 80, 80, 1)', mid: 'rgba(40, 40, 40, 0.9)', outer: 'rgba(20, 20, 20, 0.7)' },
  ]

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1
    ctx.globalAlpha = alpha

    for (let e = 0; e < 2; e++) {
      const angle = t * Math.PI * 2 + e * Math.PI
      const ex = cx + Math.cos(angle) * orbitRadius
      const ey = cy + Math.sin(angle) * orbitRadius * 0.4
      const ez = Math.sin(angle)
      const scale = 0.6 + (ez + 1) * 0.4
      const colors = eyeColors[e]

      ctx.save()
      ctx.translate(ex, ey)
      ctx.scale(scale, scale)

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 16)
      grad.addColorStop(0, colors.inner)
      grad.addColorStop(0.4, colors.mid)
      grad.addColorStop(0.8, colors.outer)
      grad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      const irisColor = e === 0 ? 'rgba(255, 200, 100, 0.9)' : 'rgba(150, 150, 150, 0.9)'
      ctx.beginPath()
      ctx.ellipse(-4, -3, 5, 4, 0, 0, Math.PI * 2)
      ctx.fillStyle = irisColor
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-4, -3, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-3, -4, 1, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      ctx.beginPath()
      ctx.ellipse(4, -3, 5, 4, 0, 0, Math.PI * 2)
      ctx.fillStyle = irisColor
      ctx.fill()
      ctx.beginPath()
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(5, -4, 1, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      ctx.restore()
    }

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
