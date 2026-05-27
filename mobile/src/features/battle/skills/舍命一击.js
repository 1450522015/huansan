export async function execute(params) {
  const { subjectPos, targetPos, damage, dom, timer } = params
  const { getCharEl, getCharInner, getCharRef } = dom
  const { sleep } = timer

  const subjectEl = getCharEl(subjectPos)
  const targetEl = getCharEl(targetPos)
  const subjectInner = getCharInner(subjectPos)
  const targetInner = getCharInner(targetPos)
  const subjectCanvas = getCharRef(subjectPos)

  if (!subjectEl || !subjectInner || !subjectCanvas) return

  subjectEl.style.zIndex = '10'

  subjectInner.style.transition = 'filter 0.15s ease-out'
  subjectInner.style.filter = 'brightness(2.5) drop-shadow(0 0 8px #fff)'

  await sleep(200)

  subjectInner.style.transition = 'transform 0.2s ease-in'
  subjectInner.style.transform = 'translateY(0)'
  subjectInner.style.filter = ''

  await sleep(200)
  subjectEl.style.zIndex = ''
  subjectInner.style.transition = ''
  subjectInner.style.transform = ''
  subjectInner.style.filter = ''
}
