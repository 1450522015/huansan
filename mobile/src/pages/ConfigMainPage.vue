<template>
  <div class="page">
    <header class="config-header">
      <button type="button" class="btn-back" @click="goBack">返回</button>
    </header>
    <div v-if="提示" class="msg" :class="提示类型">{{ 提示 }}</div>

    <div class="card card-tight">
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
        <select v-model="当前.职业经历[0]" class="career-sel-tiny">
          <option v-for="r in 角色分类列表" :key="'c0' + r" :value="r">{{ r }}</option>
        </select>
        <select v-model="当前.职业经历[1]" class="career-sel-tiny">
          <option v-for="r in 角色分类列表" :key="'c1' + r" :value="r">{{ r }}</option>
        </select>
        <select v-model="当前.职业经历[2]" class="career-sel-tiny">
          <option v-for="r in 角色分类列表" :key="'c2' + r" :value="r">{{ r }}</option>
        </select>
        <select v-model="当前.职业经历[3]" class="career-sel-tiny" @change="on当前世职业变更">
          <option v-for="r in 角色分类列表" :key="'c3' + r" :value="r">{{ r }}</option>
        </select>
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

    <div class="card card-tight">
      <h3>坐骑</h3>
      <div class="row mount-one-line">
        <select v-model.number="配置.主将.坐骑.转数" class="ctl ctl-z ctl-z-nolab" @blur="on坐骑转数Blur">
          <option v-for="z in [0, 1, 2, 3]" :key="'m' + z" :value="z" :disabled="z !== 3">{{ z }}转</option>
        </select>
        <div class="lv-suffix-wrap">
          <input
            v-model.number="配置.主将.坐骑.等级"
            class="lv-suffix-inp"
            type="number"
            min="1"
            max="160"
            inputmode="numeric"
            @blur="on坐骑等级Blur"
          />
          <span class="lv-suffix-txt" aria-hidden="true">级</span>
        </div>
        <select v-model="配置.主将.坐骑.种类" class="ctl mount-kind-sel">
          <option v-for="m in 主将坐骑种类选项" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="mount-bonus-row">
        <span v-if="坐骑加成展示" class="mount-bonus">{{ 坐骑加成展示 }}</span>
        <span v-else class="mount-bonus-empty">所选坐骑暂无战斗属性加成</span>
      </div>
    </div>

    <div class="card card-tight">
      <h3>装备</h3>
      <div v-for="部位 in 装备部位列表" :key="部位" class="装备块">
        <div class="equip-head">
          <h4>{{ 部位 }}</h4>
          <select
            v-model="配置.主将.装备[部位].名称"
            class="ctl equip-name-sel"
            @change="on装备名称变更(部位)"
          >
            <option v-for="n in 名称选项(部位)" :key="n" :value="n">{{ n }}</option>
          </select>
          <select
            v-if="需装备词条(部位)"
            v-model="配置.主将.装备[部位].词条"
            class="ctl equip-affix-sel"
          >
            <option v-for="c in 词条选项(部位)" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <span v-if="装备加成文案(部位)" class="equip-bonus">{{ 装备加成文案(部位) }}</span>
        </div>
        <div v-show="配置.主将.装备[部位].名称 !== 主将装备无" class="gems">
          <div class="gem-line">
            <div v-for="idx in [0, 1, 2]" :key="部位 + 'g' + idx" class="gem-cell">
              <select
                class="gem-sel"
                :value="配置.主将.装备[部位].宝石[idx]?.属性 ?? ''"
                @change="setSlotGem(部位, idx, $event.target.value)"
              >
                <option value="">—</option>
                <option v-for="o in 主将装备宝石可选属性(部位)" :key="o" :value="o">{{ o }}</option>
              </select>
              <input
                class="gem-num ctl-d2"
                type="number"
                :min="宝石下限值(部位, idx)"
                :max="宝石上限值(部位, idx)"
                :step="宝石步长值(部位, idx)"
                :value="配置.主将.装备[部位].宝石[idx]?.数值 ?? 宝石上限值(部位, idx)"
                @input="setSlotGemNum(部位, idx, $event.target.value)"
                @blur="blurSlotGemNum(部位, idx)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card card-tight">
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

    <div class="card card-tight">
      <h3>帮派能力</h3>
      <div class="faction-row">
        <label class="faction-lab">主抗性</label>
        <select
          class="ctl ctl-fit faction-sel"
          :value="当前.帮派?.主抗性 ?? ''"
          @change="on帮派主抗性($event.target.value)"
        >
          <option value="">（无）</option>
          <option v-for="a in 帮派抗性可选" :key="'fm' + a" :value="a">{{ a }}</option>
        </select>
        <label class="faction-lab">副抗性</label>
        <select
          class="ctl ctl-fit faction-sel"
          :value="当前.帮派?.副抗性 ?? ''"
          @change="on帮派副抗性($event.target.value)"
        >
          <option value="">（无）</option>
          <option v-for="a in 帮派抗性可选" :key="'fs' + a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div v-if="帮派加成展示" class="faction-bonus">{{ 帮派加成展示 }}</div>
    </div>

    <div class="card card-tight">
      <h3>技能</h3>
      <div v-for="(s, i) in 当前.技能" :key="'sk' + i" class="skill-row-h">
        <span class="sk-n">{{ s.名称 }}</span>
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
        <span class="skill-effect">{{ 技能当前效果文案(s, { 战斗属性: 主将战斗属性, 坐骑: 配置.主将?.坐骑, 天赋: 当前.天赋 }) }}</span>
      </div>
    </div>

    <BattleAttrsPanel :data="主将战斗属性" :debug="主将战斗属性调试" />

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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BattleAttrsPanel from '@/components/BattleAttrsPanel.vue'
import {
  装备部位列表,
  主将装备无,
  主将装备宝石可选属性,
  宝石属性最小值,
  宝石属性最大值,
  宝石属性步长,
  副将宝石属性,
  主将坐骑种类选项,
  坐骑战斗加成,
  坐骑战斗阶段占位,
  帮派抗性可选,
  帮派战斗加成,
  normalize帮派抗性项,
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
  天赋面板加成文案,
  空闲点,
  计算风格,
  修正属性分配,
  默认技能组,
  解析装备格,
  解析装备格汇总,
  单维属性上限,
  技能等级档位列表,
  技能档位范围,
  clamp熟练度到档位,
  技能当前效果文案,
  computeAttrsFromConfig,
  computeUnitBattleDebug,
} from '@/shared/config/defaults.js'
import { 配置, applyConfigImport } from '@/shared/config/usePlayerConfig.js'

