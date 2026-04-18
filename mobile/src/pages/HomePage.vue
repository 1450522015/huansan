<template>
  <div class="page home">
    <div class="home-toolbar">
      <span class="auth-tag" :class="认证样式">{{ 认证文案 }}</span>
      <div class="home-actions">
        <button class="btn" type="button" :disabled="configSaving" @click="onSave">保存</button>
        <button class="btn secondary" type="button" @click="onRevert">回退</button>
      </div>
    </div>
    <div v-if="configBanner" class="msg banner-msg" :class="bannerTone">{{ configBanner }}</div>

    <div class="card block">
      <table class="tbl">
        <tbody>
          <tr>
            <td>
              <a href="#" class="link-name" @click.prevent="go主将">{{ 主将名 }}</a>
            </td>
            <td>{{ 主将等级文案 }}</td>
            <td>{{ 主将职业串 }}</td>
            <td>{{ 主将风格 }}</td>
          </tr>
          <tr class="sub-row">
            <td colspan="2">{{ 主将坐骑线 }}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card block">
      <table class="tbl deputy-tbl">
        <tbody
          ref="deputyTbodyRef"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <tr v-for="(row, idx) in 副将行" :key="row.i" :data-index="idx" :class="{ 'drag-row': dragSrcIndex === idx }">
            <td>
              <a href="#" class="link-name" @click.prevent="go副将(row.i)">{{ row.名 }}</a>
            </td>
            <td>{{ row.等级文案 }}</td>
            <td>{{ row.职业四 }}</td>
            <td>{{ row.风格 }}</td>
            <td>
              <a
                v-if="row.已战"
                href="#"
                class="link-name"
                @click.prevent="on状态(row.i, false)"
              >已战</a>
              <a
                v-else
                href="#"
                class="link-name"
                @click.prevent="on状态(row.i, true)"
              >已休</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { 计算风格, 副将槽设为已战, 副将槽设为已休, format副将显示名 } from '@/shared/config/defaults.js'
import {
  配置,
  配置已认证,
  configDirty,
  configBanner,
  configSaving,
  savePlayerConfig,
  revertToVerifiedOrDefault,
} from '@/shared/config/usePlayerConfig.js'

const router = useRouter()

const 主将名 = computed(() => {
  try {
    return localStorage.getItem('huansan_用户名') || '（未登录）'
  } catch {
    return '（未登录）'
  }
})

const 主将等级文案 = computed(() => {
  const z = 配置.主将?.转数 ?? 0
  const lv = 配置.主将?.等级 ?? 1
  return `${z}转${lv}级`
})

/** 第二行：坐骑名 + 坐骑的转数/等级，如「战马-3转160级」 */
const 主将坐骑线 = computed(() => {
  const m = 配置.主将?.坐骑
  const kind = String(m?.种类 ?? '').trim()
  if (!kind || kind === '无') return '无'
  const z = m?.转数 ?? 0
  const lv = m?.等级 ?? 1
  return `${kind}-${z}转${lv}级`
})

const 主将职业串 = computed(() => (配置.主将?.职业经历 || []).join('-'))

const 主将风格 = computed(() =>
  计算风格(配置.主将?.等级 ?? 1, 配置.主将?.属性分配 || {})
)

function 职业四缩(经历) {
  if (!Array.isArray(经历)) return '————'
  return 经历
    .map((c) => {
      const s = String(c)
      if (s.endsWith('武')) return '武'
      if (s.endsWith('文')) return '文'
      return '异'
    })
    .join('')
}

const 副将行 = computed(() => {
  const list = 配置.副将列表 || []
  const rawOrder = Array.isArray(配置.副将上阵顺序) ? [...配置.副将上阵顺序] : []
  const 战序 = [...new Set(rawOrder.map((x) => Math.trunc(Number(x))))].filter(
    (i) => i >= 0 && i < list.length && list[i]?.状态 === '战'
  )
  for (let i = 0; i < list.length; i++) {
    if (list[i]?.状态 === '战' && !战序.includes(i)) 战序.push(i)
  }
  if (战序.length > 3) 战序.splice(3)
  const 休序 = []
  for (let i = 0; i < list.length; i++) {
    if (!战序.includes(i)) 休序.push(i)
  }
  const sortedIndices = [...战序, ...休序]
  return sortedIndices.map((i) => {
    const s = list[i]
    const 已战 = s?.状态 === '战'
    return {
      i,
      名: s?.已配置 && s?.人物 ? format副将显示名(s.人物, s?.真) : '无',
      等级文案: `${s?.转数 ?? 0}转${s?.等级 ?? 1}级`,
      职业四: 职业四缩(s?.职业经历),
      风格: 计算风格(s?.等级 ?? 1, s?.属性分配 || {}),
      已战,
    }
  })
})

function on状态(i, 要战) {
  if (!要战) {
    副将槽设为已休(配置, i)
    return
  }
  const r = 副将槽设为已战(配置, i)
  if (!r.ok) {
    configBanner.value = r.错误 === '未配置人物' ? '未配置人物，无法设为已战' : r.错误 || '操作失败'
  }
}

