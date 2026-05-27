import { sleep, getTargetSide } from '@/features/battle/skills/effectHelpers.js'

export async function execute() {}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
  const targetSide = getTargetSide(tx, w)
  const dir = targetSide === 'left' ? -1 : 1
  const frames = 60

  const bodySegments = 25
  const bodyLength = 280

  for (let i = 0; i <= frames; i++) {
    const t = i / frames
    ctx.clearRect(0, 0, w, h)

    const alpha = i < 5 ? i / 5 : i > 48 ? 1 - (i - 48) / 12 : 1
    ctx.globalAlpha = alpha

    const headProgress = Math.min(1, t * 1.8)
    const headX = sx + (tx - sx) * headProgress
    const headY = ty - 20 + Math.sin(t * Math.PI * 2) * 25

    const segs = []
    for (let s = 0; s <= bodySegments; s++) {
      const u = s / bodySegments
      const wave = Math.sin(t * Math.PI * 2.5 - u * Math.PI * 3) * (8 + u * 5)
      const followT = Math.max(0, Math.min(1, headProgress - u * 0.5))
      segs.push({
        x: headX - dir * u * bodyLength * followT,
        y: headY + wave * followT,
        u,
        visible: followT > 0.01
      })
    }

    const segWidth = (u) => {
      if (u < 0.05) return 18 + u * 40
      if (u < 0.15) return 20 - (u - 0.05) * 30
      return Math.max(2, 17 * (1 - (u - 0.15) * 0.8))
    }

    const upper = []
    const lower = []
    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s]
      if (!seg.visible) {
        upper.push(null)
        lower.push(null)
        continue
      }
      const next = segs[Math.min(s + 1, segs.length - 1)]
      const dx = next.x - seg.x
      const dy = next.y - seg.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const sw = segWidth(seg.u)
      upper.push({ x: seg.x - dy / len * sw, y: seg.y + dx / len * sw })
      lower.push({ x: seg.x + dy / len * sw, y: seg.y - dx / len * sw })
    }

    ctx.shadowColor = 'rgba(180, 220, 255, 0.6)'
    ctx.shadowBlur = 20

    ctx.beginPath()
    let started = false
    for (let s = 0; s < upper.length; s++) {
      if (!upper[s]) continue
      if (!started) {
        ctx.moveTo(upper[s].x, upper[s].y)
        started = true
      } else if (s < upper.length - 1 && upper[s + 1]) {
        const mid = {
          x: (upper[s].x + upper[s + 1].x) / 2,
          y: (upper[s].y + upper[s + 1].y) / 2
        }
        ctx.quadraticCurveTo(upper[s].x, upper[s].y, mid.x, mid.y)
      } else {
        ctx.lineTo(upper[s].x, upper[s].y)
      }
    }
    for (let s = lower.length - 1; s >= 0; s--) {
      if (!lower[s]) continue
      if (s < lower.length - 1 && lower[s + 1]) {
        const mid = {
          x: (lower[s].x + lower[s + 1].x) / 2,
          y: (lower[s].y + lower[s + 1].y) / 2
        }
        ctx.quadraticCurveTo(lower[s].x, lower[s].y, mid.x, mid.y)
      } else {
        ctx.lineTo(lower[s].x, lower[s].y)
      }
    }
    ctx.closePath()

    const bodyGrad = ctx.createLinearGradient(headX, headY - 20, headX, headY + 20)
    bodyGrad.addColorStop(0, 'rgba(210, 235, 255, 0.85)')
    bodyGrad.addColorStop(0.2, 'rgba(240, 250, 255, 0.95)')
    bodyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
    bodyGrad.addColorStop(0.8, 'rgba(240, 250, 255, 0.95)')
    bodyGrad.addColorStop(1, 'rgba(210, 235, 255, 0.85)')
    ctx.fillStyle = bodyGrad
    ctx.fill()

    ctx.strokeStyle = 'rgba(180, 220, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.shadowBlur = 0

    for (let s = 3; s < segs.length - 3; s++) {
      const seg = segs[s]
      if (!seg.visible || seg.u < 0.1 || seg.u > 0.85) continue
      if (Math.floor(s / 4) % 2 === 0) {
        const next = segs[s + 1]
        if (!next || !next.visible) continue
        const angle = Math.atan2(next.y - seg.y, next.x - seg.x)
        const sw = segWidth(seg.u)
        const scale = 1 - seg.u * 0.4

        ctx.save()
        ctx.translate(seg.x, seg.y)
        ctx.rotate(angle)

        ctx.beginPath()
        ctx.moveTo(-sw * 0.5, -sw)
        ctx.lineTo(0, -sw - 14 * scale)
        ctx.lineTo(sw * 0.5, -sw)
        ctx.closePath()
        ctx.fillStyle = 'rgba(220, 240, 255, 0.7)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-sw * 0.5, sw)
        ctx.lineTo(0, sw + 14 * scale)
        ctx.lineTo(sw * 0.5, sw)
        ctx.closePath()
        ctx.fillStyle = 'rgba(220, 240, 255, 0.7)'
        ctx.fill()

        ctx.restore()
      }
    }

    for (let s = 2; s < segs.length - 4; s++) {
      const seg = segs[s]
      if (!seg.visible || seg.u < 0.15 || seg.u > 0.75) continue
      if (Math.floor(s / 5) % 2 === 0) {
        const next = segs[s + 1]
        if (!next || !next.visible) continue
        const angle = Math.atan2(next.y - seg.y, next.x - seg.x)
        const sw = segWidth(seg.u)
        const scale = 1 - seg.u * 0.3

        ctx.save()
        ctx.translate(seg.x, seg.y)
        ctx.rotate(angle)

        ctx.beginPath()
        ctx.moveTo(0, sw)
        ctx.quadraticCurveTo(-6 * scale, sw + 20 * scale, -10 * scale, sw + 28 * scale)
        ctx.moveTo(-6 * scale, sw + 20 * scale)
        ctx.quadraticCurveTo(-3 * scale, sw + 22 * scale, 2 * scale, sw + 26 * scale)
        ctx.strokeStyle = 'rgba(230, 245, 255, 0.8)'
        ctx.lineWidth = 2.5 * scale
        ctx.lineCap = 'round'
        ctx.stroke()

        ctx.restore()
      }
    }

    const firstVisible = segs.findIndex(s => s.visible)
    if (firstVisible >= 0 && firstVisible < segs.length - 1) {
      const headSeg = segs[firstVisible]
      const nextSeg = segs[firstVisible + 1]
      if (nextSeg && nextSeg.visible) {
        const headAngle = Math.atan2(nextSeg.y - headSeg.y, nextSeg.x - headSeg.x)

        ctx.save()
        ctx.translate(headSeg.x, headSeg.y)
        ctx.rotate(headAngle)

        ctx.shadowColor = 'rgba(180, 220, 255, 0.8)'
        ctx.shadowBlur = 25

        ctx.beginPath()
        ctx.moveTo(35, 0)
        ctx.quadraticCurveTo(25, -16, 8, -18)
        ctx.quadraticCurveTo(-8, -20, -18, -14)
        ctx.quadraticCurveTo(-28, -8, -35, -2)
        ctx.quadraticCurveTo(-30, 2, -18, 14)
        ctx.quadraticCurveTo(-8, 20, 8, 18)
        ctx.quadraticCurveTo(25, 16, 35, 0)
        ctx.closePath()

        const headGrad = ctx.createRadialGradient(12, 0, 3, 12, 0, 35)
        headGrad.addColorStop(0, '#ffffff')
        headGrad.addColorStop(0.3, 'rgba(230, 245, 255, 0.98)')
        headGrad.addColorStop(0.7, 'rgba(200, 230, 255, 0.92)')
        headGrad.addColorStop(1, 'rgba(170, 210, 255, 0.85)')
        ctx.fillStyle = headGrad
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(15, -10)
        ctx.quadraticCurveTo(22, -18, 28, -16)
        ctx.quadraticCurveTo(24, -14, 15, -8)
        ctx.fillStyle = 'rgba(200, 230, 255, 0.8)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(15, 10)
        ctx.quadraticCurveTo(22, 18, 28, 16)
        ctx.quadraticCurveTo(24, 14, 15, 8)
        ctx.fillStyle = 'rgba(200, 230, 255, 0.8)'
        ctx.fill()

        ctx.shadowBlur = 0

        ctx.beginPath()
        ctx.ellipse(18, -9, 7, 6, 0.1, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(18, -9, 4.5, 4.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 220, 80, 0.95)'
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(19, -9, 2.5, 3.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(20, -10, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()

        ctx.beginPath()
        ctx.ellipse(18, 9, 7, 6, -0.1, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(18, 9, 4.5, 4.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 220, 80, 0.95)'
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(19, 9, 2.5, 3.5, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(20, 8, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()

        ctx.beginPath()
        ctx.ellipse(-5, -14, 10, 8, -0.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(220, 240, 255, 0.9)'
        ctx.fill()

        ctx.beginPath()
        ctx.ellipse(-5, 14, 10, 8, 0.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(220, 240, 255, 0.9)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-15, 5)
        ctx.quadraticCurveTo(-8, 12, 0, 10)
        ctx.quadraticCurveTo(5, 8, 8, 5)
        ctx.lineTo(5, 3)
        ctx.quadraticCurveTo(0, 6, -8, 3)
        ctx.quadraticCurveTo(-12, 1, -15, 5)
        ctx.fillStyle = 'rgba(180, 100, 30, 0.85)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-18, 2)
        ctx.lineTo(-12, 14)
        ctx.lineTo(-6, 8)
        ctx.lineTo(0, 16)
        ctx.lineTo(4, 8)
        ctx.lineTo(8, 12)
        ctx.lineTo(6, 4)
        ctx.fillStyle = 'rgba(255, 240, 220, 0.95)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-22, -18)
        ctx.quadraticCurveTo(-26, -45, -20, -55)
        ctx.quadraticCurveTo(-16, -48, -18, -18)
        ctx.closePath()
        ctx.fillStyle = 'rgba(230, 245, 255, 0.9)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(-10, -18)
        ctx.quadraticCurveTo(-12, -42, -6, -50)
        ctx.quadraticCurveTo(-3, -44, -6, -18)
        ctx.closePath()
        ctx.fillStyle = 'rgba(230, 245, 255, 0.9)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(10, -12)
        ctx.quadraticCurveTo(14, -38, 8, -48)
        ctx.quadraticCurveTo(4, -42, 6, -12)
        ctx.closePath()
        ctx.fillStyle = 'rgba(210, 235, 255, 0.8)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(20, -5)
        ctx.quadraticCurveTo(38, -18, 50, -22)
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.85)'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(20, 0)
        ctx.quadraticCurveTo(38, 2, 52, 0)
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.7)'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(20, 5)
        ctx.quadraticCurveTo(38, 16, 48, 20)
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)'
        ctx.lineWidth = 1.8
        ctx.stroke()

        ctx.restore()
      }
    }

    const lastVisible = segs.reduce((acc, seg, idx) => seg.visible ? idx : acc, -1)
    if (lastVisible >= 2) {
      const tailSeg = segs[lastVisible]
      const prevSeg = segs[lastVisible - 1]
      const tailAngle = Math.atan2(tailSeg.y - prevSeg.y, tailSeg.x - prevSeg.x)

      ctx.save()
      ctx.translate(tailSeg.x, tailSeg.y)
      ctx.rotate(tailAngle)

      ctx.shadowColor = 'rgba(180, 220, 255, 0.5)'
      ctx.shadowBlur = 12

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-dir * 25, -15, -dir * 40, -22)
      ctx.quadraticCurveTo(-dir * 50, -12, -dir * 55, 0)
      ctx.quadraticCurveTo(-dir * 48, 12, -dir * 35, 8)
      ctx.closePath()
      ctx.fillStyle = 'rgba(220, 240, 255, 0.85)'
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(-dir * 40, -22)
      ctx.quadraticCurveTo(-dir * 48, -32, -dir * 52, -38)
      ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.restore()
      ctx.shadowBlur = 0
    }

    ctx.globalAlpha = 1
    await sleep(16)
  }
}
