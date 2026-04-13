import { reactive } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

const VERSION_API =
  'http://101.200.57.146:8888/api/latest?packageName=liyufei.huansan'
const DOWNLOAD_URL =
  'http://101.200.57.146:8888/download?packageName=liyufei.huansan'

export const versionGateState = reactive({
  checking: false,
  checked: false,
  locked: false,
  reason: '',
  currentVersionName: '',
  currentVersionCode: '',
  latestVersionName: '',
  latestVersionCode: '',
  downloadUrl: DOWNLOAD_URL,
})

let initPromise = null
let downloadTriggered = false

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function getCurrentAppVersion() {
  const info = await CapApp.getInfo()
  return {
    versionName: info?.version ? String(info.version) : '',
    versionCode: info?.build ? String(info.build) : '',
  }
}

async function getLatestVersion() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const resp = await fetch(VERSION_API, { signal: controller.signal })
    if (!resp.ok) {
      throw new Error(`版本接口失败: HTTP ${resp.status}`)
    }
    const data = await resp.json()
    return {
      versionName: data?.versionName ? String(data.versionName) : '',
      versionCode:
        data?.versionCode === 0 || data?.versionCode
          ? String(data.versionCode)
          : '',
    }
  } finally {
    clearTimeout(timer)
  }
}

function triggerApkDownload() {
  if (typeof window === 'undefined') return
  const link = document.createElement('a')
  link.href = DOWNLOAD_URL
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function lockAppWithUpdate(current, latest) {
  versionGateState.locked = true
  versionGateState.reason = '检测到新版本，当前版本已停止使用，请先更新。'
  versionGateState.currentVersionName = current.versionName
  versionGateState.currentVersionCode = current.versionCode
  versionGateState.latestVersionName = latest.versionName
  versionGateState.latestVersionCode = latest.versionCode

  if (!downloadTriggered) {
    downloadTriggered = true
    triggerApkDownload()
  }
}

export async function initVersionGate() {
  if (!initPromise) {
    initPromise = (async () => {
      versionGateState.checking = true
      try {
        if (!isAndroidNative()) return
        const [current, latest] = await Promise.all([
          getCurrentAppVersion(),
          getLatestVersion(),
        ])
        const codeMismatch =
          current.versionCode &&
          latest.versionCode &&
          current.versionCode !== latest.versionCode
        const nameMismatch =
          !codeMismatch &&
          current.versionName &&
          latest.versionName &&
          current.versionName !== latest.versionName
        if (codeMismatch || nameMismatch) {
          lockAppWithUpdate(current, latest)
        }
      } catch {
        // 版本检查失败时不锁定，避免误伤正常用户。
      } finally {
        versionGateState.checking = false
        versionGateState.checked = true
      }
    })()
  }
  return initPromise
}

export function retryDownloadApk() {
  triggerApkDownload()
}

