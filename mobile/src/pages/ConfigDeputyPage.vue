<template>
  <div class="page">
    <header class="config-header">
      <button type="button" class="btn-back" @click="goBack">返回</button>
    </header>
    <div v-if="提示" class="msg" :class="提示类型">{{ 提示 }}</div>

    <div v-if="槽位合法" class="card card-tight">
      <div class="deputy-identity-row">
        <select v-model="当前.头衔" class="id-sel id-sel-title" @change="on副将头衔变更">
          <option v-for="t in 副将头衔列表" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="当前.人物" class="id-sel id-sel-char" @change="on副将人物变更">
          <option value="">无</option>
          <option v-for="n in 副将人物选项(当前.头衔)" :key="n" :value="n">{{ n }}</option>
        </select>
        <select v-model.number="当前.星级" class="id-sel id-sel-star" @change="on副将星级变更">
          <option v-for="s in 副将星级可选" :key="'sx' + s" :value="s">{{ s }}星</option>
        </select>
        <select
          class="id-sel id-sel-真"
          :value="当前.真 === true ? '真' : '无'"
          @change="当前.真 = $event.target.value === '真'"
        >
          <option value="真">真</option>
          <option value="无">无</option>
        </select>
      </div>
      <div class="row main-lvl-career-row deputy-career-in-first">
        <select
          v-for="ci in [0, 1, 2, 3]"
          :key="'ax' + ci"
          class="career-sel-tiny"
          :value="副将轴显示(ci)"
          @change="on副将轴变更(ci, $event.target.value)"
        >
          <option v-for="a in 副将职业轴选项" :key="ci + '-' + a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="deputy-ws-row">
        <label class="ws-lab">无双</label>
        <input
          v-model.number="当前.无双等级"
          class="ctl ctl-d3 ws-inp"
          type="number"
          min="0"
          max="160"
          @blur="on无双等级Blur"
        />
      </div>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <div class="row main-lvl-career-row">
        <select v-model.number="当前.转数" class="ctl ctl-z ctl-z-nolab" @blur="on单位转数Blur">
          <option v-for="z in [0, 1, 2, 3]" :key="z" :value="z" :disabled="z !== 3">{{ z }}转</option>
        </select>
        <div class="lv-suffix-wrap">
          <input
            v-model.number="当前.等级"
            class="lv-suffix-inp"
            type="number"
            min="1"
            max="160"
            inputmode="numeric"
            @blur="on单位等级Blur"
            @change="on等级变更"
          />
          <span class="lv-suffix-txt" aria-hidden="true">级</span>
        </div>
      </div>
      <div class="attrs-one-line">
        <div class="attr-pair">
          <label>体质</label>
          <input
            v-model.number="当前.属性分配.体质"
            class="ctl-d3"
            type="number"
            :min="等级显示"
            :max="单维属性上限"
            @blur="onAttrBlur('体质')"
            @change="clamp四维"
          />
        </div>
        <div class="attr-pair">
          <label>智力</label>
          <input
            v-model.number="当前.属性分配.智力"
            class="ctl-d3"
            type="number"
            :min="等级显示"
            :max="单维属性上限"
            @blur="onAttrBlur('智力')"
            @change="clamp四维"
          />
        </div>
        <div class="attr-pair">
          <label>力量</label>
          <input
            v-model.number="当前.属性分配.力量"
            class="ctl-d3"
            type="number"
            :min="等级显示"
            :max="单维属性上限"
            @blur="onAttrBlur('力量')"
            @change="clamp四维"
          />
        </div>
        <div class="attr-pair">
          <label>敏捷</label>
          <input
            v-model.number="当前.属性分配.敏捷"
            class="ctl-d3"
            type="number"
            :min="等级显示"
            :max="单维属性上限"
            @blur="onAttrBlur('敏捷')"
            @change="clamp四维"
          />
        </div>
      </div>
      <div class="stat-inline">
        <span class="lbl">空闲</span><strong>{{ 空闲显示 }}</strong>
        <span class="gap" />
        <span class="lbl">风格</span><strong>{{ 风格显示 }}</strong>
      </div>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <div class="field-h mutual-field">
        <label class="mutual-lab">默契度</label>
        <input
          v-model.number="当前.默契度"
          class="ctl mutual-num"
          type="number"
          min="0"
          max="500000"
          inputmode="numeric"
          @blur="on默契度Blur"
        />
      </div>
      <div class="mutual-bonus-grid">
        <div v-for="cell in 默契加成格子" :key="cell.k" class="mutual-cell">{{ cell.k }}+{{ cell.v }}</div>
      </div>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <div class="sub-head">
        <h3>宝石</h3>
        <span class="muted-small">{{ 当前.宝石.length }} / 9</span>
      </div>
      <div v-for="(g, i) in 当前.宝石" :key="i" class="field-h gem-deputy">
        <select v-model="g.属性" class="ctl ctl-fit">
          <option v-for="o in 副将宝石属性" :key="o" :value="o">{{ o }}</option>
        </select>
        <input
          v-model.number="g.数值"
          class="deputy-num ctl-d2"
          type="number"
          min="1"
          max="15"
          @blur="on副将宝石数值Blur(g)"
        />
        <button class="btn secondary btn-mini" type="button" @click="当前.宝石.splice(i, 1)">删</button>
      </div>
      <button class="btn secondary btn-mini" type="button" :disabled="当前.宝石.length >= 9" @click="add副将宝石">
        添加
      </button>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <h3>天赋</h3>
      <div v-for="(t, i) in 当前.天赋" :key="'tf' + i" class="field-h talent-line">
        <select
          v-model="t.名称"
          class="ctl ctl-fit"
          :title="t.名称 && 天赋说明[t.名称] ? 天赋说明[t.名称] : ''"
        >
          <option :value="null">（空）</option>
          <option v-for="name in 天赋名称列表" :key="name" :value="name">{{ name }}</option>
        </select>
        <label class="shrink-lab wide-lab">等级</label>
        <input
          v-model.number="t.等级"
          class="tal-lv ctl-d3"
          type="number"
          min="1"
          max="160"
          @blur="on天赋等级Blur(t)"
        />
        <span class="talent-effect">{{ 天赋效果文案(t) }}</span>
      </div>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <h3>技能</h3>
      <div v-for="(s, i) in 当前.技能" :key="'sk' + i" class="skill-row-h">
        <span class="sk-n">{{ s.名称 }}</span>
        <label class="shrink-lab wide-lab">等级</label>
        <select v-model="s.等级" class="sk-tier ctl-fit" @change="on技能档位变更(i)">
          <option v-for="row in 技能等级档位列表" :key="row.档位" :value="row.档位">{{ row.显示 }}</option>
        </select>
        <label class="shrink-lab">熟</label>
        <input
          v-model.number="s.熟练度"
          type="number"
          class="sk-pro ctl-d5"
          @blur="clamp技能熟练(i)"
          @change="clamp技能熟练(i)"
        />
      </div>
    </div>

    <BattleAttrsPanel v-if="槽位合法" :data="副将战斗属性" />

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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BattleAttrsPanel from '@/components/BattleAttrsPanel.vue'
import {
  副将宝石属性,
  副将头衔列表,
  副将人物选项,
  副将星级边界,
  副将职业轴选项,
  副将配置性别,
  副将默契战斗加成,
  职业轴与前缀成分类,
  分类转职业轴,
  天赋名称列表,
  天赋说明,
  天赋百分比,
  空闲点,
  计算风格,
  修正属性分配,
  默认技能组,
  单维属性上限,
  技能等级档位列表,
  技能档位范围,
  clamp熟练度到档位,
  副将槽位总数,
  副将上阵顺序同步,
  computeUnitAttrs,
} from '@/shared/config/defaults.js'
import { 配置, applyConfigImport } from '@/shared/config/usePlayerConfig.js'