const route = useRoute()
const router = useRouter()

const battleDebugOn = computed(
  () => import.meta.env.DEV || route.query.battleDebug === '1' || route.query.battleDebug === 'true',
)
const 提示 = ref('')
const 提示类型 = ref('ok')
const openImport = ref(false)
const importText = ref('')

const 主将战斗属性 = computed(() => computeAttrsFromConfig(配置)?.主将 ?? null)

const 主将战斗属性调试 = computed(() => {
  if (!battleDebugOn.value) return null
  return computeUnitBattleDebug(配置?.主将, { 主将: true })
})

const 坐骑加成展示 = computed(() => {
  const m = 配置.主将?.坐骑
  if (!m) return ''
  const o = 坐骑战斗加成(m.种类, m.等级, m.转数)
  const parts = Object.entries(o)
    .map(([k, v]) => {
      const n = Math.round(Number(v) || 0)
      if (n === 0) return ''
      return `${k}+${n}`
    })
    .filter(Boolean)
  const extra = 坐骑战斗阶段占位(m.种类, m.等级, m.转数).map((p) => {
    if (p.展示) return p.展示
    if (p.数值 != null && Number.isFinite(p.数值)) {
      return `${p.键}+${p.数值}`
    }
    return p.键
  })
  return [...parts, ...extra].join('，')
})

const 帮派加成展示 = computed(() => {
  const b = 配置.主将?.帮派
  if (!b) return ''
  const o = 帮派战斗加成(b.主抗性, b.副抗性)
  const parts = Object.entries(o).map(([k, v]) => `${k}+${v}`)
  return parts.join('，')
})

onMounted(() => {
  const g = 配置.主将.帮派
  if (!g || typeof g !== 'object') {
    配置.主将.帮派 = { 主抗性: null, 副抗性: null }
    return
  }
  if ('抗性' in g && !('主抗性' in g) && !('副抗性' in g)) {
    const r = normalize帮派抗性项(g.抗性)
    配置.主将.帮派 = { 主抗性: r, 副抗性: null }
    return
  }
  if (!('主抗性' in g) || !('副抗性' in g)) {
    配置.主将.帮派 = {
      主抗性: normalize帮派抗性项(g.主抗性),
      副抗性: normalize帮派抗性项(g.副抗性),
    }
  }
})

function on帮派主抗性(v) {
  const x = v === '' ? null : v
  if (!配置.主将.帮派 || typeof 配置.主将.帮派 !== 'object') {
    配置.主将.帮派 = { 主抗性: null, 副抗性: null }
  }
  配置.主将.帮派.主抗性 = x
  if (x && 配置.主将.帮派.副抗性 === x) 配置.主将.帮派.副抗性 = null
}

