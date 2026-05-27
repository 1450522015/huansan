import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty + 40
  const frames = 50
  const particles = 30
  const particleData = []

  for (let p = 0; p < particles; p++) {
    particleData.push({
      angle: (p / particles) * Math.PI * 2 + Math.random() * 0.5,
      radius: 15 + Math.random() * 20,
      speed: 1.5 + Math.random() * 2,
      offset: Math.random() * Math.PI * 2,
    })
  }

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1
    ctx.globalAlpha = alpha

    for (let p = 0; p < particles; p++) {
      const pd = particleData[p]
      const spiralT = t * pd.speed
      const px = cx + Math.cos(pd.angle + spiralT * Math.PI * 2) * pd.radius * (1 - t * 0.3)
      const py = cy - spiralT * 100 + Math.sin(pd.offset + spiralT * Math.PI * 4) * 10
      const size = 4 * (1 - t * 0.5)

      if (py < cy - 10) {
        const grad = ctx.createRadialGradient(px, py, 0, px, py, size * 2)
        grad.addColorStop(0, 'rgba(150, 230, 255, 1)')
        grad.addColorStop(0.5, 'rgba(0, 180, 255, 0.8)')
        grad.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.arc(px, py, size * 2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }

    ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let ring = 0; ring < 3; ring++) {
      const ringR = 20 + ring * 12
      const ringY = cy - t * 80 - ring * 15
      ctx.ellipse(cx, ringY, ringR * (1 - t * 0.2), ringR * 0.3, 0, 0, Math.PI * 2)
    }
    ctx.stroke()

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
