# 13 · 环境与部署

[← 返回索引](./README.md)

---

## 13.1 根目录 `.env`（与实现对齐）

由 [`nodejs/src/config/env.js`](../../nodejs/src/config/env.js) 与各子项目 `vite.config.js` 读取（Vite 使用 `loadEnv(mode, <repoRoot>)`）。

| 变量 | 作用 |
|------|------|
| `NODEJS_PORT` / `PORT` | Node HTTP 端口，默认 **3000** |
| `NODEJS_IP` | 前端代理目标 IP，默认 `127.0.0.1` |
| `NODEJS_PROTOCOL` | 生产构建注入后端的协议，默认 `http` |
| `SQLITE_PATH` | SQLite 文件路径；可相对仓库根；未设时默认 `data/huansan.sqlite` |
| `JWT_SECRET` | JWT 签名密钥；**生产必须**改为强随机 |
| `NODE_ENV` | `production` 时若 `JWT_SECRET` 仍为开发占位会打日志警告 |
| `VUE3_MOBILE_PORT` | Mobile 开发服务器端口，默认 **9001** |
| `VUE3_ADMIN_PORT` | Admin 开发服务器端口，默认 **9002**（见 `admin/vite.config.js`） |
| `VUE3_MOBILE_BASE` | Mobile `base` 路径，默认 `/` |

修改端口后需同时检查 **mobile / admin** 的 Vite 代理与 **Capacitor / 真机** 访问的后端地址（生产环境 `index.html` 占位符注入 `__BACKEND_URL_PLACEHOLDER__`）。

---

## 13.2 推荐本地启动顺序

1. 配置根目录 `.env`（至少确认 `JWT_SECRET`、`SQLITE_PATH` 如需自定义）。  
2. **`nodejs`**：`npm install`（首次）后启动服务，确保 `data/` 可写或已配置 `SQLITE_PATH`。  
3. **`mobile`**：`npm run dev`，浏览器访问 `VUE3_MOBILE_PORT`；API 经代理走 Node。  
4. **`admin`**（可选）：`npm run dev`，用于用户管理与改密。

---

## 13.3 构建与联调

- **Mobile**：`npm run build`，`dist` 供 Capacitor 打包或静态托管；生产环境请求后端 URL 由构建期注入。  
- **Admin**：`npm run build`。  
- **Node**：直接 `node` 或使用项目脚本启动；部署时保证进程可读写 SQLite 文件、环境变量已注入。

---

## 13.4 Android 调试网络

若使用 HTTP 明文访问局域网后端，需在 Android 侧配置 **网络安全策略**（仓库中已有 `network_security_config.xml` 示例时以当前 manifest 为准），避免 cleartext 被系统拦截。

---

## 13.5 相关文档

- [09-backend.md](./09-backend.md)、[11-mobile.md](./11-mobile.md)、[02-repo-layout.md](./02-repo-layout.md)
