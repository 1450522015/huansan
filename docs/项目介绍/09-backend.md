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
| 健康检查 | `GET /api/health` |
| 长连接骨架 | Socket.IO：`欢迎`、`ping`/`pong` |

静态玩法表、规范化逻辑 **不要** 写在路由里，集中在 **`common/`**。

---

## 9.3 数据模型（用户）

- **存储**：SQLite 表字段含 `用户名`、`密码哈希`、**`配置`（JSON 文本）**、`配置已认证`、`创建时间`、`最近登录时间` 等（以 `userRepo` / 迁移为准）。
- **配置**：与移动端同一 JSON 结构（中文 key），保存时服务端再校验。

---

## 9.4 安全与限流

- **`/api/*`**：全局 **express-rate-limit**（示例：每 IP 每分钟 200 次），可按环境调整。
- **CORS**：`origin: true`，`credentials: true`。
- **JWT_SECRET**：生产环境必须设为强随机；开发默认见 `env.js` 警告。
- **管理端**：当前 **无登录**，仅适合可信网络或本地使用。

---

## 9.5 相关文档

- [10-http-api.md](./10-http-api.md)、[13-env-deploy.md](./13-env-deploy.md)、[08-battle-attrs.md](./08-battle-attrs.md)
