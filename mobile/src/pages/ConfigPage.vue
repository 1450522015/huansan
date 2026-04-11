<template>
  <div class="page">
    <h2>配置</h2>
    <div v-if="提示" class="msg" :class="提示类型">{{ 提示 }}</div>

    <div v-if="当前单位 === '主将'" class="card muted-card">
      主将名称与登录用户名相同：<strong>{{ 主将显示名 }}</strong>
    </div>

    <div class="seg">
      <button
        v-for="k in 单位键列表"
        :key="k"
        type="button"
        class="seg-btn"
        :class="{ active: 当前单位 === k }"
        @click="当前单位 = k"
      >
        {{ k }}
      </button>
    </div>

    <div class="card">
      <div class="field">
        <label>角色（含性别）</label>
        <select v-model="当前.角色分类">
          <option v-for="r in 角色分类列表" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
      <div class="row">
        <div class="field grow">
          <label>等级（1–160）</label>
          <input v-model.number="当前.等级" type="number" min="1" max="160" @change="on等级变更" />
        </div>
        <div class="field grow">
          <label>转数</label>
          <select v-model.number="当前.转数">
            <option v-for="z in [0, 1, 2, 3]" :key="z" :value="z" :disabled="z !== 3">{{ z }}转</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>
          属性点（体质+智力+力量+敏捷+空闲={{ 等级总点显示 }}，每项≥{{ 等级显示 }}；可选池={{ 可选点显示 }}）
        </label>
        <div class="row four">
          <div class="mini">
            <span>体质</span>
            <input v-model.number="当前.属性分配.体质" type="number" :min="等级显示" @change="clamp四维" />
          </div>
          <div class="mini">
            <span>智力</span>
            <input v-model.number="当前.属性分配.智力" type="number" :min="等级显示" @change="clamp四维" />
          </div>
          <div class="mini">
            <span>力量</span>
            <input v-model.number="当前.属性分配.力量" type="number" :min="等级显示" @change="clamp四维" />
          </div>
          <div class="mini">
            <span>敏捷</span>
            <input v-model.number="当前.属性分配.敏捷" type="number" :min="等级显示" @change="clamp四维" />
          </div>
        </div>
        <div class="stat-line">
          <span>空闲（未分配可选点）</span>
          <strong>{{ 空闲显示 }}</strong>
        </div>
        <div class="stat-line">
          <span>风格（只读）</span>
          <strong>{{ 风格显示 }}</strong>
        </div>
      </div>
    </div>

    <div v-if="当前单位 === '主将'" class="card">
      <h3>坐骑</h3>
      <div class="field">
        <label>种类</label>
        <select v-model="配置.主将.坐骑.种类">
          <option v-for="m in 坐骑列表" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="row">
        <div class="field grow">
          <label>转数</label>
          <select v-model.number="配置.主将.坐骑.转数">
            <option v-for="z in [0, 1, 2, 3]" :key="'m' + z" :value="z" :disabled="z !== 3">{{ z }}转</option>
          </select>
        </div>
        <div class="field grow">
          <label>等级（1–160）</label>
          <input v-model.number="配置.主将.坐骑.等级" type="number" min="1" max="160" />
        </div>
      </div>
    </div>

    <div v-if="当前单位 === '主将'" class="card">
      <h3>装备（顺序：头盔 → 项饰 → 武器 → 护腕 → 铠甲 → 战靴）</h3>
      <div v-for="部位 in 装备部位列表" :key="部位" class="装备块">
        <h4>{{ 部位 }}</h4>
        <div class="field">
          <label>名称</label>
          <select v-model="配置.主将.装备[部位].名称" @change="on装备名称变更(部位)">
            <option v-for="n in 名称选项(部位)" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <div v-if="需装备词条(部位)" class="field">
          <label>词条</label>
          <select v-model="配置.主将.装备[部位].词条">
            <option v-for="c in 词条选项(部位)" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="gems">
          <div class="gem-title">宝石（每槽最多 3 颗）</div>
          <div v-for="idx in [0, 1, 2]" :key="部位 + 'g' + idx" class="row gem-row">
            <select
              :value="配置.主将.装备[部位].宝石[idx]?.属性 ?? ''"
              @change="setSlotGem(部位, idx, $event.target.value)"
            >
              <option value="">（空）</option>
              <option v-for="o in 主将装备宝石属性" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              class="num"
              type="number"
              min="1"
              max="15"
              :value="配置.主将.装备[部位].宝石[idx]?.数值 ?? 15"
              @input="setSlotGemNum(部位, idx, $event.target.value)"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="当前单位 !== '主将'" class="card">
      <h3>副将宝石（{{ 当前.宝石.length }} / 9）</h3>
      <div v-for="(g, i) in 当前.宝石" :key="i" class="row gem-row">
        <select v-model="g.属性">
          <option v-for="o in 副将宝石属性" :key="o" :value="o">{{ o }}</option>
        </select>
        <input v-model.number="g.数值" class="num" type="number" min="1" max="15" />
        <button class="btn secondary" type="button" @click="当前.宝石.splice(i, 1)">删</button>
      </div>
      <button class="btn secondary" type="button" :disabled="当前.宝石.length >= 9" @click="add副将宝石">添加宝石</button>
    </div>

    <div class="card">
      <h3>天赋（4）· 等级 1–160</h3>
      <p class="talent-hint">选择天赋后显示效果区间说明（与 docs/当前任务.md 一致）。</p>
      <div v-for="(t, i) in 当前.天赋" :key="'tf' + i" class="talent-row">
        <select v-model="t.名称">
          <option :value="null">（空）</option>
          <option v-for="name in 天赋名称列表" :key="name" :value="name">{{ name }}</option>
        </select>
        <input v-model.number="t.等级" class="num" type="number" min="1" max="160" />
        <p v-if="t.名称 && 天赋说明[t.名称]" class="talent-desc">{{ 天赋说明[t.名称] }}</p>
      </div>
    </div>

    <div class="card">
      <h3>技能（4 固定）</h3>
      <p class="talent-hint">{{ 技能等级说明 }}</p>
      <div v-for="(s, i) in 当前.技能" :key="'sk' + i" class="skill-row">
        <div class="skill-name">{{ s.名称 }}</div>
        <label>等级 <input v-model.number="s.等级" type="number" min="1" max="160" /></label>
        <label>熟练度 <input v-model.number="s.熟练度" type="number" min="0" max="999999" /></label>
      </div>
    </div>

    <div class="row actions">
      <button class="btn" type="button" :disabled="saving" @click="save">保存</button>
      <button class="btn secondary" type="button" @click="showJson = true">显示 JSON</button>
      <button class="btn secondary" type="button" @click="openImport = true">导入 JSON</button>
    </div>

    <div v-if="showJson" class="modal" @click.self="showJson = false">
      <div class="modal-body card">
        <div class="row" style="justify-content: space-between">
          <h3 style="margin: 0">当前配置 JSON</h3>
          <button class="btn secondary" type="button" @click="showJson = false">关闭</button>
        </div>
        <pre class="pre">{{ jsonPretty }}</pre>
      </div>
    </div>

    <div v-if="openImport" class="modal" @click.self="openImport = false">
      <div class="modal-body card">
        <h3 style="margin-top: 0">导入 JSON</h3>
        <textarea v-model="importText" placeholder="粘贴完整配置 JSON"></textarea>
        <div class="row">
          <button class="btn" type="button" @click="applyImport">覆盖当前配置</button>
          <button class="btn secondary" type="button" @click="openImport = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { http } from '@/shared/api/http.js'
