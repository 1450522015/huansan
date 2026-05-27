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
        <span class="ws-chance">无双几率：{{ 无双几率显示 }}%</span>
      </div>
      <div v-if="无双形态预览行.length" class="unshou-preview">
        <div v-for="(line, idx) in 无双形态预览行" :key="'us' + idx" class="unshou-preview-line">{{ line }}</div>
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
      <h3>宝石</h3>
      <div class="gem-grid">
        <div v-for="(g, i) in 宝石矩阵" :key="'gem' + i" class="gem-cell">
          <select v-model="g.属性" class="gem-sel">
            <option value="">（空）</option>
            <option v-for="o in 副将宝石属性" :key="o" :value="o">{{ o }}</option>
          </select>
          <input
            v-model.number="g.数值"
            class="gem-num ctl-d2"
            type="number"
            min="1"
            :max="宝石上限值(g)"
            :disabled="!g.属性"
            @blur="on副将宝石数值Blur(g)"
          />
        </div>
      </div>
    </div>

    <div v-if="槽位合法" class="card card-tight">
      <h3>天赋</h3>
      <div v-if="重复天赋.length" class="dup-warning">天赋重复：{{ 重复天赋.join('、') }}</div>
      <div v-for="(t, i) in 当前.天赋" :key="'tf' + i" class="field-h talent-line">
        <select
          v-model="t.名称"
          class="ctl ctl-fit"
          :title="t.名称 && 天赋说明[t.名称] ? 天赋说明[t.名称] : ''"
        >
          <option :value="null">（空）</option>
          <option v-for="name in 天赋可选列表(i)" :key="name" :value="name">{{ name }}</option>
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
      <div v-if="当前.头衔 === '神将'" class="field-h">
        <label class="shrink-lab">神将技</label>
        <select v-model="当前.神将技" class="ctl ctl-fit">
          <option v-for="name in 当前可用神将技列表" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
      <div v-for="(s, i) in 当前.技能" :key="'sk' + i" class="skill-row-h">
        <span class="sk-n">{{ s.名称 === 当前.神将技 ? s.名称 + '(神)' : s.名称 }}</span>
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
        <span class="skill-effect">{{ 技能效果文案(s) }}</span>
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
  主将战斗职业轴,
  当前角色分类,
  职业轴与前缀成分类,
  分类转职业轴,
  天赋名称列表,
  天赋说明,
  天赋面板加成文案,
  空闲点,
  计算风格,
  修正属性分配,
  默认技能组,
  单维属性上限,
  技能等级档位列表,
  技能档位范围,
  clamp熟练度到档位,
  神将技技能列表,
  可用神将技列表,
  副将槽位总数,
  empty副将槽,
  副将上阵顺序同步,
  玩家配置转玩家属性,
  副将有效成长,
  副将无双成长增量,
  无双几率,
  宝石属性最大值,
  默认神将技,
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

const 副将战斗属性 = computed(() => {
  if (!槽位合法.value) return null
  return 玩家配置转玩家属性(配置)?.副将列表[槽位.value] ?? null
})

function 技能效果文案(s) {
  const 名称 = String(s?.名称 || '').trim()
  const eff = 副将战斗属性.value?.技能效果?.[名称]
  if (!eff) return '当前效果：--'
  return `当前效果：${eff.当前效果}`
}

const 默契加成格子 = computed(() => {
  if (!当前.value) return []
  const 轴 = 主将战斗职业轴(当前角色分类(当前.value))
  const o = 副将默契战斗加成(当前.value.默契度 ?? 0, 轴)
  const 序 =
    轴 === '武'
      ? ['命中率', '暴击率', '反击率', '致命率', '躲避率', '连击率']
      : 轴 === '文'
        ? ['命中率', '暴击率', '反击率', '致命率', '躲避率', '反震率']
        : ['命中率', '暴击率', '反击率', '致命率', '躲避率', '法爆率', '爆伤力']
  return 序.map((k) => ({ k, v: Math.round(Number(o[k]) || 0) }))
})

const 副将性别前缀 = computed(() => 副将配置性别(当前.value?.人物))

const 无双几率显示 = computed(() => 无双几率(当前.value?.无双等级 || 0))

const 默认神将技名 = computed(() => {
  const cfg = 当前.value
  if (!cfg) return '舍命一击'
  return 默认神将技(cfg.职业经历?.[3] || cfg.人物 || '男武')
})

const 当前神将技显示名 = computed(() => {
  const cfg = 当前.value
  if (cfg?.头衔 !== '神将') return ''
  const selected = cfg?.神将技 || ''
  const def = 默认神将技名.value
  if (selected && selected !== def) return selected
  return def
})

const 当前可用神将技列表 = computed(() => {
  const cfg = 当前.value
  if (cfg?.头衔 !== '神将') return []
  const classType = cfg?.职业经历?.[3] || cfg?.人物 || '男武'
  return 可用神将技列表(classType)
})

function fmt成长三位(v) {
  return String(Math.round(Number(v) * 1000) / 1000)
}

/** 左侧 = 底部总属性；右侧 = 无双状态属性 */
const 无双形态预览行 = computed(() => {
  const u = 当前.value
  if (!u?.人物?.trim()) return []
  if (副将无双成长增量(u.无双等级) <= 0) return []
  const base = 副将战斗属性.value
  const uns = base?.无双属性
  if (!base || !uns) return []
  const g0 = 副将有效成长(u.人物, { 星级: u.星级, 真: u.真, 转数: u.转数 })
  const g1 = Math.round((g0 + 副将无双成长增量(u.无双等级)) * 1000) / 1000
  const fg = (x) => fmt成长三位(x)
  const row = (k) => `${base[k]}→${uns[k]}`
  return [`成长:${fg(g0)}→${fg(g1)}`, `气血:${row('气血')}`, `精力:${row('精力')}`, `攻击:${row('攻击')}`, `速度:${row('速度')}`]
})