const route = useRoute()
const router = useRouter()
const 槽位 = ref(0)
const 提示 = ref('')
const 提示类型 = ref('ok')
const openImport = ref(false)
const importText = ref('')

function goBack() {
  router.push({ name: 'home' })
}

function 解析槽位() {
  const s = route.query.slot
  const i = Math.trunc(Number(s))
  if (!Number.isFinite(i) || i < 0 || i >= 副将槽位总数) return -1
  return i
}

const 槽位合法 = computed(() => 槽位.value >= 0)

const 当前 = computed(() => {
  if (!槽位合法.value) return null
  return 配置.副将列表[槽位.value]
})

const 默契键序 = ['命中率', '暴击率', '反击率', '致命率', '躲避率', '反震率']

const 副将战斗属性 = computed(() => {
  if (!当前.value) return null
  return computeUnitAttrs(当前.value, { 主将: false })
})

const 默契加成格子 = computed(() => {
  if (!当前.value) return []
  const o = 副将默契战斗加成(当前.value.默契度 ?? 0)
  return 默契键序.map((k) => ({ k, v: Math.round(Number(o[k]) || 0) }))
})

const 副将性别前缀 = computed(() => 副将配置性别(当前.value?.人物))

function sync槽位() {
  const i = 解析槽位()
  槽位.value = i
  if (i < 0) {
    router.replace({ name: 'home' })
  }
}

