import { ref } from 'vue'
import { POSES, drawStickmanPose, drawStickman } from '@/shared/canvas/stickman'
import { runSkillEffect } from '@/shared/canvas/skillEffects'

export function useBattleAnimation(charCanvases, charInners, charEls) {
  const animating = ref(false)

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function getPositionInfo(pos) {
    const positionMap = {
      '左主将': { side: 'left', idx: 1 },
      '左副将1': { side: 'left', idx: 0 },
      '左副将2': { side: 'left', idx: 2 },
      '左副将3': { side: 'left', idx: 3 },
      '右主将': { side: 'right', idx: 0 },
      '右副将1': { side: 'right', idx: 1 },
      '右副将2': { side: 'right', idx: 2 },
      '右副将3': { side: 'right', idx: 3 },
    }
    const info = positionMap[pos]
    if (!info) return { side: 'left', idx: 0 }
    return info
  }

  function getCharRef(pos) {
    const { side, idx } = getPositionInfo(pos)
    const key = side + '-' + idx
    return charCanvases.get(key)
  }

  function getCharEl(pos) {
    const { side, idx } = getPositionInfo(pos)
    return charEls.get(side + '-' + idx)
  }

  function getCharInner(pos) {
    const { side, idx } = getPositionInfo(pos)
    return charInners.get(side + '-' + idx)
  }

  async function flashWhite(el) {
    el.style.filter = 'brightness(3) saturate(0)'
    await sleep(60)
    el.style.filter = 'brightness(1.5) saturate(0.5)'
    await sleep(40)
    el.style.filter = ''
  }

  function showDamageNumber(pos, damage, attackType) {
    if (Number(damage) <= 0) return
    const inner = getCharInner(pos)
    if (!inner) return

    const numEl = document.createElement('div')
    numEl.className = 'damage-number'
    numEl.textContent = '-' + damage

    if (attackType === '暴击攻击') {
      numEl.classList.add('crit')
    } else if (attackType === '致命攻击') {
      numEl.classList.add('lethal')
    }

    inner.appendChild(numEl)
    setTimeout(() => numEl.remove(), 800)
  }

  async function playEnterAnimation(pos, leftCharacters, rightCharacters) {
    const { side, idx } = getPositionInfo(pos)
    const charArray = side === 'left' ? leftCharacters.value : rightCharacters.value
    const char = charArray[idx]
    if (!char) return

    const inner = getCharInner(pos)
    if (!inner) return

    inner.style.transition = 'none'
    inner.style.opacity = '0'
    inner.style.transform = 'translateX(' + (side === 'left' ? '-60px' : '60px') + ')'

    await nextTick()
    await sleep(30)

    inner.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out'
    inner.style.transform = 'translateX(0)'
    inner.style.opacity = '1'

    await sleep(420)
    inner.style.transition = ''
    inner.style.transform = ''
    inner.style.opacity = ''
  }

  async function playLeaveAnimation(pos, leftCharacters, rightCharacters) {
    const { side, idx } = getPositionInfo(pos)
    const charArray = side === 'left' ? leftCharacters.value : rightCharacters.value
    const char = charArray[idx]
    if (!char) return

    const inner = getCharInner(pos)
    if (!inner) return

    inner.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in, filter 0.3s ease-in'
    inner.style.transform = 'scale(0.92)'
    inner.style.opacity = '0.35'
    inner.style.filter = 'grayscale(1)'

    await sleep(300)
  }

  async function playAttackAnimation(subjectPos, targetPos, isHit, damage, attackType) {
    const subjectInfo = getPositionInfo(subjectPos)
    const subjectEl = getCharEl(subjectPos)
    const targetEl = getCharEl(targetPos)
    const subjectInner = getCharInner(subjectPos)
    const targetInner = getCharInner(targetPos)
    const subjectCanvas = getCharRef(subjectPos)
    if (!subjectEl || !subjectInner || !subjectCanvas) return

    const subjectKey = subjectInfo.side + '-' + subjectInfo.idx
    const attackDir = subjectInfo.side === 'left' ? 1 : -1

    subjectEl.style.zIndex = '10'

    let moveX = attackDir * 80
    let moveY = 0
    if (subjectInner && targetInner) {
      const sRect = subjectInner.getBoundingClientRect()
      const tRect = targetInner.getBoundingClientRect()
      if (attackDir > 0) {
        moveX = tRect.left - sRect.right + 4
      } else {
        moveX = tRect.right - sRect.left - 4
      }
      moveY = (tRect.top + tRect.height / 2) - (sRect.top + sRect.height / 2)
    }

    subjectInner.style.transition = 'transform 0.3s ease-out'
    subjectInner.style.transform = 'translateX(' + (moveX * 0.6) + 'px) translateY(' + (moveY * 0.6) + 'px)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.swingBack)

    await sleep(300)

    subjectInner.style.transition = 'transform 0.08s ease-out'
    subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + moveY + 'px)'

    if (attackType === '普通攻击') {
      drawStickmanPose(subjectCanvas, subjectKey, POSES.poke)
      if (isHit && targetInner) {
        await sleep(40)
        flashWhite(targetInner)
        showDamageNumber(targetPos, damage, attackType)
        targetInner.style.transition = 'transform 0.06s ease-out'
        targetInner.style.transform = 'translateX(' + (-attackDir * 10) + 'px)'
        await sleep(60)
        targetInner.style.transition = 'transform 0.15s ease-in'
        targetInner.style.transform = 'translateX(0)'
        await sleep(150)
        targetInner.style.transition = ''
        targetInner.style.transform = ''
      }
      await sleep(100)
    } else if (attackType === '暴击攻击') {
      subjectInner.style.transition = 'transform 0.2s ease-out'
      subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + moveY + 'px)'
      drawStickmanPose(subjectCanvas, subjectKey, POSES.swingBack)
      await sleep(220)

      subjectInner.style.transition = 'transform 0.15s ease-out'
      subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + (moveY - 12) + 'px)'
      drawStickmanPose(subjectCanvas, subjectKey, POSES.armRaised)
      await sleep(180)

      subjectInner.style.transition = 'transform 0.06s ease-in'
      subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + (moveY - 6) + 'px)'
      drawStickmanPose(subjectCanvas, subjectKey, POSES.swingDown)
      await sleep(60)

      subjectInner.style.transition = 'none'
      subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + (moveY + 4) + 'px)'
      drawStickmanPose(subjectCanvas, subjectKey, POSES.slamDown)
      if (targetInner) {
        await sleep(30)
        flashWhite(targetInner)
        showDamageNumber(targetPos, damage, attackType)
        targetInner.style.transition = 'transform 0.06s ease-out'
        targetInner.style.transform = 'translateX(' + (-attackDir * 22) + 'px)'
        await sleep(80)
        targetInner.style.transition = 'transform 0.2s ease-in'
        targetInner.style.transform = 'translateX(0)'
        await sleep(200)
        targetInner.style.transition = ''
        targetInner.style.transform = ''
      }
      subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + moveY + 'px)'
      await sleep(100)
    } else if (attackType === '致命攻击') {
      drawStickmanPose(subjectCanvas, subjectKey, POSES.thrust)
      if (targetInner) {
        await sleep(20)
        flashWhite(targetInner)
        showDamageNumber(targetPos, damage, attackType)
        targetInner.style.transition = 'transform 0.04s ease-out'
        targetInner.style.transform = 'translateX(' + (-attackDir * 28) + 'px)'
        await sleep(50)
        targetInner.style.transition = 'transform 0.15s ease-in'
        targetInner.style.transform = 'translateX(0)'
        await sleep(150)
        targetInner.style.transition = ''
        targetInner.style.transform = ''
      }
      await sleep(100)
    } else if (attackType === '未命中') {
      drawStickmanPose(subjectCanvas, subjectKey, POSES.poke)
      if (targetInner) {
        await sleep(20)
        targetInner.style.transition = 'transform 0.08s ease-out'
        targetInner.style.transform = 'translateX(' + (attackDir * 24) + 'px)'
        await sleep(120)
        targetInner.style.transition = 'transform 0.2s ease-in'
        targetInner.style.transform = 'translateX(0)'
        await sleep(200)
        targetInner.style.transition = ''
        targetInner.style.transform = ''
      }
      await sleep(100)
    }

    drawStickmanPose(subjectCanvas, subjectKey, POSES.idle)
    subjectInner.style.transition = 'transform 0.25s ease-in'
    subjectInner.style.transform = 'translateX(0) translateY(0)'
    await sleep(260)
    subjectInner.style.transition = ''
    subjectInner.style.transform = ''
    subjectEl.style.zIndex = ''
  }

  const TEAM_SKILLS = new Set(['固若金汤', '凌波微步', '呼风唤雨', '妖火燎原', '巫蛊极毒', '暗渡陈仓'])

  async function runCanvasSkill(action, subjectPos, targetPos, damage) {
    const scene = document.querySelector('.battle-scene')
    const subjectEl = getCharEl(subjectPos)
    let targetEl = getCharEl(targetPos)
    if (!scene || !subjectEl || !targetEl) return

    const isTeamSkill = TEAM_SKILLS.has(action)
    if (isTeamSkill) {
      const targetInfo = getPositionInfo(targetPos)
      const teamClass = targetInfo.side === 'left' ? '.team-left' : '.team-right'
      const teamEl = scene.querySelector(teamClass)
      if (teamEl) targetEl = teamEl
    }

    const subjectInfo = getPositionInfo(subjectPos)
    const subjectInner = getCharInner(subjectPos)
    const targetInner = getCharInner(targetPos)
    const subjectCanvas = getCharRef(subjectPos)
    if (!subjectInner || !subjectCanvas) return

    const subjectKey = subjectInfo.side + '-' + subjectInfo.idx
    subjectEl.style.zIndex = '10'

    subjectInner.style.transition = 'filter 0.2s ease-out'
    subjectInner.style.filter = 'brightness(2.5)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.armRaised)
    await sleep(300)

    subjectInner.style.transition = 'transform 0.12s ease-in, filter 0.12s ease-in'
    subjectInner.style.filter = 'brightness(1.8)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.slamDown)
    await sleep(100)

    await runSkillEffect(scene, action, subjectEl, targetEl)

    if (isTeamSkill && damage > 0) {
      const targetInfo = getPositionInfo(targetPos)
      const side = targetInfo.side
      for (let i = 0; i < 4; i++) {
        const pos = side + '-' + i
        const inner = getCharInner(pos)
        if (inner) {
          flashWhite(inner)
          showDamageNumber(pos, damage, '致命攻击')
          inner.style.transition = 'transform 0.06s ease-out'
          inner.style.transform = 'translateY(6px) scale(0.95)'
          setTimeout(() => {
            inner.style.transition = 'transform 0.2s ease-in'
            inner.style.transform = 'translateY(0) scale(1)'
            setTimeout(() => {
              inner.style.transition = ''
              inner.style.transform = ''
            }, 200)
          }, 80)
        }
      }
      await sleep(280)
    } else if (targetInner && damage > 0) {
      flashWhite(targetInner)
      showDamageNumber(targetPos, damage, '致命攻击')
      targetInner.style.transition = 'transform 0.06s ease-out'
      targetInner.style.transform = 'translateY(6px) scale(0.95)'
      await sleep(80)
      targetInner.style.transition = 'transform 0.2s ease-in'
      targetInner.style.transform = 'translateY(0) scale(1)'
      await sleep(200)
      targetInner.style.transition = ''
      targetInner.style.transform = ''
    }

    await sleep(200)

    drawStickmanPose(subjectCanvas, subjectKey, POSES.idle)
    subjectInner.style.transition = 'transform 0.3s ease-in-out, filter 0.3s ease-in-out'
    subjectInner.style.transform = 'translateY(0)'
    subjectInner.style.filter = ''
    await sleep(320)
    subjectInner.style.transition = ''
    subjectInner.style.transform = ''
    subjectInner.style.filter = ''
    subjectEl.style.zIndex = ''
  }

  function showSkillDarken() {
    const scene = document.querySelector('.battle-scene')
    if (!scene) return null
    const darken = document.createElement('div')
    darken.className = 'skill-darken'
    scene.appendChild(darken)
    return darken
  }

  function showSwordFlash(targetInner, attackDir) {
    if (!targetInner) return
    const flash = document.createElement('div')
    flash.className = 'sword-flash'
    flash.style.setProperty('--dir', attackDir > 0 ? '1' : '-1')
    targetInner.appendChild(flash)
    setTimeout(() => flash.remove(), 500)
  }

  async function playShemingyiji(subjectPos, targetPos, damage) {
    const subjectInfo = getPositionInfo(subjectPos)
    const subjectEl = getCharEl(subjectPos)
    const targetEl = getCharEl(targetPos)
    const subjectInner = getCharInner(subjectPos)
    const targetInner = getCharInner(targetPos)
    const subjectCanvas = getCharRef(subjectPos)
    if (!subjectEl || !subjectInner || !subjectCanvas) return

    const subjectKey = subjectInfo.side + '-' + subjectInfo.idx
    const attackDir = subjectInfo.side === 'left' ? 1 : -1

    subjectEl.style.zIndex = '10'

    subjectInner.style.transition = 'filter 0.15s ease-out'
    subjectInner.style.filter = 'brightness(2.5) drop-shadow(0 0 8px #fff)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.armRaised)
    await sleep(250)

    let moveX = attackDir * 120
    let moveY = 0
    if (subjectInner && targetInner) {
      const sRect = subjectInner.getBoundingClientRect()
      const tRect = targetInner.getBoundingClientRect()
      if (attackDir > 0) {
        moveX = tRect.right - sRect.left + 8
      } else {
        moveX = tRect.left - sRect.right - 8
      }
      moveY = (tRect.top + tRect.height / 2) - (sRect.top + sRect.height / 2)
    }

    subjectInner.style.transition = 'transform 0.12s ease-in, filter 0.12s ease-in'
    subjectInner.style.transform = 'translateX(' + moveX + 'px) translateY(' + moveY + 'px)'
    subjectInner.style.filter = 'brightness(1.2)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.thrust)

    await sleep(60)

    showSwordFlash(targetInner, attackDir)
    showDamageNumber(targetPos, damage, '致命攻击')
    if (targetInner) {
      flashWhite(targetInner)
      targetInner.style.transition = 'transform 0.06s ease-out'
      targetInner.style.transform = 'translateX(' + (-attackDir * 20) + 'px)'
      await sleep(80)
      targetInner.style.transition = 'transform 0.2s ease-in'
      targetInner.style.transform = 'translateX(0)'
      await sleep(200)
      targetInner.style.transition = ''
      targetInner.style.transform = ''
    }

    await sleep(200)

    drawStickmanPose(subjectCanvas, subjectKey, POSES.idle)
    subjectInner.style.transition = 'transform 0.3s ease-in-out, filter 0.3s ease-in-out'
    subjectInner.style.transform = 'translateX(0) translateY(0)'
    subjectInner.style.filter = ''
    await sleep(320)
    subjectInner.style.transition = ''
    subjectInner.style.transform = ''
    subjectInner.style.filter = ''
    subjectEl.style.zIndex = ''
  }

  async function playLipihuaShan(subjectPos, targetPos, damage) {
    await runCanvasSkill('力劈华山', subjectPos, targetPos, damage)
  }

  async function playGuRuoJinTang(subjectPos, targetPos) {
    await runCanvasSkill('固若金汤', subjectPos, targetPos, 0)
  }

  async function playLingBoWeiBu(subjectPos, targetPos) {
    await runCanvasSkill('凌波微步', subjectPos, targetPos, 0)
  }

  async function playHuaDiWeiLao(subjectPos, targetPos) {
    await runCanvasSkill('画地为牢', subjectPos, targetPos, 0)
  }

  async function playChenHuoDaJie(subjectPos, targetPos) {
    await runCanvasSkill('趁火打劫', subjectPos, targetPos, 0)
  }

  async function playSiMianChuGe(subjectPos, targetPos) {
    await runCanvasSkill('四面楚歌', subjectPos, targetPos, 0)
  }

  async function playJinChanTuoQiao(subjectPos, targetPos) {
    await runCanvasSkill('金蝉脱壳', subjectPos, targetPos, 0)
  }

  async function playAnDuChenCang(subjectPos, targetPos) {
    await runCanvasSkill('暗渡陈仓', subjectPos, targetPos, 0)
  }

  async function playHuFengHuanYu(subjectPos, targetPos, damage) {
    await runCanvasSkill('呼风唤雨', subjectPos, targetPos, damage)
  }

  async function playYaoHuoLiaoYuan(subjectPos, targetPos, damage) {
    await runCanvasSkill('妖火燎原', subjectPos, targetPos, damage)
  }

  async function playWuLeiHongDing(subjectPos, targetPos, damage) {
    await runCanvasSkill('五雷轰顶', subjectPos, targetPos, damage)
  }

  async function playWuGuJiDu(subjectPos, targetPos, damage) {
    await runCanvasSkill('巫蛊极毒', subjectPos, targetPos, damage)
  }

  async function playHuiTianMieDi(subjectPos, targetPos, damage) {
    await runCanvasSkill('毁天灭地', subjectPos, targetPos, damage)
  }

  async function playPaiShanDaoHai(subjectPos, targetPos, damage) {
    const subjectInfo = getPositionInfo(subjectPos)
    const subjectEl = getCharEl(subjectPos)
    const subjectInner = getCharInner(subjectPos)
    const targetInner = getCharInner(targetPos)
    const subjectCanvas = getCharRef(subjectPos)
    if (!subjectEl || !subjectInner || !subjectCanvas) return

    const subjectKey = subjectInfo.side + '-' + subjectInfo.idx
    const attackDir = subjectInfo.side === 'left' ? 1 : -1
    subjectEl.style.zIndex = '10'

    subjectInner.style.transition = 'filter 0.2s ease-out'
    subjectInner.style.filter = 'brightness(2.5)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.armRaised)
    await sleep(300)

    subjectInner.style.transition = 'transform 0.12s ease-in, filter 0.12s ease-in'
    subjectInner.style.transform = 'translateX(' + (attackDir * 16) + 'px)'
    subjectInner.style.filter = 'brightness(1.8)'
    drawStickmanPose(subjectCanvas, subjectKey, POSES.thrust)
    await sleep(100)

    const scene = document.querySelector('.battle-scene')
    const targetEl = getCharEl(targetPos)
    if (scene && targetEl) {
      await runSkillEffect(scene, '排山倒海', subjectEl, targetEl)
    }

    if (targetInner && Number(damage) > 0) {
      shakeScreen()
      flashWhite(targetInner)
      showDamageNumber(targetPos, damage, '致命攻击')

      targetInner.style.transition = 'transform 0.06s ease-out'
      targetInner.style.transform = 'translateX(' + (-attackDir * 24) + 'px) translateY(-8px)'
      await sleep(80)
      targetInner.style.transition = 'transform 0.06s ease-out'
      targetInner.style.transform = 'translateX(' + (-attackDir * 14) + 'px) translateY(4px)'
      await sleep(60)
      targetInner.style.transition = 'transform 0.2s ease-in'
      targetInner.style.transform = 'translateX(0) translateY(0)'
      await sleep(200)
      targetInner.style.transition = ''
      targetInner.style.transform = ''
    }

    await sleep(200)

    drawStickmanPose(subjectCanvas, subjectKey, POSES.idle)
    subjectInner.style.transition = 'transform 0.3s ease-in-out, filter 0.3s ease-in-out'
    subjectInner.style.transform = 'translateX(0)'
    subjectInner.style.filter = ''
    await sleep(320)
    subjectInner.style.transition = ''
    subjectInner.style.transform = ''
    subjectInner.style.filter = ''
    subjectEl.style.zIndex = ''
  }

  function shakeScreen() {
    const scene = document.querySelector('.battle-scene')
    if (!scene) return
    scene.style.animation = 'screenShake 0.4s ease-out'
    setTimeout(() => {
      scene.style.animation = ''
    }, 400)
  }

  async function onSkillDemoForAnimation(action, subjectPos, targetPos, damage, battleSpeed) {
    const subjectInfo = getPositionInfo(subjectPos)
    const subjectEl = getCharEl(subjectPos)
    const subjectInner = getCharInner(subjectPos)
    const subjectCanvas = getCharRef(subjectPos)
    if (!subjectEl || !subjectInner || !subjectCanvas) {
      await sleep(battleSpeed === 0 ? 100 : battleSpeed === 1 ? 800 : 400)
      return
    }

    const subjectKey = subjectInfo.side + '-' + subjectInfo.idx

    if (action === '舍命一击') {
      await playShemingyiji(subjectPos, targetPos, damage)
    } else if (action === '力劈华山') {
      await playLipihuaShan(subjectPos, targetPos, damage)
    } else if (action === '排山倒海') {
      await playPaiShanDaoHai(subjectPos, targetPos, damage)
    } else if (action === '固若金汤') {
      await playGuRuoJinTang(subjectPos, targetPos)
    } else if (action === '凌波微步') {
      await playLingBoWeiBu(subjectPos, targetPos)
    } else if (action === '画地为牢') {
      await playHuaDiWeiLao(subjectPos, targetPos)
    } else if (action === '趁火打劫') {
      await playChenHuoDaJie(subjectPos, targetPos)
    } else if (action === '四面楚歌') {
      await playSiMianChuGe(subjectPos, targetPos)
    } else if (action === '金蝉脱壳') {
      await playJinChanTuoQiao(subjectPos, targetPos)
    } else if (action === '暗渡陈仓') {
      await playAnDuChenCang(subjectPos, targetPos)
    } else if (action === '呼风唤雨') {
      await playHuFengHuanYu(subjectPos, targetPos, damage)
    } else if (action === '妖火燎原') {
      await playYaoHuoLiaoYuan(subjectPos, targetPos, damage)
    } else if (action === '五雷轰顶') {
      await playWuLeiHongDing(subjectPos, targetPos, damage)
    } else if (action === '巫蛊极毒') {
      await playWuGuJiDu(subjectPos, targetPos, damage)
    } else if (action === '毁天灭地') {
      await playHuiTianMieDi(subjectPos, targetPos, damage)
    } else if (action === '无双开启') {
      if (subjectInner) {
        subjectInner.style.transition = 'filter 0.3s ease-out'
        subjectInner.style.filter = 'brightness(2) hue-rotate(20deg)'
        await sleep(600)
        subjectInner.style.filter = ''
        subjectInner.style.transition = ''
      }
    } else {
      await sleep(battleSpeed === 0 ? 100 : battleSpeed === 1 ? 800 : 400)
    }
  }

  return {
    animating,
    sleep,
    getPositionInfo,
    getCharRef,
    getCharEl,
    getCharInner,
    flashWhite,
    showDamageNumber,
    playEnterAnimation,
    playLeaveAnimation,
    playAttackAnimation,
    runCanvasSkill,
    showSkillDarken,
    showSwordFlash,
    playShemingyiji,
    playLipihuaShan,
    playGuRuoJinTang,
    playLingBoWeiBu,
    playHuaDiWeiLao,
    playChenHuoDaJie,
    playSiMianChuGe,
    playJinChanTuoQiao,
    playAnDuChenCang,
    playHuFengHuanYu,
    playYaoHuoLiaoYuan,
    playWuLeiHongDing,
    playWuGuJiDu,
    playHuiTianMieDi,
    playPaiShanDaoHai,
    shakeScreen,
    onSkillDemoForAnimation,
  }
}