function on帮派副抗性(v) {
  const x = v === '' ? null : v
  if (!配置.主将.帮派 || typeof 配置.主将.帮派 !== 'object') {
    配置.主将.帮派 = { 主抗性: null, 副抗性: null }
  }
  配置.主将.帮派.副抗性 = x
  if (x && 配置.主将.帮派.主抗性 === x) 配置.主将.帮派.主抗性 = null
}

function goBack() {
  router.push({ name: 'home' })
}

const 当前 = computed(() => 配置.主将)

const 等级显示 = computed(() => Math.min(160, Math.max(1, Number(当前.value.等级) || 1)))
const 空闲显示 = computed(() => 空闲点(当前.value.等级, 当前.value.属性分配))
const 风格显示 = computed(() => 计算风格(当前.value.等级, 当前.value.属性分配))

function 天赋效果文案(t) {
  return 天赋面板加成文案(t?.名称, t?.等级)
}

function clampInt(raw, lo, hi) {
  const x = Math.trunc(Number(raw))
  if (!Number.isFinite(x)) return lo
  return Math.min(hi, Math.max(lo, x))
}

function on单位等级Blur() {
  当前.value.等级 = clampInt(当前.value.等级, 1, 160)
  on等级变更()
}

function on单位转数Blur() {
  当前.value.转数 = clampInt(当前.value.转数, 0, 3)
}

function on坐骑等级Blur() {
  配置.主将.坐骑.等级 = clampInt(配置.主将.坐骑.等级, 1, 160)
}

function on坐骑转数Blur() {
  配置.主将.坐骑.转数 = clampInt(配置.主将.坐骑.转数, 0, 3)
}

function onAttrBlur(key) {
  const L = 等级显示.value
  const a = 当前.value.属性分配
  a[key] = clampInt(a[key], L, 单维属性上限)
  clamp四维()
}

function on天赋等级Blur(t) {
  t.等级 = clampInt(t.等级, 1, 160)
}

function blurSlotGemNum(部位, idx) {
  const 格 = 配置.主将.装备[部位]
  if (!格?.宝石[idx]) return
  const min = 宝石属性最小值(格.宝石[idx]?.属性)
  const max = 宝石属性最大值(格.宝石[idx]?.属性)
  const step = 宝石属性步长(格.宝石[idx]?.属性)
  const raw = Number(格.宝石[idx].数值)
  const base = Number.isFinite(raw) ? raw : max
  const snapped = min + Math.round((base - min) / step) * step
  格.宝石[idx].数值 = Math.min(max, Math.max(min, snapped))
}

function on当前世职业变更() {
  const r = 当前.value.职业经历?.[3]
  if (!r) return
  当前.value.技能 = 默认技能组(r)
}

function on技能档位变更(i) {
  const s = 当前.value.技能[i]
  if (!s) return
  const row = 技能档位范围(s.等级)
  s.熟练度 = row.熟练度最大
}

function clamp技能熟练(i) {
  const s = 当前.value.技能[i]
  if (!s) return
  s.熟练度 = clamp熟练度到档位(s.等级, s.熟练度)
}

