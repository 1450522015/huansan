import { drawEffect as drawLiPiHuaShan } from '@/features/battle/skills/力劈华山.js'
import { drawEffect as drawPaiShanDaoHai } from '@/features/battle/skills/排山倒海.js'
import { drawEffect as drawGuRuoJinTang } from '@/features/battle/skills/固若金汤.js'
import { drawEffect as drawLingBoWeiBu } from '@/features/battle/skills/凌波微步.js'
import { drawEffect as drawHuaDiWeiLao } from '@/features/battle/skills/画地为牢.js'
import { drawEffect as drawChenHuoDaJie } from '@/features/battle/skills/趁火打劫.js'
import { drawEffect as drawSiMianChuGe } from '@/features/battle/skills/四面楚歌.js'
import { drawEffect as drawJinChanTuoQiao } from '@/features/battle/skills/金蝉脱壳.js'
import { drawEffect as drawAnDuChenCang } from '@/features/battle/skills/暗渡陈仓.js'
import { drawEffect as drawHuFengHuanYu } from '@/features/battle/skills/呼风唤雨.js'
import { drawEffect as drawYaoHuoLiaoYuan } from '@/features/battle/skills/妖火燎原.js'
import { drawEffect as drawWuLeiHongDing } from '@/features/battle/skills/五雷轰顶.js'
import { drawEffect as drawWuGuJiDu } from '@/features/battle/skills/巫蛊极毒.js'
import { drawEffect as drawHuiTianMieDi } from '@/features/battle/skills/毁天灭地.js'

const EFFECTS = {
  '力劈华山': drawLiPiHuaShan,
  '排山倒海': drawPaiShanDaoHai,
  '固若金汤': drawGuRuoJinTang,
  '凌波微步': drawLingBoWeiBu,
  '画地为牢': drawHuaDiWeiLao,
  '趁火打劫': drawChenHuoDaJie,
  '四面楚歌': drawSiMianChuGe,
  '金蝉脱壳': drawJinChanTuoQiao,
  '暗渡陈仓': drawAnDuChenCang,
  '呼风唤雨': drawHuFengHuanYu,
  '妖火燎原': drawYaoHuoLiaoYuan,
  '五雷轰顶': drawWuLeiHongDing,
  '巫蛊极毒': drawWuGuJiDu,
  '毁天灭地': drawHuiTianMieDi,
}

export async function runSkillEffect(scene, type, subjectEl, targetEl, options = {}) {
  const canvas = document.createElement('canvas')
  canvas.className = 'skill-effect-canvas'
  canvas.style.cssText = 'display:block;position:fixed;left:0;top:0;pointer-events:none;z-index:9999;'
  document.body.appendChild(canvas)

  let sceneRect = scene.getBoundingClientRect()
  let retryCount = 0
  while ((sceneRect.width === 0 || sceneRect.height === 0) && retryCount < 10) {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    sceneRect = scene.getBoundingClientRect()
    retryCount++
  }

  canvas.width = sceneRect.width
  canvas.height = sceneRect.height
  canvas.style.width = sceneRect.width + 'px'
  canvas.style.height = sceneRect.height + 'px'
  canvas.style.left = sceneRect.left + 'px'
  canvas.style.top = sceneRect.top + 'px'

  const ctx = canvas.getContext('2d')
  const sRect = subjectEl.getBoundingClientRect()
  const tRect = targetEl.getBoundingClientRect()
  const sx = sRect.left + sRect.width / 2 - sceneRect.left
  const sy = sRect.top + sRect.height / 2 - sceneRect.top
  const tx = tRect.left + tRect.width / 2 - sceneRect.left
  const ty = tRect.top + tRect.height / 2 - sceneRect.top

  const effect = EFFECTS[type]
  if (!effect) {
    console.warn('[runSkillEffect] 效果不存在:', type)
    canvas.remove()
    return
  }

  await effect(ctx, canvas.width, canvas.height, sx, sy, tx, ty, options)
  canvas.remove()
}
