import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const cx = tx
  const cy = ty - 80
  const frames = 40

  const lightningPaths = []
  for (let l = 0; l < 5; l++) {
    const path = []
    let lx = cx + (Math.random() - 0.5) * 40
    let ly = cy
    path.push({ x: lx, y: ly })
    while (ly < ty + 20) {
      lx += (Math.random() - 0.5) * 30
      ly += 10 + Math.random() * 20
      path.push({ x: lx, y: ly })
    }
    lightningPaths.push(path)
  }

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.05 ? t / 0.05 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
    ctx.globalAlpha = alpha

    if (t > 0.1 && t < 0.6) {
      const flashIntensity = Math.sin((t - 0.1) / 0.5 * Math.PI)
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.15})`
      ctx.fillRect(0, 0, w, h)
    }

    for (let l = 0; l < lightningPaths.length; l++) {
      const path = lightningPaths[l]
      const flicker = Math.random() > 0.3

      if (flicker) {
        ctx.shadowColor = 'rgba(200, 220, 255, 0.9)'
        ctx.shadowBlur = 20

        ctx.beginPath()
        ctx.moveTo(path[0].x, path[0].y)
        for (let p = 1; p < path.length; p++) {
          const jitterX = (Math.random() - 0.5) * 4
          ctx.lineTo(path[p].x + jitterX, path[p].y)
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(path[0].x, path[0].y)
        for (let p = 1; p < path.length; p++) {
          const jitterX = (Math.random() - 0.5) * 4
          ctx.lineTo(path[p].x + jitterX, path[p].y)
        }
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.7)'
        ctx.lineWidth = 6
        ctx.stroke()

        ctx.shadowBlur = 0
      }
    }

    if (t > 0.15) {
      const impactAlpha = t < 0.3 ? (t - 0.15) / 0.15 : t > 0.5 ? 1 - (t - 0.5) / 0.2 : 1
      const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, 50)
      grad.addColorStop(0, `rgba(255, 255, 255, ${impactAlpha * 0.9})`)
      grad.addColorStop(0.3, `rgba(200, 220, 255, ${impactAlpha * 0.5})`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(tx, ty, 50, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