watch(() => route.query.slot, sync槽位)
onMounted(sync槽位)

const 等级显示 = computed(() => Math.min(160, Math.max(1, Number(当前.value?.等级) || 1)))
const 空闲显示 = computed(() => 空闲点(当前.value?.等级, 当前.value?.属性分配))
const 风格显示 = computed(() => 计算风格(当前.value?.等级, 当前.value?.属性分配))

const 副将星级可选 = computed(() => {
  const u = 当前.value
  if (!u) return []
  const b = 副将星级边界(u.头衔)
  const out = []
  for (let s = b.最小; s <= b.最大; s++) out.push(s)
  return out
})

function 天赋效果文案(t) {
  if (!t?.名称) return '—'
  const p = 天赋百分比(t.名称, Number(t.等级) || 1)
  const n = Math.round(p * 100) / 100
  return `+${n}%`
}

function clampInt(raw, lo, hi) {
  const x = Math.trunc(Number(raw))
  if (!Number.isFinite(x)) return lo
  return Math.min(hi, Math.max(lo, x))
}

function on单位等级Blur() {
  if (!当前.value) return
  当前.value.等级 = clampInt(当前.value.等级, 1, 160)
  on等级变更()
}

function on单位转数Blur() {
  if (!当前.value) return
  当前.value.转数 = clampInt(当前.value.转数, 0, 3)
}

function onAttrBlur(key) {
  if (!当前.value) return
  const L = 等级显示.value
  const a = 当前.value.属性分配
  a[key] = clampInt(a[key], L, 单维属性上限)
  clamp四维()
}

function on天赋等级Blur(t) {
  t.等级 = clampInt(t.等级, 1, 160)
}

function on副将宝石数值Blur(g) {
  g.数值 = clampInt(g.数值, 1, 15)
}

function 副将轴显示(i) {
  return 分类转职业轴(当前.value?.职业经历?.[i])
}

function on副将轴变更(i, 轴) {
  if (!当前.value?.职业经历) return
  当前.value.职业经历[i] = 职业轴与前缀成分类(副将性别前缀.value, 轴)
  if (i === 3) on当前世职业变更()
}

function on当前世职业变更() {
  if (!当前.value) return
  const r = 当前.value.职业经历?.[3]
  if (!r) return
  当前.value.技能 = 默认技能组(r)
}

watch(副将性别前缀, (nw, old) => {
  if (!槽位合法.value || !当前.value || old === undefined) return
  if (nw === old) return
  const u = 当前.value
  if (!Array.isArray(u.职业经历)) return
  for (let j = 0; j < 4; j++) {
    const axis = 分类转职业轴(u.职业经历[j])
    u.职业经历[j] = 职业轴与前缀成分类(nw, axis)
  }
})

function on副将头衔变更() {
  const u = 当前.value
  if (!u) return
  const opts = 副将人物选项(u.头衔)
  if (u.人物 && !opts.includes(u.人物)) u.人物 = opts[0] || ''
  const b = 副将星级边界(u.头衔)
  u.星级 = b.默认
}

