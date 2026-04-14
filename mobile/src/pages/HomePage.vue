<template>
  <div class="page home">
    <div class="home-toolbar">
      <span class="auth-tag" :class="认证样式">{{ 认证文案 }}</span>
      <div class="home-actions">
        <button class="btn" type="button" :disabled="configSaving" @click="onSave">保存</button>
        <button class="btn secondary" type="button" @click="onRevert">回退</button>
        <button class="btn secondary" type="button" @click="openImp = true">导入</button>
        <button class="btn secondary" type="button" @click="onOpenExport">导出</button>
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
        <tbody>
          <tr v-for="row in 副将行" :key="row.i">
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

    <div v-if="openImp" class="modal" @click.self="openImp = false">
      <div class="modal-body card">
        <h3 style="margin-top: 0">导入</h3>
        <textarea v-model="importText" class="imp-ta" placeholder="粘贴完整配置 JSON"></textarea>
        <div class="row">
          <button class="btn" type="button" @click="onApplyImport">覆盖本地配置</button>
          <button class="btn secondary" type="button" @click="openImp = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="openExp" class="modal" @click.self="openExp = false">
      <div class="modal-body card">
        <h3 style="margin-top: 0">导出</h3>
        <textarea :value="exportText" class="imp-ta" readonly></textarea>
        <div class="row">
          <button class="btn" type="button" @click="onCopyExport">复制</button>
          <button class="btn secondary" type="button" @click="openExp = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { 计算风格, 副将槽设为已战, 副将槽设为已休 } from '@/shared/config/defaults.js'
import {
  配置,
  配置已认证,
  configDirty,
  configBanner,
  configSaving,
  savePlayerConfig,
  applyConfigImport,
  revertToVerifiedOrDefault,
} from '@/shared/config/usePlayerConfig.js'

const router = useRouter()
const openImp = ref(false)
const openExp = ref(false)
const importText = ref('')
const exportText = ref('')

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
      名: s?.已配置 && s?.人物 ? s.人物 : '无',
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

const 认证文案 = computed(() => {
  if (配置已认证.value && !configDirty.value) return '已认证'
  return '未认证'
})

const 认证样式 = computed(() => (认证文案.value === '已认证' ? 'ok' : 'warn'))

const bannerTone = computed(() => (configBanner.value && configBanner.value.includes('失败') ? 'error' : 'ok'))

async function onSave() {
  const r = await savePlayerConfig()
  if (r.ok) configBanner.value = '已保存并通过校验'
}

function onRevert() {
  const { hadSnapshot } = revertToVerifiedOrDefault()
  configBanner.value = hadSnapshot ? '已回退到上次已认证配置' : '无已认证快照，已回退为默认初始配置'
}

function onApplyImport() {
  try {
    const obj = JSON.parse(importText.value)
    applyConfigImport(obj)
    openImp.value = false
    importText.value = ''
    configBanner.value = '已从 JSON 导入（未保存则仍为未认证）'
  } catch {
    configBanner.value = 'JSON 解析失败'
  }
}

function onOpenExport() {
  exportText.value = JSON.stringify(配置, null, 2)
  openExp.value = true
}

async function onCopyExport() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(exportText.value)
      configBanner.value = '已复制导出 JSON'
      return
    }
  } catch {
    // fallback below
  }
  const ta = document.createElement('textarea')
  ta.value = exportText.value
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    document.execCommand('copy')
    configBanner.value = '已复制导出 JSON'
  } catch {
    configBanner.value = '复制失败，请手动复制'
  } finally {
    document.body.removeChild(ta)
  }
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
