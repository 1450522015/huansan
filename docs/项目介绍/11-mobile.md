# 11 · 移动端（mobile）

[← 返回索引](./README.md)

---

## 11.1 功能范围（当前）

- **注册 / 登录**；本地保存 **token** 与 **用户名、密码**（用于下次自动尝试登录）。  
- **全局需登录**：除登录页外，无 token 则跳转登录；HTTP **401** 清 token 并回登录页。  
- **底栏**：主页、大厅、战局、频道、更多（退出登录等）；大厅 / 战局 / 频道当前为占位页。  
- **配置页**：按 `docs/当前任务.md` 与 [05](./05-gear-mount-gems-skills.md)、[14-main-hero](./14-main-hero.md)、[15-deputy](./15-deputy.md)、[17-mount](./17-mount.md)、[18-main-gear](./18-main-gear.md)、[19-talents](./19-talents.md) 等文档编辑；主将含 **帮派能力**（主/副抗性，见 [14-main-hero](./14-main-hero.md)）；装备加成展示为 **`解析装备格汇总`**；**副将** 配置区顺序与字段见副将文档；页底 **战斗属性** 由 `common/attrCalculator.js` 对**当前本地配置**即时计算（与后端校验逻辑同源）；主页 **保存 / 回退 / 导入** 才与后端交互，保存与导入在后端再次校验。  
- **Socket**：进入主壳后建立 Socket.IO 连接（为后续实时玩法预留）。

---

## 11.2 技术要点

- **路由**：Hash 模式（`createWebHashHistory`）。  
- **后端地址**：  
  - 开发：`vite.config.js` 从根 `.env` 读取 `NODEJS_*`，将 `/api`、`/socket.io` **代理**到 Node。  
  - 生产：`index.html` 注入 `window.__BACKEND_URL__`（Vite 插件替换占位符）。  
- **共享规则**：`import from '@common/gameCatalog.js'`（别名指向仓库 `common/`）。

---

## 11.3 环境变量（根 `.env`）

| 变量 | 作用 |
|------|------|
| `VUE3_MOBILE_PORT` | 本地 dev server 端口（默认 9001） |
| `VUE3_MOBILE_BASE` | 前端 `base` 路径 |
| `NODEJS_PROTOCOL` / `NODEJS_IP` / `NODEJS_PORT` | 代理目标 |

---

## 11.4 相关文档

- [04-config-schema.md](./04-config-schema.md)  
- [10-http-api.md](./10-http-api.md)  
- [13-env-deploy.md](./13-env-deploy.md)