/** 拖拽排序 */
const deputyTbodyRef = ref(null)
let dragSrcIndex = -1
let dragGhost = null
let longPressTimer = null

function reorderArray(from, to) {
  if (from === to) return
  const list = 配置.副将列表 || []
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return
  const item = list.splice(from, 1)[0]
  list.splice(to, 0, item)
  configDirty.value = true
}

function onTouchStart(e) {
  const tr = e.target.closest('tr')
  if (!tr || deputyTbodyRef.value !== tr.parentElement) return
  const idx = Number(tr.dataset.index)
  if (Number.isNaN(idx)) return
  longPressTimer = setTimeout(() => {
    dragSrcIndex = idx
    const row = tr
    dragGhost = row.cloneNode(true)
    dragGhost.style.position = 'fixed'
    dragGhost.style.zIndex = '1000'
    dragGhost.style.opacity = '0.85'
    dragGhost.style.pointerEvents = 'none'
    dragGhost.style.width = row.offsetWidth + 'px'
    dragGhost.style.transform = 'scale(1.03)'
    dragGhost.style.background = '#1e293b'
    document.body.appendChild(dragGhost)
    row.style.opacity = '0.3'
    row.dataset.dragging = '1'
    positionDragGhost(e.touches[0].clientX, e.touches[0].clientY)
    if (navigator.vibrate) navigator.vibrate(30)
  }, 250)
}

function onTouchMove(e) {
  if (dragSrcIndex < 0 || !dragGhost) return
  e.preventDefault()
  const t = e.touches[0]
  positionDragGhost(t.clientX, t.clientY)
  const el = document.elementFromPoint(t.clientX, t.clientY)
  const targetTr = el?.closest('tr[data-index]')
  if (targetTr && deputyTbodyRef.value === targetTr.parentElement) {
    const targetIdx = Number(targetTr.dataset.index)
    if (targetIdx !== dragSrcIndex) {
      const srcTr = deputyTbodyRef.value.querySelector(`tr[data-index="${dragSrcIndex}"]`)
      if (srcTr) srcTr.style.opacity = '0.3'
      targetTr.style.opacity = '1'
    }
  }
}

function onTouchEnd(e) {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  if (dragSrcIndex < 0 || !dragGhost) return
  const t = e.changedTouches[0]
  if (dragGhost) {
    document.body.removeChild(dragGhost)
    dragGhost = null
  }
  const el = document.elementFromPoint(t.clientX, t.clientY)
  const targetTr = el?.closest('tr[data-index]')
  if (targetTr && deputyTbodyRef.value === targetTr.parentElement) {
    const targetIdx = Number(targetTr.dataset.index)
    if (targetIdx !== dragSrcIndex && !Number.isNaN(targetIdx)) {
      const srcOriginalIdx = 副将行.value[dragSrcIndex].i
      const tgtOriginalIdx = 副将行.value[targetIdx].i
      reorderArray(srcOriginalIdx, tgtOriginalIdx)
    }
  }
  const allTrs = deputyTbodyRef.value?.querySelectorAll('tr[data-index]')
  allTrs?.forEach((t) => {
    t.style.opacity = '1'
    delete t.dataset.dragging
  })
  dragSrcIndex = -1
}

function positionDragGhost(x, y) {
  if (!dragGhost) return
  dragGhost.style.left = x - 10 + 'px'
  dragGhost.style.top = y - 20 + 'px'
}

const 认证文案 = computed(() => {
  if (配置已认证.value && !configDirty.value) return '已保存'
  return '未保存'
})

const 认证样式 = computed(() => (认证文案.value === '已保存' ? 'ok' : 'warn'))

const bannerTone = computed(() => (configBanner.value && configBanner.value.includes('失败') ? 'error' : 'ok'))

async function onSave() {
  const r = await savePlayerConfig()
  if (r.ok) configBanner.value = '已保存并通过校验'
}

function onRevert() {
  const { hadSnapshot } = revertToVerifiedOrDefault()
  configBanner.value = hadSnapshot ? '已回退到上次保存配置' : '无已保存快照，已回退为默认初始配置'
}

function go主将() {
  router.push({ name: 'config-main' })
}

function go副将(i) {
  router.push({ name: 'config-deputy', query: { slot: String(i) } })
}
</script>

<style scoped>
.home-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.auth-tag {
  font-size: 14px;
  font-weight: 600;
}
.auth-tag.ok {
  color: var(--accent, #6ee7b7);
}
.auth-tag.warn {
  color: #fbbf24;
}
.banner-msg {
  margin-bottom: 10px;
}
.block {
  margin-bottom: 12px;
  overflow-x: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl td {
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--border, #2a3544);
}
.sub-row td {
  color: var(--muted, #8b9bb4);
}
.deputy-tbl td:nth-child(5) {
  white-space: nowrap;
}
.drag-row {
  opacity: 0.3;
}
.link-name {
  color: #60a5fa;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}
.imp-ta {
  width: 100%;
  min-height: 140px;
  margin-bottom: 10px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
}
.modal-body {
  width: min(720px, 100%);
  max-height: 85vh;
  overflow: auto;
}
</style>