function sync槽位() {
  const i = 解析槽位()
  槽位.value = i
  if (i < 0) {
    router.replace({ name: 'home' })
  }
}

watch(() => route.query.slot, sync槽位)
onMounted(sync槽位)

watch(() => 当前.value?.职业经历?.[3], (newClass) => {
  if (!当前.value || 当前.value.头衔 !== '神将') return
  const newDef = 默认神将技(newClass || '男武')
  const newList = 可用神将技列表(newClass || '男武')
  const prev = 当前.value.神将技
  if (!prev || !newList.includes(prev)) {
    当前.value.神将技 = newDef
  }
})

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

const 重复天赋 = computed(() => {
  const 名称列表 = (当前.value?.天赋 || []).map(t => t.名称).filter(Boolean)
  const 重复 = []
  for (const 名 of 名称列表) {
    if (名称列表.filter(n => n === 名).length > 1 && !重复.includes(名)) {
      重复.push(名)
    }
  }
  return 重复
})

function 天赋可选列表(i) {
  const 已选 = (当前.value?.天赋 || []).map((t, idx) => idx === i ? null : t.名称).filter(Boolean)
  return 天赋名称列表.filter(name => !已选.includes(name))
}

function 天赋效果文案(t) {
  return 天赋面板加成文案(t?.名称, t?.等级)
}

const 宝石矩阵 = computed(() => {
  const gems = 当前.value?.宝石 || []
  while (gems.length < 9) gems.push({ 属性: '', 数值: 15 })
  if (gems.length > 9) gems.length = 9
  return gems
})

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
  const max = 宝石属性最大值(g?.属性)
  g.数值 = clampInt(g.数值, 1, max)
}

function 宝石上限值(g) {
  return 宝石属性最大值(g?.属性)
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
  const 当前世 = u.职业经历?.[3]
  if (当前世) {
    u.技能 = 默认技能组(当前世)
    if (u.头衔 === '神将') u.神将技 = 默认神将技(当前世)
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
  if (!槽位合法.value) return
  const i = 槽位.value
  const u = 配置.副将列表[i]
  if (!u) return
  const has = !!(u.人物 && String(u.人物).trim())
  if (!has) {
    配置.副将列表[i] = JSON.parse(JSON.stringify(empty副将槽()))
    副将上阵顺序同步(配置)
    return
  }
  u.已配置 = true
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
    提示.value = '已从 JSON 导入（请在主页保存）'
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
.dup-warning {
  color: #f59e0b;
  font-size: 12px;
  margin: -4px 0 8px;
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
.deputy-identity-row select,
.deputy-identity-row input,
.main-lvl-career-row select,
.deputy-ws-row input {
  width: max-content;
}
.id-sel-title,
.id-sel-char {
  flex: 0 1 auto;
  min-width: 2rem;
}
.id-sel-star {
  flex: 0 0 auto;
  min-width: 2rem;
}
.id-sel-真 {
  flex: 0 0 auto;
  min-width: 2rem;
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
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
  margin-bottom: 0;
}
.ws-chance {
  font-size: 12px;
  color: var(--accent, #6ee7b7);
  white-space: nowrap;
}
.unshou-preview {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border, #2a3544);
}
.unshou-preview-line {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
  color: var(--text, #e6edf3);
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
  width: max-content;
  min-width: 2rem;
  font-size: 12px;
  padding: 6px 8px;
  text-align: center;
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
.field-h .ctl,
.field-h select,
.field-h input[type='number'],
.field-h input[type='text'] {
  width: max-content;
}
.ctl-d3 {
  flex: 0 0 auto !important;
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.ctl-d2 {
  flex: 0 0 auto !important;
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.ctl-d5 {
  flex: 0 0 auto !important;
  width: max-content;
  min-width: 2.5rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.ctl-z {
  flex: 0 0 auto !important;
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  font-size: 12px;
  text-align: center;
}
.ctl-fit {
  flex: 0 1 auto !important;
  width: max-content;
  min-width: 2rem;
  max-width: min(100%, 18rem) !important;
  padding: 6px 8px;
  font-size: 12px;
  text-align: center;
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
  width: max-content;
  min-width: 2.5rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
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
.gem-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 8px;
}
.gem-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}
.gem-cell .gem-sel {
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 8px;
  font-size: 12px;
  text-align: center;
}
.gem-cell .gem-num {
  flex: 0 0 auto;
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.talent-line {
  flex-wrap: wrap;
}
.talent-line .ctl {
  max-width: min(100%, 14rem);
  text-align: center;
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
  font-size: 11px;
  color: var(--accent);
  line-height: 1.35;
  min-width: 4em;
}
.tal-lv {
  flex: 0 0 auto;
  width: max-content;
  min-width: 2rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.skill-row-h {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}
.sk-n {
  flex: 0 0 auto;
  font-weight: 600;
  margin: 0;
}
.sk-tier {
  font-size: 12px;
  padding: 6px 8px;
  width: max-content;
  min-width: 2rem;
}
.sk-pro {
  flex: 0 0 auto;
  width: max-content;
  min-width: 2.5rem;
  padding: 6px 8px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  field-sizing: content;
}
.skill-effect {
  flex: 1 1 auto;
  font-size: 11px;
  color: var(--accent);
  line-height: 1.35;
  min-width: 6em;
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
