# AI 写代码前必读（huansan）

> **用途**：在为本仓库编写或修改代码前，请先通读本文件，再按需深入链接中的文档或源码。  
> **建议**：在 Cursor 中把本文件加入 **Rules**，或在每次复杂任务开头用 `@.ai/README.md` 引用。

---

## 1. 项目是什么

- **回合制 PVP 向**游戏工程：玩家配置主将+三副将（等级、装备、坐骑、宝石、天赋、技能等），后端根据配置 **计算战斗属性**；**完整 PK 对战**仍在后续版本。
- **V1 重点**：`mobile`（需登录）+ `nodejs`（API + Socket 骨架）+ `admin`（无登录管理端）+ 共享数据 `data/gameCatalog.js`。

---

## 2. 写代码前必须先搞清的「单一事实来源」

| 内容 | 人类可读（优先） | 机器执行（与实现对齐） |
|------|------------------|------------------------|
| 装备/坐骑/宝石/技能表、天赋分段、属性点与风格 | **`docs/项目介绍/`**（从 [`docs/项目介绍/README.md`](../docs/项目介绍/README.md) 进入） | **`data/gameCatalog.js`** |
| 原始需求碎片 | `docs/我对这个项目的描述.md`、`docs/当前任务.md` | 以 `项目介绍` 已归纳章节为准 |

**规则**：改玩法表、数值段、配置结构时，**优先改 `docs/项目介绍` 下对应 md，再改 `gameCatalog.js`（及必要的 `nodejs/src/services/attrCalculator.js`）**。不要在业务代码里写大段可维护的「文档式注释」代替 md。

---

## 3. 目录边界（不要跨工程乱改）

| 目录 | 职责 | 约束 |
|------|------|------|
| `mobile/` | Vue3 + Vite + Capacitor，手游 | 业务 JSON **key 全中文**；通过 `@data` 引用 `data/gameCatalog.js` |
| `admin/` | Vue3 + Vite，桌面后台 | **全局无登录**；仅调 `/api/admin/*` |
| `nodejs/` | Express + Mongoose + Socket.IO | 用户鉴权 JWT；配置读写与属性计算；**不要**把大段静态表写进路由文件——表在 `gameCatalog.js` |
| `data/gameCatalog.js` | 共享表 + `normalizeConfigDeep` + 纯函数计算 | 勿引入 `express`/`mongoose`；保持 ESM、可被 Vite 与 Node 同时 import |
| `docs/项目介绍/` | 项目介绍与规格 | Markdown 互相链接；**用户未要求时不要新建无关 md** |

---

## 4. 环境变量（根目录 `.env`）

- **Mongo**：`MONGODB_URI`
- **JWT**：`JWT_SECRET`（生产必须强随机）
- **Node 端口**：`NODEJS_PORT` 等
- **前端 dev**：`VUE3_MOBILE_PORT`、`VUE3_ADMIN_PORT`；Vite 用 `NODEJS_*` 配 **代理**

改端口或后端地址时，检查 **mobile / admin 的 `vite.config.js`** 是否从根目录 `loadEnv`。

---

## 5. API 与鉴权（写接口或 axios 时核对）

- **Mobile**：`/api/register`、`/api/login`；`/api/config`、`/api/attrs` 需 **`Authorization: Bearer <token>`**；401 时前端会清 token 并回登录页。
- **Admin**：`/api/admin/users`（分页）、`/api/admin/users/:id/password`（改密）——**当前无鉴权**，勿当公开环境安全方案。
- 详细列表见 [`docs/项目介绍/10-HTTP-API.md`](../docs/项目介绍/10-HTTP-API.md)。

---

## 6. 编码习惯（与本仓库一致）

- **只改任务需要的文件**，避免顺手大重构、无关格式化。
- **命名**：与现有文件一致；配置字段 **中文 key** 不要改成英文。
- **新增依赖**：在对应子项目的 `package.json` 添加，并在 PR/说明里写清。
- **Mongo 用户字段**：`用户名`、`密码哈希`、`配置`、`创建时间`、`最近登录时间`（登录成功时更新）。

---

## 7. 改完如何自检（按需）

- `mobile`：`npm run build`
- `admin`：`npm run build`
- `nodejs`：确保能连上 Mongo 后启动；涉及属性时可用现有接口 smoke 测

---

## 8. 一句话备忘

**规格在 `docs/项目介绍`，共享逻辑在 `data/gameCatalog.js`，业务装配在 `mobile` / `admin` / `nodejs`，三者勿混写、勿重复造表。**
