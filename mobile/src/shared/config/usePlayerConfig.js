import { reactive, ref, watch } from 'vue'
import { getDefaultConfig, normalizeConfigDeep, validateConfigForSave } from './defaults.js'
import { http } from '@/shared/api/http.js'

/** 与后端同步的完整配置（中文 key） */
export const 配置 = reactive(getDefaultConfig())

export const 配置已认证 = ref(false)
export const configDirty = ref(false)
export const configBanner = ref('')
export const configSaving = ref(false)

/** 服务端最近一次「已认证」的配置快照（JSON），用于主页回退 */
const lastVerifiedConfigJson = ref(null)

let suppressDirty = false

function replaceConfigCore(obj) {
  const m = normalizeConfigDeep(obj)
  Object.keys(配置).forEach((k) => delete 配置[k])
  Object.assign(配置, m)
}

export async function loadPlayerConfig() {
  configBanner.value = ''
  try {
    const { data } = await http.get('/api/config')
    suppressDirty = true
    replaceConfigCore(data.配置)
    配置已认证.value = data.配置已认证 === true
    configDirty.value = false
    if (data.配置已认证 === true) {
      lastVerifiedConfigJson.value = JSON.stringify(
        normalizeConfigDeep(JSON.parse(JSON.stringify(配置)))
      )
    } else {
      lastVerifiedConfigJson.value = null
    }
    queueMicrotask(() => {
      suppressDirty = false
    })
  } catch (e) {
    configBanner.value = e?.response?.data?.错误 || '加载配置失败'
  }
}

export async function savePlayerConfig() {
  const v = validateConfigForSave(配置)
  if (!v.ok) {
    configBanner.value = v.错误
    return { ok: false, 错误: v.错误 }
  }
  configSaving.value = true
  configBanner.value = ''
  try {
    await http.post('/api/config', { 配置: v.配置 })
    suppressDirty = true
    replaceConfigCore(v.配置)
    配置已认证.value = true
    configDirty.value = false
    lastVerifiedConfigJson.value = JSON.stringify(
      normalizeConfigDeep(JSON.parse(JSON.stringify(配置)))
    )
    queueMicrotask(() => {
      suppressDirty = false
    })
    return { ok: true }
  } catch (e) {
    const err = e?.response?.data?.错误 || '保存失败'
    configBanner.value = err
    return { ok: false, 错误: err }
  } finally {
    configSaving.value = false
  }
}

export function applyConfigImport(obj) {
  const merged = normalizeConfigDeep(obj)
  replaceConfigCore(merged)
}

export function exportConfigJsonPretty() {
  return JSON.stringify(normalizeConfigDeep(JSON.parse(JSON.stringify(配置))), null, 2)
}

export function downloadConfigJson() {
  const blob = new Blob([exportConfigJsonPretty()], { type: 'application/json;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'huansan-config.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function resetLocalConfigStore() {
  suppressDirty = true
  lastVerifiedConfigJson.value = null
  replaceConfigCore(getDefaultConfig())
  配置已认证.value = false
  configDirty.value = false
  queueMicrotask(() => {
    suppressDirty = false
  })
}

/** 还原为上次已认证快照；若无则恢复默认配置（未保存前仅本地） */
export function revertToVerifiedOrDefault() {
  configBanner.value = ''
  suppressDirty = true
  const had = !!lastVerifiedConfigJson.value
  if (had) {
    replaceConfigCore(JSON.parse(lastVerifiedConfigJson.value))
    configDirty.value = false
  } else {
    replaceConfigCore(getDefaultConfig())
    configDirty.value = true
  }
  queueMicrotask(() => {
    suppressDirty = false
  })
  return { hadSnapshot: had }
}

watch(
  配置,
  () => {
    if (suppressDirty) return
    configDirty.value = true
  },
  { deep: true }
)
