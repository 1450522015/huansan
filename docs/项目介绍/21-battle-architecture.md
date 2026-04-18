# 21 · 战局架构与分层

[← 返回索引](./README.md)

---

## 1. 目标

本篇描述当前战局系统的实现分层，作为后续继续迭代战斗规则与前端表现的基线。

---

## 2. 当前分层

- **领域规则层**：`nodejs/src/services/battleEngine.js`
  - 单位构建、技能与 buff 结算、回合执行、日志与过程生成。
- **应用编排层**：`nodejs/src/services/battleApplicationService.js`
  - 统一封装开始回合、提交出招、逃跑。
  - 负责拼装回合结果 payload 与战局状态推进。
- **协议入口层（Socket）**：`nodejs/src/index.js`
  - 鉴权、在线映射、事件收发、向双方广播回合结果。
- **协议入口层（HTTP）**：`nodejs/src/routes/battle.js`
  - `/current` 快照、`/round/start`、`/actions/submit`、`/flee`。
- **数据层**：`nodejs/src/repositories/battleRepo.js` + `nodejs/src/db/sqlite.js`
  - `battles` 与 `battle_rounds` 持久化、回合号规则、快照读取。

---

## 3. 回合主链路

1. 客户端发起 `battle-round-start`（或 HTTP 同路径能力）。
2. 应用编排层计算待开始回合、构建 canonical 单位、返回 `round-started` payload。
3. 双方提交 `battle-actions-submit`（或 HTTP 同路径能力）。
4. 应用编排层汇总双方动作，双方就绪后调用 battleEngine 结算。
5. 结算结果写入 `battle_rounds`，并根据结束判定更新 `battles`。
6. Socket 向双方广播 `round-result`，前端按 `战斗过程` 播放动画并以 `单位状态` 落最终态。

### 3.1 速度排名缓存

- `battleEngine` 会把当前战局运行态与速度排名缓存一起保存在内存。
- 速度排名只在两类时机重算：新回合初始化，或无双/`速` buff/单位死亡等导致“有效速度或在场单位集合”变化时。
- `GET /api/battle/current`、重新进入战局页、轮询同步等查询路径只允许复用缓存排名；否则会把 `calcSpeedRank` 的随机性重复触发，表现为同一回合内速度排名跳变。
- 注意：`canonicalBattleUnits` → `buildRoundData` 在每次快照请求都会执行；若 `buildRoundData` 在写入运行态缓存之前先调用 `calcSpeedRank` 覆盖缓存，则即使后续 `applyRuntimeStateAndRebuildRanks` 认为签名未变，仍会套上一层新的随机排名。实现上必须与「签名 + 缓存」策略一致。
- `战况文本系统`（`round-result` 与 `GET /api/battle/current.战局.战况文本系统累计`）为**累计**字符串数组，由 `battleApplicationService.appendResolvedRoundToBattleTextAccumulated` 写入 `battles.战况文本系统累计`；**下一回合门**与**本回合战况**在同一 `resolveRound` 边界内由 `battleEngine` 产出（见 [`22-battle-round-gate-and-events.md`](./22-battle-round-gate-and-events.md)）。须与 `单位状态` 使用同一套 `state` 与 `排名`。段落规则见 [`20-battle-actions.md`](./20-battle-actions.md)「战况文本系统（累计 + 单回合工程）」。
- `战况文本用户`（`round-result` 与 `battle_rounds.战况文本用户`）为**单回合**玩家可读摘要（本回合行动 + 「下一回合前置」块）；战局页「系统」栏与重连拉取的 `回合信息` 以此为准，与调试用的累计 `战况文本系统` 分离。

---

## 4. 重启策略

当前版本不做“进行中战局恢复”，采用重启销毁策略：

- 后端启动时统一将 `等待中/战局中` 战局收口为 `已结束`；
- 备注写入 `服务器重启，战局终止`；
- 前端按正常结束态提示，不继续留在战局页。

---

## 5. 前端对应

- `mobile/src/pages/BattlePage.vue` 负责战局展示与动画播放；系统栏战况展示 `round-result.战况文本用户`（或重连时 `GET /api/battle/current.回合信息.战况文本用户`）；
- `mobile/src/features/battle/battleViewAdapter.js` 提供服务端 canonical key 与客户端 viewer key 的映射适配；
- `mobile/src/features/battle/useBattleActionPlanner.js` 负责动作构建和自动攻击动作填充。

---

## 6. 后续迭代约束

- 新增或修改回合编排逻辑，优先进入 `battleApplicationService`，避免在 Socket 与 HTTP 各写一份；
- 新增战斗规则，优先进入 `battleEngine`，避免在前端做业务判定；
- 新增协议字段时同步更新本篇、[20-battle-actions.md](./20-battle-actions.md) 与 [22-battle-round-gate-and-events.md](./22-battle-round-gate-and-events.md)。
