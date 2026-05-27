import { sleep } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const frames = 55
  const flameCount = 40

  const flameData = []
  for (let f = 0; f < flameCount; f++) {
    flameData.push({
      offsetX: (Math.random() - 0.5) * 120,
      offsetY: (Math.random() - 0.5) * 80,
      height: 60 + Math.random() * 100,
      width: 30 + Math.random() * 50,
      phase: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 3,
    })
  }

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = t < 0.08 ? t / 0.08 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
    ctx.globalAlpha = alpha

    const dx = sx + (tx - sx) * t
    const dy = sy + (ty - sy) * t

    ctx.save()
    ctx.translate(dx, dy)

    ctx.shadowColor = 'rgba(255, 100, 20, 0.8)'
    ctx.shadowBlur = 40

    for (let f = 0; f < flameCount; f++) {
      const fd = flameData[f]
      const flicker = Math.sin(t * fd.speed * Math.PI + fd.phase) * 0.3 + 0.7
      const fh = fd.height * flicker
      const fw = fd.width * flicker
      const fx = fd.offsetX * flicker
      const fy = fd.offsetY - fh * 0.3

      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy - fh * 0.4, fh * 0.6)
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.95)')
      grad.addColorStop(0.2, 'rgba(255, 220, 80, 0.9)')
      grad.addColorStop(0.5, 'rgba(255, 120, 20, 0.7)')
      grad.addColorStop(0.8, 'rgba(200, 40, 10, 0.4)')
      grad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.moveTo(fx, fy + fh * 0.3)
      ctx.quadraticCurveTo(fx - fw, fy, fx - fw * 0.6, fy - fh * 0.4)
      ctx.quadraticCurveTo(fx - fw * 0.2, fy - fh * 0.8, fx, fy - fh)
      ctx.quadraticCurveTo(fx + fw * 0.2, fy - fh * 0.8, fx + fw * 0.6, fy - fh * 0.4)
      ctx.quadraticCurveTo(fx + fw, fy, fx, fy + fh * 0.3)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }

    const coreFlicker = Math.sin(t * Math.PI * 6) * 0.15 + 0.85
    const coreGrad = ctx.createRadialGradient(0, -10, 0, 0, -10, 80 * coreFlicker)
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    coreGrad.addColorStop(0.3, 'rgba(255, 230, 120, 0.9)')
    coreGrad.addColorStop(0.6, 'rgba(255, 150, 30, 0.6)')
    coreGrad.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(0, -10, 80 * coreFlicker, 0, Math.PI * 2)
    ctx.fillStyle = coreGrad
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.restore()

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
