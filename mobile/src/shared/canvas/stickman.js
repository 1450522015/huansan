export const POSES = {
  idle:      { bodyY: 0,  rot: 0,  fhx: 10, fhy: 8,  bhx: -8, bhy: 10, wtx: 18, wty: -4 },
  swingBack: { bodyY: 0,  rot: -3, fhx: -6, fhy: -10, bhx: -10, bhy: 4,  wtx: 6,  wty: -12 },
  poke:      { bodyY: 0,  rot: 2,  fhx: 20, fhy: 2,  bhx: -6,  bhy: 6,  wtx: 16, wty: -2 },
  armRaised: { bodyY: -6, rot: -3, fhx: 0,  fhy: -22, bhx: -6, bhy: -8, wtx: 2,  wty: -18 },
  swingDown: { bodyY: -2, rot: 1,  fhx: 8,  fhy: -8,  bhx: -6, bhy: 2,  wtx: 14, wty: 12 },
  slamDown:  { bodyY: 4,  rot: 4,  fhx: 14, fhy: 6,  bhx: -6,  bhy: 4,  wtx: 4,  wty: 24 },
  thrust:    { bodyY: 0,  rot: 4,  fhx: 22, fhy: -2, bhx: -4,  bhy: 4,  wtx: 22, wty: 0 },
  swingSlash:{ bodyY: -2, rot: -6, fhx: 18, fhy: -6, bhx: -8,  bhy: 8,  wtx: 28, wty: 4 },
}

const breathTimers = new Map()

export function drawStickmanPose(canvas, key, pose, breathOffset) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const isLeft = key.startsWith('left')
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const dir = isLeft ? 1 : -1

  ctx.clearRect(0, 0, w, h)

  const p = pose || POSES.idle
  const bo = breathOffset || 0
  const bodyY = (p.bodyY || 0) + bo
  const rot = ((p.rot || 0) + bo * 0.3) * Math.PI / 180

  const headR = 14
  const headY = 17 + bodyY
  const neckY = headY + headR
  const shoulderY = neckY + 3
  const shoulderW = 9
  const hipY = 46 + bodyY
  const footY = 58

  const frontShoulderX = cx + dir * shoulderW
  const backShoulderX = cx - dir * shoulderW

  ctx.save()
  ctx.translate(cx, hipY)
  ctx.rotate(rot)
  ctx.translate(-cx, -hipY)

  // 0. Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(cx, footY + 3, 16, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // 1. Back arm
  const bhx = p.bhx !== undefined ? p.bhx : -8
  const bhy = p.bhy !== undefined ? p.bhy : 10
  const backHandX = backShoulderX + dir * bhx
  const backHandY = shoulderY + bhy

  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 4.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(backShoulderX, shoulderY)
  ctx.lineTo(backHandX, backHandY)
  ctx.stroke()

  ctx.fillStyle = '#fbd38d'
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(backHandX, backHandY, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 2. Legs
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(cx - 5, hipY)
  ctx.lineTo(cx - 9, footY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx + 5, hipY)
  ctx.lineTo(cx + 9, footY)
  ctx.stroke()

  ctx.fillStyle = '#5a4a3a'
  ctx.strokeStyle = '#3d3228'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(cx - 9, footY + 1, 5, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx + 9, footY + 1, 5, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 3. Body (trapezoid)
  const breathScale = 1 + bo * 0.025
  ctx.fillStyle = '#5a7fa5'
  ctx.strokeStyle = '#3d5a80'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(cx - 9 * breathScale, neckY)
  ctx.lineTo(cx + 9 * breathScale, neckY)
  ctx.lineTo(cx + 6, hipY)
  ctx.lineTo(cx - 6, hipY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 4. Front arm
  const fhx = p.fhx !== undefined ? p.fhx : 10
  const fhy = p.fhy !== undefined ? p.fhy : 8
  const frontHandX = frontShoulderX + dir * fhx
  const frontHandY = shoulderY + fhy

  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 4.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(frontShoulderX, shoulderY)
  ctx.lineTo(frontHandX, frontHandY)
  ctx.stroke()

  ctx.fillStyle = '#fbd38d'
  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(frontHandX, frontHandY, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 5. Weapon
  const wtx = p.wtx !== undefined ? p.wtx : 18
  const wty = p.wty !== undefined ? p.wty : -4
  const tipX = frontHandX + dir * wtx
  const tipY = frontHandY + wty

  ctx.strokeStyle = '#8b6914'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(frontHandX - dir * 5, frontHandY + 3)
  ctx.lineTo(frontHandX + dir * 5, frontHandY - 3)
  ctx.stroke()

  ctx.fillStyle = '#c9a84c'
  ctx.beginPath()
  ctx.arc(frontHandX, frontHandY - 1, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#9aabb8'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(frontHandX + dir * 5, frontHandY - 3)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()

  ctx.strokeStyle = '#c8dae8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(frontHandX + dir * 7, frontHandY - 2)
  ctx.lineTo(tipX - dir * 2, tipY + 1)
  ctx.stroke()

  ctx.fillStyle = '#d0e0f0'
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - dir * 3, tipY - 2)
  ctx.lineTo(tipX - dir * 2, tipY + 2)
  ctx.closePath()
  ctx.fill()

  // 6. Head
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#1a202c'
  ctx.beginPath()
  ctx.arc(cx - 4 + dir * 1.5, headY - 1, 1.8, 0, Math.PI * 2)
  ctx.arc(cx + 4 + dir * 1.5, headY - 1, 1.8, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#4a5568'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(cx + dir * 2, headY + 4, 2.5, 0.1, Math.PI - 0.1)
  ctx.stroke()

  ctx.restore()
}

export function drawStickman(canvas, key, breathOffset) {
  drawStickmanPose(canvas, key, POSES.idle, breathOffset)
}

export function startBreathing(canvasMap) {
  const startTime = Date.now()
  const speed = 0.006
  const amplitude = 2.5

  function tick() {
    const t = (Date.now() - startTime) * speed
    const breathOffset = Math.sin(t) * amplitude

    canvasMap.forEach((canvas, key) => {
      drawStickman(canvas, key, breathOffset)
    })

    const timerId = requestAnimationFrame(tick)
    breathTimers.set('main', timerId)
  }

  tick()
}

export function stopBreathing() {
  const timerId = breathTimers.get('main')
  if (timerId) {
    cancelAnimationFrame(timerId)
    breathTimers.delete('main')
  }
}
