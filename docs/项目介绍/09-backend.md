# 09 · 后端服务

[← 返回索引](./README.md)

---

## 9.1 技术栈与入口

- **运行时**：Node.js，**ESM**（`type: module`）。
- **框架**：Express；**WebSocket**：Socket.IO（与 HTTP 同端口）。
- **数据库**：SQLite（**better-sqlite3**），用户与配置持久化。
- **入口**：[`nodejs/src/index.js`](../../nodejs/src/index.js) — 加载环境变量、打开数据库、注册路由、启动 `http.Server` + Socket.IO。

---

## 9.2 进程职责

| 职责 | 说明 |
|------|------|
| 用户鉴权 | 注册 / 登录，`bcrypt` 哈希密码，`JWT`（`Authorization: Bearer`） |
| 配置读写 | `GET/POST /api/config`，写入前经 `validateConfigForSave`（`common/gameCatalog.js`）校验 |
| 属性计算 | `GET /api/attrs`，`computeAttrsFromConfig`（`common/attrCalculator.js`），带配置快照缓存 |
| 管理接口 | `GET /api/admin/users`、`PATCH /api/admin/users/:id/password`（**无鉴权**，见 [12-admin.md](./12-admin.md)） |
| 大厅接口 | `GET /api/hall/users`，分页+搜索，与在线映射交叉返回用户列表（含主将转数/等级、在线状态） |
| 战局接口 | `GET /api/battle/current`，返回当前进行中战局与双方真实配置+属性快照 |
| 健康检查 | `GET /api/health` |
| 长连接骨架 | Socket.IO：`欢迎`、`ping`/`pong` |
| 在线映射 | 内存 `Map<userId, {socketId, 用户名}>`，`onlineMap.js` 维护；连接/断开广播 `online-change` |
| PK 挑战 | `pk-challenge`/`pk-request`/`pk-response`/`pk-result`/`pk-cancel` 事件；服务端转发并记录战局 |
| 战斗引擎 | `battleEngine` 负责回合动作结算、运行态（气血/精力/buff）持久、技能与物品效果应用；含回合开始 buff 触发与行动前动态速度重排 |

静态玩法表、规范化逻辑 **不要** 写在路由里，集中在 **`common/`**。

---

## 9.3 数据模型

### 用户

- **存储**：SQLite 表字段含 `用户名`、`密码哈希`、**`配置`（JSON 文本）**、`配置已认证`、`创建时间`、`最近登录时间` 等（以 `userRepo` / 迁移为准）。
- **配置**：与移动端同一 JSON 结构（中文 key），保存时服务端再校验。

### 战局（battles）

- **字段**：`id`、`发起用户名`、`目标用户名`、`状态`（等待中/战局中/失去连接/已结束）、`当前回合`、`发起时间`、`结束时间`。
- **生命周期**：发起 PK → 创建（等待中）→ 对方同意（战局中）→ 战斗结束（已结束）；对方拒绝或发起方取消/断线（等待中）→ 直接删除记录；若战局中双方均离线则状态置为 **失去连接** 并写入 `结束时间`。

---

## 9.4 安全与限流

- **`/api/*`**：全局 **express-rate-limit**（示例：每 IP 每分钟 200 次），可按环境调整。
- **CORS**：`origin: true`，`credentials: true`。
- **JWT_SECRET**：生产环境必须设为强随机；开发默认见 `env.js` 警告。
- **Socket.IO 鉴权**：`handshake.auth.token` 传入 JWT，失败则连接被拒。
- **管理端**：当前 **无登录**，仅适合可信网络或本地使用。

---

## 9.5 相关文档

- [10-http-api.md](./10-http-api.md)、[13-env-deploy.md](./13-env-deploy.md)、[08-battle-attrs.md](./08-battle-attrs.md)