function on副将星级变更() {
  const u = 当前.value
  if (!u) return
  const b = 副将星级边界(u.头衔)
  let s = Math.trunc(Number(u.星级))
  if (!Number.isFinite(s)) s = b.默认
  u.星级 = Math.min(b.最大, Math.max(b.最小, s))
}

function on无双等级Blur() {
  if (!当前.value) return
  当前.value.无双等级 = clampInt(当前.value.无双等级, 0, 160)
}

function on默契度Blur() {
  if (!当前.value) return
  当前.value.默契度 = clampInt(当前.value.默契度, 0, 500000)
}

function on副将人物变更() {
  const u = 当前.value
  if (!u) return
  const has = !!(u.人物 && String(u.人物).trim())
  u.已配置 = has
  if (!has) {
    u.人物 = ''
    u.状态 = '休'
  }
  副将上阵顺序同步(配置)
}

function on技能档位变更(i) {
  const s = 当前.value?.技能?.[i]
  if (!s) return
  const row = 技能档位范围(s.等级)
  s.熟练度 = row.熟练度最大
}

function clamp技能熟练(i) {
  const s = 当前.value?.技能?.[i]
  if (!s) return
  s.熟练度 = clamp熟练度到档位(s.等级, s.熟练度)
}

function on等级变更() {
  if (!当前.value) return
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function clamp四维() {
  if (!当前.value) return
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function add副将宝石() {
  if (!当前.value || 当前.value.宝石.length >= 9) return
  当前.value.宝石.push({ 属性: 副将宝石属性[0], 数值: 15 })
}

function applyImport() {
  try {
    const obj = JSON.parse(importText.value)
    applyConfigImport(obj)
    openImport.value = false
    importText.value = ''
    提示类型.value = 'ok'
    提示.value = '已从 JSON 导入（请在主页保存并通过校验后认证）'
  } catch {
    提示类型.value = 'error'
    提示.value = 'JSON 解析失败'
  }
}
</script>

<style scoped>
.config-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.btn-back {
  border: 1px solid var(--border);
  background: #121a26;
  color: var(--text);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
}
.btn-back:active {
  opacity: 0.85;
}
.card-tight {
  padding: 10px;
  margin-bottom: 10px;
}
.card-tight h3 {
  margin: 0 0 8px;
  font-size: 15px;
}
.deputy-identity-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.id-sel {
  font-size: 12px;
  padding: 8px 6px;
}
.id-sel-title,
.id-sel-char {
  flex: 0 1 auto;
  width: auto;
  min-width: 3.5rem;
  max-width: min(48vw, 16rem);
}
.id-sel-star {
  flex: 0 0 auto;
  min-width: 3.5rem;
  max-width: 5rem;
}
.id-sel-真 {
  flex: 0 0 auto;
  min-width: 3.5rem;
  max-width: 5rem;
}
.deputy-career-in-first {
  margin-bottom: 10px;
}
.deputy-ws-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ws-lab {
  flex: 0 0 auto;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.ws-inp {
  max-width: 6rem;
  margin-bottom: 0;
}
.main-lvl-career-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
}
.main-lvl-career-row > * {
  flex-shrink: 0;
}
.main-lvl-career-row select {
  width: auto !important;
}
.field-h-inline {
  margin-bottom: 0;
}
.field-h-inline > label:first-child {
  min-width: 2.25em;
}
.lv-suffix-wrap {
  display: inline-flex;
  align-items: stretch;
  flex: 0 0 auto;
  border: 1px solid var(--border, #2a3544);
  border-radius: 8px;
  background: #121a26;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 32px;
}
.lv-suffix-inp {
  width: 2.55em;
  min-width: 1.9em;
  max-width: 3.35em;
  border: none;
  margin: 0;
  padding: 6px 2px 6px 5px;
  background: transparent;
  color: var(--text, #e6edf3);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  line-height: 1.25;
  box-sizing: border-box;
  -moz-appearance: textfield;
}
.lv-suffix-inp::-webkit-outer-spin-button,
.lv-suffix-inp::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.lv-suffix-inp:focus {
  outline: none;
}
.lv-suffix-wrap:focus-within {
  box-shadow: 0 0 0 1px var(--accent, #6ee7b7);
}
.lv-suffix-txt {
  display: flex;
  align-items: center;
  padding: 0 6px 0 0;
  font-size: 13px;
  color: var(--muted, #8b9bb4);
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}
.career-sel-tiny {
  flex: 0 0 auto;
  width: auto;
  min-width: 4.28em;
  max-width: 5.85em;
  font-size: 12px;
  padding: 6px 4px;
  box-sizing: border-box;
}
.ctl-z-nolab {
  margin-bottom: 0;
}
.field-h {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.field-h > label:first-child {
  flex: 0 0 auto;
  min-width: 2.75em;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.field-h .ctl {
  flex: 0 1 auto;
  width: auto;
  max-width: min(100%, 18rem);
  margin-bottom: 0;
}
.ctl-d3 {
  flex: 0 0 auto !important;
  width: 2.65rem;
  min-width: 2.65rem;
  max-width: min(100%, 4rem) !important;
  padding-left: 4px;
  padding-right: 4px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.ctl-d2 {
  flex: 0 0 auto !important;
  width: 2.1rem;
  min-width: 2.1rem;
  max-width: min(100%, 3.2rem) !important;
  padding-left: 3px;
  padding-right: 3px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.ctl-d5 {
  flex: 0 0 auto !important;
  width: 4.1rem;
  min-width: 4.1rem;
  max-width: min(100%, 5.5rem) !important;
  padding-left: 4px;
  padding-right: 4px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.ctl-z {
  flex: 0 0 auto !important;
  width: auto;
  min-width: 3.2em;
  max-width: 5.25rem !important;
  padding: 6px 6px;
}
.ctl-fit {
  flex: 0 1 auto !important;
  width: auto;
  min-width: 5.5rem;
  max-width: min(100%, 18rem) !important;
}
.lvl-row {
  margin-bottom: 0;
}
.attrs-one-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 6px 0 4px;
}
.attr-pair {
  display: flex;
  align-items: center;
  gap: 4px;
}
.attr-pair label {
  margin: 0;
  flex: 0 0 auto;
  min-width: 2em;
  font-size: 12px;
  color: var(--muted);
}
.stat-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}
.stat-inline .lbl {
  color: var(--muted);
}
.stat-inline .gap {
  width: 8px;
}
.stat-inline strong {
  color: var(--text);
  font-weight: 600;
}
.sub-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  gap: 8px;
}
.sub-head h3 {
  margin: 0;
  font-size: 15px;
}
.mutual-field {
  margin-bottom: 8px;
}
.mutual-lab {
  min-width: 3em;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.mutual-num {
  width: 6.5rem;
  max-width: min(100%, 9rem);
  text-align: right;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0 !important;
}
.mutual-bonus-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 10px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--accent, #6ee7b7);
}
.mutual-cell {
  font-variant-numeric: tabular-nums;
}
.muted-small {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.gem-deputy {
  margin-bottom: 6px;
}
.deputy-num {
  flex: 0 0 auto;
  padding: 6px 3px;
}
.talent-line {
  flex-wrap: wrap;
}
.talent-line .ctl {
  max-width: min(100%, 14rem);
}
.shrink-lab {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}
.shrink-lab.wide-lab {
  min-width: 2.25em;
}
.talent-effect {
  flex: 1 1 auto;
  font-size: 12px;
  color: var(--muted);
  min-width: 4em;
}
.tal-lv {
  flex: 0 0 auto;
  padding: 6px 4px;
}
.skill-row-h {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}
.sk-n {
  flex: 1 1 100%;
  font-weight: 600;
  margin: 0 0 2px;
}
.sk-tier {
  font-size: 10px;
  padding: 6px 4px;
  max-width: min(100%, 17rem) !important;
}
.sk-pro {
  flex: 0 0 auto;
  padding: 6px 4px;
}
.btn-mini {
  padding: 6px 10px;
  font-size: 12px;
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
