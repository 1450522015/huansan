import {easeOutQuad, sleep} from '@/features/battle/skills/effectHelpers.js'

export async function execute() {
}

export async function drawEffect(ctx, w, h, sx, sy, tx, ty) {
    const cx = tx
    const cy = ty

    const frames = 55

    // 锁链圈数量
    const chainRings = 4

    // 每圈链环数
    const linksPerRing = 22

    for (let i = 0; i <= frames; i++) {
        const t = i / frames

        ctx.clearRect(0, 0, w, h)

        ctx.save()

        // 淡入淡出
        const alpha =
            t < 0.12
                ? t / 0.12
                : t > 0.78
                    ? 1 - (t - 0.78) / 0.22
                    : 1

        ctx.globalAlpha = alpha

        for (let ring = 0; ring < chainRings; ring++) {
            // 每圈延迟
            const ringDelay = ring * 0.08

            const ringT = Math.max(
                0,
                Math.min(1, (t - ringDelay) / (1 - ringDelay)),
            )

            // 收缩
            const maxR = 90 - ring * 14
            const minR = 28 - ring * 3

            // 后半段突然勒紧
            const tighten =
                ringT < 0.7
                    ? easeOutQuad(ringT / 0.7)
                    : 0.85 + easeInExpo((ringT - 0.7) / 0.3) * 0.15

            const radius = maxR - (maxR - minR) * tighten

            // 微弱摆动
            const wobble = Math.sin(t * 14 + ring) * 2

            for (let l = 0; l < linksPerRing; l++) {
                const angle =
                    (l / linksPerRing) * Math.PI * 2 +
                    t * 0.12 * (ring % 2 === 0 ? 1 : -1)

                // 椭圆轨迹
                const rx = radius + wobble
                const ry = radius * 0.72 + wobble * 0.5

                const lx = cx + Math.cos(angle) * rx
                const ly = cy + Math.sin(angle) * ry

                // 链环交替旋转（核心）
                const rot =
                    angle +
                    Math.PI / 2 +
                    (l % 2 === 0 ? 0 : Math.PI / 2)

                // 微随机
                const jitterRot = (Math.sin(l * 13.1 + ring * 7 + t * 10)) * 0.08

                ctx.save()

                ctx.translate(lx, ly)
                ctx.rotate(rot + jitterRot)

                // ===== 链环 =====

                // 外环
                ctx.beginPath()
                ctx.lineWidth = 3

                const ringW = 16
                const ringH = 8

                ctx.strokeStyle = 'rgba(150,150,150,0.95)'

                ctx.ellipse(0, 0, ringW / 2, ringH / 2, 0, 0, Math.PI * 2)

                ctx.stroke()

                // 内阴影
                ctx.beginPath()

                ctx.lineWidth = 1.2
                ctx.strokeStyle = 'rgba(70,70,70,0.85)'

                ctx.ellipse(0, 0, ringW / 2 - 2, ringH / 2 - 2, 0, 0, Math.PI * 2)

                ctx.stroke()

                // 金属高光
                ctx.beginPath()

                ctx.strokeStyle = 'rgba(255,255,255,0.35)'
                ctx.lineWidth = 1

                ctx.arc(
                    -2,
                    -1,
                    ringH * 0.35,
                    Math.PI * 1.1,
                    Math.PI * 1.8,
                )

                ctx.stroke()

                ctx.restore()
            }

            // 勒紧瞬间震动
            if (ringT > 0.82) {
                ctx.save()

                ctx.globalAlpha = (ringT - 0.82) * 2

                ctx.strokeStyle = 'rgba(220,220,220,0.25)'
                ctx.lineWidth = 2

                ctx.beginPath()

                ctx.ellipse(
                    cx,
                    cy,
                    radius + 4,
                    radius * 0.72 + 2,
                    0,
                    0,
                    Math.PI * 2,
                )

                ctx.stroke()

                ctx.restore()
            }
        }

        ctx.restore()

        await sleep(16)
    }
}

function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}