import {
  getDefaultConfig,
  normalizeConfigDeep,
  装备部位列表,
  主将装备宝石属性,
  副将宝石属性,
  坐骑列表,
  角色分类列表,
  头盔名称列表,
  项饰名称列表,
  武器名称列表,
  护腕名称列表,
  铠甲名称列表,
  战靴名称列表,
  头盔配置,
  天赋名称列表,
  天赋说明,
  技能等级说明,
  等级总点,
  空闲点,
  计算风格,
  修正属性分配,
  默认技能组,
} from '@/shared/config/defaults.js'

const 单位键列表 = ['主将', '副将1', '副将2', '副将3']
const 当前单位 = ref('主将')
const 配置 = reactive(getDefaultConfig())
const saving = ref(false)
const 提示 = ref('')
const 提示类型 = ref('ok')
const showJson = ref(false)
const openImport = ref(false)
const importText = ref('')

const 主将显示名 = computed(() => localStorage.getItem('huansan_用户名') || '（未登录）')

const 当前 = computed({
  get() {
    return 配置[当前单位.value]
  },
  set(v) {
    配置[当前单位.value] = v
  },
})

const 等级显示 = computed(() => Math.min(160, Math.max(1, Number(当前.value.等级) || 1)))

const 等级总点显示 = computed(() => 等级总点(当前.value.等级))
const 空闲显示 = computed(() => 空闲点(当前.value.等级, 当前.value.属性分配))
const 可选点显示 = computed(() => 等级显示.value * 4)
const 风格显示 = computed(() => 计算风格(当前.value.等级, 当前.value.属性分配))

watch(
  () => 当前.value.角色分类,
  (r) => {
    当前.value.技能 = 默认技能组(r)
  }
)

