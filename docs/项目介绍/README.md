# 项目介绍（文档索引）

本目录为 **幻三（huansan）** 工程的 **可读版项目说明**：面向产品、策划、开发与测试，全部使用 Markdown，可按主题拆阅，文档之间互相引用。

> **维护规则**：`docs/项目介绍/` 下文档由 AI 维护，用于描述当前项目结构与规格；后续开发可直接将本目录内容视为最新基线。`docs/私有文档/` 为开发人员编写文档，AI 只读不改。

> **与代码的关系**：玩法表、装备名、分段数值等 **以本文档为规格说明**；实现上同步维护在仓库根目录 [`common/gameCatalog.js`](../../common/gameCatalog.js) 与 [`common/attrCalculator.js`](../../common/attrCalculator.js)（供 Node 与 Mobile 引用，避免双份逻辑）。若规格变更，应 **先改文档再改代码**，或至少在 PR 中注明二者已对齐。

> **文件命名**：下表 **01–22** 专题文档采用 **`NN-english-slug.md`（全 ASCII）**，便于跨平台路径、全文检索与自动化；**标题与正文仍为中文**。

---

## 文档列表

| 序号 | 文件 | 内容概要 |
|------|------|----------|
| 1 | [01-product-vision.md](./01-product-vision.md) | 游戏定位、核心玩法、与同类产品差异、模块规划与版本边界 |
| 2 | [02-repo-layout.md](./02-repo-layout.md) | 目录说明、各子工程技术选型、依赖关系 |
| 3 | [03-shared-rules.md](./03-shared-rules.md) | 为何存在 `gameCatalog.js`、与本文档的分工、维护约定 |
| 4 | [04-config-schema.md](./04-config-schema.md) | 用户配置 JSON（中文 key）、主将/副将结构、规范化与兼容迁移 |
| 5 | [05-gear-mount-gems-skills.md](./05-gear-mount-gems-skills.md) | 装备部位顺序、各部位名称与数值、坐骑列表、宝石范围、固定四技能 |
| 6 | [06-talents-skill-mastery.md](./06-talents-skill-mastery.md) | 天赋名称、效果说明、等级分段数值表；技能熟练度区间 |
| 7 | [07-stats-style.md](./07-stats-style.md) | 等级与总点数、空闲、可选池、降等级重置、风格判定规则 |
| 8 | [08-battle-attrs.md](./08-battle-attrs.md) | `computeAttrsFromConfig` 流水线、占位公式说明、`/api/attrs` 与缓存 |
| 9 | [09-backend.md](./09-backend.md) | Node 服务、数据模型、路由模块、安全与限流注意点 |
| 10 | [10-http-api.md](./10-http-api.md) | 全部 REST 接口（含管理端）、请求/响应字段约定 |
| 11 | [11-mobile.md](./11-mobile.md) | Mobile 功能、路由与登录策略、与 `.env` 的端口/代理 |
| 12 | [12-admin.md](./12-admin.md) | Admin 布局、用户管理、分页与改密、无鉴权风险说明 |
| 13 | [13-env-deploy.md](./13-env-deploy.md) | 根目录 `.env` 变量说明、本地启动顺序、构建与联调 |
| 14 | [14-main-hero.md](./14-main-hero.md) | 五维公式、[16-class-bonuses.md](./16-class-bonuses.md) §1、坐骑/装备/天赋、帮派、战斗属性流水线（规格） |
| 15 | [15-deputy.md](./15-deputy.md) | 神将/国士表、成长/无双/星级/「真」、职业加成/宝石/默契/天赋、战斗属性流水线（规格） |
| 16 | [16-class-bonuses.md](./16-class-bonuses.md) | §1 原始战斗属性（已实现）；§2 职业抗性；§3 前世槽乘算（与 `attrCalculator` 对齐见正文） |
| 17 | [17-mount.md](./17-mount.md) | 坐骑成长值与各坐骑战斗加成公式（规格） |
| 18 | [18-main-gear.md](./18-main-gear.md) | 主将六部位装备与宝石属性列表（规格） |
| 19 | [19-talents.md](./19-talents.md) | 天赋槽规则、效果说明与分段数值表（规格） |
| 20 | [20-battle-actions.md](./20-battle-actions.md) | 战局可选操作、物品、Socket 回合同步与 canonical 单位 key |
| 21 | [21-battle-architecture.md](./21-battle-architecture.md) | 战局后端分层、统一编排层、回合主链路与重启销毁策略 |
| 22 | [22-battle-round-gate-and-events.md](./22-battle-round-gate-and-events.md) | 回合门与回合体、事件只追加、战况累计与 `round-result` 原子边界 |

---

## 需求文档（仓库内其他位置）

以下文件仍在 `docs/` 根目录，作为 **原始需求/任务单**。AI 会基于这些输入整理到本目录并保持对齐：

- [`../我对这个项目的描述.md`](../我对这个项目的描述.md) — 玩法与 V1 范围总述  
- [`../当前任务.md`](../当前任务.md) — 配置页与表单的细化任务  
- [`../游戏项目开发文档.docx`](../游戏项目开发文档.docx) — Word 版（若存在）

---

## 建议阅读顺序

- **新成员**：01 → 02 → 04 → 10 → 11 → 13  
- **策划/数值**：01 → 05 → 06 → 07 → 08  
- **前端**：02 → 03 → 04 → 05 → 06 → 07 → 11  
- **后端**：02 → 03 → 04 → 08 → 09 → 10  

