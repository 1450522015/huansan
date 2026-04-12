# AI 写代码前必读（huansan）

> **用途**：在为本仓库编写或修改代码前，请先通读本文件，再按需深入链接中的文档或源码。  
> **建议**：在 Cursor 中把本文件加入 **Rules**，或在每次复杂任务开头用 `@.ai/README.md` 引用。  
> **写完代码后**：若改动影响了玩法表、配置结构、API、前后端行为或目录职责，**视情况更新 `docs/项目介绍/` 下对应 Markdown**，避免「代码已变、文档仍旧」。（纯样式、变量重命名等可不改。）

---

## 1. 项目是什么

- **回合制 PVP 向**游戏工程：玩家配置主将+三副将（等级、装备、坐骑、宝石、天赋、技能等），**战斗属性**由 `common/attrCalculator.js` 与 `common/gameCatalog.js` **前后端共用**计算；完整 PK 对战仍在后续版本。
- **V1 重点**：`mobile`（需登录）+ `nodejs`（API + Socket 骨架）+ `admin`（无登录管理端）+ 共享逻辑 **`common/`**（`gameCatalog.js`、`attrCalculator.js`）。

---

## 2. 写代码前必须先搞清的「单一事实来源」

| 内容 | 人类可读（优先） | 机器执行（与实现对齐） |
|------|------------------|------------------------|
| 装备/坐骑/宝石/技能表、天赋分段、属性点与风格 | **`docs/项目介绍/`**（从 [`docs/项目介绍/README.md`](../docs/项目介绍/README.md) 进入） | **`common/gameCatalog.js`** |
| 战斗属性汇总（主将+副将1～3） | [08-战斗属性与计算说明.md](../docs/项目介绍/08-战斗属性与计算说明.md) | **`common/attrCalculator.js`** |
| 原始需求碎片 | `docs/我对这个项目的描述.md`、`docs/当前任务.md` | 以 `项目介绍` 已归纳章节为准 |

**规则**：改玩法表、数值段、配置结构时，**优先改 `docs/项目介绍` 下对应 md，再改 `common/gameCatalog.js`（及必要的 `common/attrCalculator.js`）**。不要在业务代码里写大段可维护的「文档式注释」代替 md。

---

## 3. 目录边界（不要跨工程乱改）

| 目录 | 职责 | 约束 |
|------|------|------|
| `mobile/` | Vue3 + Vite + Capacitor，手游 | 业务 JSON **key 全中文**；通过 **`@common`** 引用 `common/*.js`；配置页战斗属性 **本地即时计算**，与后端交互仅限主页 **保存 / 回退 / 导入**（保存与导入由后端再校验） |
| `admin/` | Vue3 + Vite，桌面后台 | **全局无登录**；仅调 `/api/admin/*` |
| `nodejs/` | Express + better-sqlite3 + Socket.IO | 用户鉴权 JWT；配置读写；**不要**把大段静态表写进路由——表与计算在 **`common/`** |
| `common/` | `gameCatalog.js`（表+规范化+纯函数）、`attrCalculator.js`（战斗属性） | 勿引入 `express`/数据库驱动；保持 ESM、可被 Vite 与 Node 同时 import |
| `docs/项目介绍/` | 项目介绍与规格 | Markdown 互相链接；**用户未要求时不要新建无关 md** |

---

## 4. 环境变量（根目录 `.env`）

- **SQLite**：`SQLITE_PATH`（可选，默认 `data/huansan.sqlite`）
- **JWT**：`JWT_SECRET`（生产必须强随机）
- **Node 端口**：`NODEJS_PORT` 等
- **前端 dev**：`VUE3_MOBILE_PORT`、`VUE3_ADMIN_PORT`；Vite 用 `NODEJS_*` 配 **代理**

改端口或后端地址时，检查 **mobile / admin 的 `vite.config.js`** 是否从根目录 `loadEnv`。

---

## 5. API 与鉴权（写接口或 axios 时核对）

- **Mobile**：`/api/register`、`/api/login`；`/api/config` 需 **`Authorization: Bearer <token>`**；可选 **`GET /api/attrs`**（与本地 `computeAttrsFromConfig` 同源，供调试或其它端）；401 时前端会清 token 并回登录页。
- **Admin**：`/api/admin/users`（分页）、`/api/admin/users/:id/password`（改密）——**当前无鉴权**，勿当公开环境安全方案。
- 详细列表见 [`docs/项目介绍/10-HTTP-API.md`](../docs/项目介绍/10-HTTP-API.md)。

---

## 6. 编码习惯（与本仓库一致）

- **只改任务需要的文件**，避免顺手大重构、无关格式化。
- **命名**：与现有文件一致；配置字段 **中文 key** 不要改成英文。
- **新增依赖**：在对应子项目的 `package.json` 添加，并在 PR/说明里写清。
- **用户表字段**：`用户名`、`密码哈希`、`配置`（JSON）、`配置已认证`、`创建时间`、`最近登录时间`（注册与登录成功时更新）。

---

## 7. 写完代码后：更新项目介绍（按需）

- 若本次修改涉及 **用户可见行为、接口、数据模型、静态表、计算公式、部署方式** 等，应在同一任务内 **同步修订 [`docs/项目介绍/`](../docs/项目介绍/README.md) 中相关章节**（或 `README` 索引里指向的子文档）。
- **典型必更**：新增/改名 API、改 `common/` 表或分段、改 `User` 字段、改登录/鉴权策略、改 `.env` 约定、改各子工程脚本或端口。
- **可不改**：纯 UI 微调、与规格无关的重命名、仅本地调试用的临时改动。
- 若不确定写哪一篇，至少在索引 [`docs/项目介绍/README.md`](../docs/项目介绍/README.md) 里判断最贴近的一节，或新建小节并互相链接。

---

## 8. 改完如何自检（按需）

- `mobile`：`npm run build`
- `admin`：`npm run build`
- `nodejs`：确保 `data/` 可写或设置 `SQLITE_PATH` 后启动；涉及属性时可用现有接口 smoke 测

---

## 9. 一句话备忘

**规格在 `docs/项目介绍`，共享逻辑在 `common/`（`gameCatalog` + `attrCalculator`），业务装配在 `mobile` / `admin` / `nodejs`，三者勿混写、勿重复造表。**
