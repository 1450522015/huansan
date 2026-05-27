import { sleep, getTargetSide } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const targetSide = getTargetSide(tx, w)
  const dir = targetSide === 'left' ? -1 : 1
  const frames = 60

  const windLines = []
  for (let l = 0; l < 35; l++) {
    windLines.push({
      offsetY: (Math.random() - 0.5) * 160,
      startOffset: Math.random() * 300,
      length: 40 + Math.random() * 80,
      speed: 1.5 + Math.random() * 2,
      width: 1.5 + Math.random() * 3.5,
    })
  }

  const debris = []
  for (let d = 0; d < 50; d++) {
    debris.push({
      angle: Math.random() * Math.PI * 2,
      radius: 15 + Math.random() * 80,
      offsetY: (Math.random() - 0.5) * 130,
      speed: 0.8 + Math.random() * 1.5,
      size: 3 + Math.random() * 7,
    })
  }

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1
    ctx.globalAlpha = alpha

    const tornadoX = tx - dir * (1 - t) * 280

    for (let l = 0; l < windLines.length; l++) {
      const wl = windLines[l]
      const lineT = (t * wl.speed + wl.startOffset / 200) % 1
      const lineX = tornadoX - dir * wl.startOffset + dir * lineT * wl.length * 3
      const lineY = ty + wl.offsetY + Math.sin(lineT * Math.PI * 2) * 15

      ctx.beginPath()
      ctx.moveTo(lineX, lineY)
      ctx.lineTo(lineX + dir * wl.length, lineY + Math.sin(lineT * Math.PI) * 8)
      ctx.strokeStyle = `rgba(255, 140, 50, ${0.4 * alpha})`
      ctx.lineWidth = wl.width
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    for (let ring = 0; ring < 7; ring++) {
      const ringT = (t * 2 + ring * 0.2) % 1
      const ringX = tornadoX + dir * ringT * 25
      const ringR = 25 + ring * 16 + ringT * 28
      const ringY = ty + (ring - 3) * 22
      const ringAlpha = (1 - ringT) * 0.6

      ctx.strokeStyle = `rgba(255, 120, 30, ${ringAlpha})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(ringX, ringY, ringR, ringR * 0.25, dir * 0.2, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (let d = 0; d < debris.length; d++) {
      const dd = debris[d]
      const spiralT = t * dd.speed
      const px = tornadoX + Math.cos(dd.angle + spiralT * Math.PI * 4) * dd.radius * (0.3 + t * 0.7)
      const py = ty + dd.offsetY + Math.sin(spiralT * Math.PI * 3) * 15
      const size = dd.size * (0.5 + t * 0.5)

      const grad = ctx.createRadialGradient(px, py, 0, px, py, size * 2)
      grad.addColorStop(0, 'rgba(255, 140, 50, 1)')
      grad.addColorStop(0.4, 'rgba(255, 80, 20, 0.8)')
      grad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.arc(px, py, size * 2, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.save()
    ctx.translate(tornadoX, ty)
    for (let s = 0; s < 4; s++) {
      const spiralAngle = t * Math.PI * 6 + s * Math.PI * 2 / 4
      const spiralR = 40 + s * 18
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const r = spiralR * (1 - a / Math.PI / 4)
        const sx2 = Math.cos(spiralAngle + a) * r
        const sy2 = Math.sin(spiralAngle + a) * r * 0.3 + (a / Math.PI) * 40 - 20
        if (a === 0) ctx.moveTo(sx2, sy2)
        else ctx.lineTo(sx2, sy2)
      }
      ctx.strokeStyle = `rgba(255, 160, 60, ${0.6 - s * 0.15})`
      ctx.lineWidth = 3 - s * 0.5
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    ctx.restore()

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