function on等级变更() {
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function clamp四维() {
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function 名称选项(部位) {
  if (部位 === '头盔') return 头盔名称列表
  if (部位 === '项饰') return 项饰名称列表
  if (部位 === '武器') return 武器名称列表
  if (部位 === '护腕') return 护腕名称列表
  if (部位 === '铠甲') return 铠甲名称列表
  return 战靴名称列表
}

function 需装备词条(部位) {
  const 格 = 配置.主将.装备[部位]
  if (部位 === '战靴') return true
  const cfg = 头盔配置[格.名称]
  return !!(cfg && cfg.词条.length > 1)
}

function 词条选项(部位) {
  const 格 = 配置.主将.装备[部位]
  if (部位 === '战靴') return ['速度', '敏捷']
  const cfg = 头盔配置[格.名称]
  return cfg ? cfg.词条 : []
}

function on装备名称变更(部位) {
  const 格 = 配置.主将.装备[部位]
  if (部位 === '战靴') {
    格.词条 = '速度'
    return
  }
  const cfg = 头盔配置[格.名称]
  if (cfg && cfg.词条.length) 格.词条 = cfg.词条[0]
}

function setSlotGem(部位, idx, 属性) {
  const 格 = 配置.主将.装备[部位]
  if (!格.宝石[idx]) 格.宝石[idx] = { 属性: '', 数值: 15 }
  if (!属性) {
    格.宝石[idx] = null
    return
  }
  格.宝石[idx] = { 属性, 数值: 格.宝石[idx]?.数值 ?? 15 }
}

function setSlotGemNum(部位, idx, raw) {
  const 格 = 配置.主将.装备[部位]
  if (!格.宝石[idx]) return
  const n = Math.min(15, Math.max(1, Number(raw) || 15))
  格.宝石[idx].数值 = n
}

function add副将宝石() {
  if (当前.value.宝石.length >= 9) return
  当前.value.宝石.push({ 属性: 副将宝石属性[0], 数值: 15 })
}

const jsonPretty = computed(() => JSON.stringify(配置, null, 2))

async function load() {
  提示.value = ''
  try {
    const { data } = await http.get('/api/config')
    const merged = normalizeConfigDeep(data.配置)
    Object.keys(配置).forEach((k) => delete 配置[k])
    Object.assign(配置, merged)
  } catch (e) {
    提示类型.value = 'error'
    提示.value = e?.response?.data?.错误 || '加载配置失败'
  }
}

function validate() {
  for (const u of 单位键列表) {
    const unit = 配置[u]
    const L = Math.min(160, Math.max(1, Number(unit.等级) || 1))
    const cap = 等级总点(L)
    const a = unit.属性分配
    const sum = (Number(a.体质) || 0) + (Number(a.智力) || 0) + (Number(a.力量) || 0) + (Number(a.敏捷) || 0)
    if (sum > cap) return `${u} 属性点总和超过 ${cap}`
    for (const k of ['体质', '智力', '力量', '敏捷']) {
      if ((Number(a[k]) || 0) < L) return `${u} 的 ${k} 不可低于 ${L}`
    }
  }
  return ''
}

async function save() {
  const err = validate()
  if (err) {
    提示类型.value = 'error'
    提示.value = err
    return
  }
  saving.value = true
  提示.value = ''
  try {
    const body = normalizeConfigDeep(JSON.parse(JSON.stringify(配置)))
    await http.post('/api/config', { 配置: body })
    提示类型.value = 'ok'
    提示.value = '已保存'
  } catch (e) {
    提示类型.value = 'error'
    提示.value = e?.response?.data?.错误 || '保存失败'
  } finally {
    saving.value = false
  }
}

function applyImport() {
  try {
    const obj = JSON.parse(importText.value)
    const merged = normalizeConfigDeep(obj)
    Object.keys(配置).forEach((k) => delete 配置[k])
    Object.assign(配置, merged)
    openImport.value = false
    importText.value = ''
    提示类型.value = 'ok'
    提示.value = '已从 JSON 导入'
  } catch {
    提示类型.value = 'error'
    提示.value = 'JSON 解析失败'
  }
}

onMounted(load)
</script>

<style scoped>
h2,
h3,
h4 {
  margin-top: 0;
}
.muted-card {
  font-size: 14px;
  color: var(--muted);
}
.seg {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.seg-btn {
  border: 1px solid var(--border);
  background: #121a26;
  color: var(--text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
}
.seg-btn.active {
  border-color: var(--accent);
  color: var(--accent);
}
.grow {
  flex: 1;
  min-width: 140px;
}
.four {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.mini span {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}
.stat-line {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 14px;
  color: var(--muted);
}
.装备块 {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.gems {
  margin-top: 10px;
}
.gem-title {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
.gem-row select {
  flex: 1;
}
.gem-row .num {
  width: 72px;
}
.talent-hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 0;
}
.talent-row {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border);
}
.talent-row select {
  width: 100%;
  margin-bottom: 6px;
}
.talent-desc {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 0;
  line-height: 1.4;
}
.skill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
}
.skill-name {
  flex: 1;
  min-width: 120px;
  font-weight: 600;
}
.actions {
  margin-top: 8px;
  margin-bottom: 24px;
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
.pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
}
</style>