function on等级变更() {
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function clamp四维() {
  const L = 等级显示.value
  当前.value.属性分配 = 修正属性分配(L, 当前.value.属性分配)
}

function 名称选项(部位) {
  let list = []
  if (部位 === '头盔') list = 头盔名称列表
  else if (部位 === '项饰') list = 项饰名称列表
  else if (部位 === '武器') list = 武器名称列表
  else if (部位 === '护腕') list = 护腕名称列表
  else if (部位 === '铠甲') list = 铠甲名称列表
  else list = 战靴名称列表
  return [主将装备无, ...list]
}

function 需装备词条(部位) {
  const 格 = 配置.主将.装备[部位]
  if (!格?.名称 || 格.名称 === 主将装备无) return false
  if (部位 === '战靴') return true
  const cfg = 头盔配置[格.名称]
  return !!(cfg && cfg.词条.length > 1)
}

function 词条选项(部位) {
  const 格 = 配置.主将.装备[部位]
  if (部位 === '战靴') {
    return [
      { value: '速度', label: '速度+100' },
      { value: '敏捷', label: '敏捷+100' },
    ]
  }
  const cfg = 头盔配置[格.名称]
  if (!cfg) return []
  const n = cfg.数值 ?? 10
  return cfg.词条.map((c) => ({ value: c, label: `${c}+${n}` }))
}

function 装备加成文案(部位) {
  const 格 = 配置.主将.装备[部位]
  const o = 解析装备格(部位, 格)
  return Object.entries(o)
    .map(([k, v]) => `${k}+${v}`)
    .join('，')
}

function on装备名称变更(部位) {
  const 格 = 配置.主将.装备[部位]
  if (格.名称 === 主将装备无) {
    格.词条 = null
    格.宝石 = [null, null, null]
    return
  }
  if (部位 === '战靴') {
    格.词条 = '速度'
    return
  }
  const cfg = 头盔配置[格.名称]
  if (cfg && cfg.词条.length) 格.词条 = cfg.词条[0]
}

function setSlotGem(部位, idx, 属性) {
  const 格 = 配置.主将.装备[部位]
  if (!格.宝石[idx]) 格.宝石[idx] = { 属性: '', 数值: 宝石属性最大值('') }
  if (!属性) {
    格.宝石[idx] = null
    return
  }
  const max = 宝石属性最大值(属性)
  // 切换宝石属性时，自动跳到该属性当前上限，减少手工调值步骤
  格.宝石[idx] = { 属性, 数值: max }
}

function setSlotGemNum(部位, idx, raw) {
  const 格 = 配置.主将.装备[部位]
  if (!格.宝石[idx]) return
  const min = 宝石属性最小值(格.宝石[idx]?.属性)
  const max = 宝石属性最大值(格.宝石[idx]?.属性)
  const step = 宝石属性步长(格.宝石[idx]?.属性)
  const base = Number(raw)
  const picked = Number.isFinite(base) ? base : max
  const snapped = min + Math.round((picked - min) / step) * step
  const n = Math.min(max, Math.max(min, snapped))
  格.宝石[idx].数值 = n
}

function 宝石下限值(部位, idx) {
  const attr = 配置?.主将?.装备?.[部位]?.宝石?.[idx]?.属性
  return 宝石属性最小值(attr)
}

function 宝石上限值(部位, idx) {
  const attr = 配置?.主将?.装备?.[部位]?.宝石?.[idx]?.属性
  return 宝石属性最大值(attr)
}

function 宝石步长值(部位, idx) {
  const attr = 配置?.主将?.装备?.[部位]?.宝石?.[idx]?.属性
  return 宝石属性步长(attr)
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
/* 第一行强制单行：避免全局 select{width:100%} 在 flex 下误判换行，窄屏横向滑动 */
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
.mount-one-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 0;
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
.mount-kind-sel {
  flex: 0 0 auto;
  width: max-content;
  max-width: 100%;
  min-width: 3rem;
  font-size: 12px;
  padding: 6px 8px;
  margin-bottom: 0;
  field-sizing: content;
}
.mount-bonus-row {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.mount-bonus {
  color: var(--accent, #6ee7b7);
}
.mount-bonus-empty {
  color: var(--muted, #8b9bb4);
}
.faction-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 6px;
}
.faction-lab {
  flex: 0 0 auto;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  min-width: 3em;
}
.faction-sel {
  max-width: min(100%, 14rem) !important;
}
.faction-bonus {
  font-size: 12px;
  line-height: 1.45;
  color: var(--accent, #6ee7b7);
}
.equip-name-sel {
  flex: 0 0 auto !important;
  width: max-content !important;
  min-width: unset !important;
  max-width: 100% !important;
  margin-bottom: 0 !important;
  field-sizing: content;
}
.equip-affix-sel {
  flex: 0 0 auto !important;
  width: max-content !important;
  min-width: unset !important;
  max-width: 100% !important;
  margin-bottom: 0 !important;
  field-sizing: content;
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
.equip-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-bottom: 6px;
}
.equip-head h4 {
  margin: 0;
  font-size: 14px;
}
.equip-bonus {
  font-size: 11px;
  color: var(--accent);
  line-height: 1.35;
}
.装备块 {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.装备块:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.gem-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.gem-cell {
  display: flex;
  gap: 4px;
  flex: 0 1 auto;
  align-items: center;
}
.gem-sel {
  flex: 0 1 auto;
  width: 3.74rem !important;
  min-width: 3.74rem !important;
  max-width: 3.74rem !important;
  font-size: 11px;
  padding: 6px 14px 6px 5px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--muted) 50%),
    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position:
    calc(100% - 7px) calc(50% - 1px),
    calc(100% - 4px) calc(50% - 1px);
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.gem-num {
  flex: 0 0 auto;
  width: 3.45rem;
  min-width: 3.45rem;
  max-width: 3.45rem;
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
  font-size: 11px;
  color: var(--accent);
  line-height: 1.35;
  min-width: 4em;
}
.tal-lv {
  flex: 0 0 auto;
  padding: 6px 4px;
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
  font-size: 10px;
  padding: 6px 4px;
  width: 6.6em;
  min-width: 6.6em;
  max-width: 6.6em !important;
}
.sk-pro {
  flex: 0 0 auto;
  padding: 6px 4px;
}
.skill-effect {
  flex: 1 1 auto;
  font-size: 11px;
  color: var(--accent);
  line-height: 1.35;
  min-width: 6em;
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
