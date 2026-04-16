# 12 · 管理后台

[← 返回索引](./README.md)

---

## 12.1 工程与构建

- **目录**：[`admin/`](../../admin/)，Vue 3 + Vite。
- **开发**：根目录 `.env` 中 `VUE3_ADMIN_PORT` 等；Vite 通过 `loadEnv` 读根目录环境变量，**开发态** 将 `/api` 代理到 Node（与 `NODEJS_IP` / `NODEJS_PORT` 一致）。
- **构建**：`npm run build`，产物在 `admin/dist`。

---

## 12.2 功能范围（V1）

- **用户列表**：分页、关键词筛选、登录状态筛选（与 `GET /api/admin/users` 查询参数对齐）。
- **改密**：对指定用户调用 `PATCH /api/admin/users/:id/password`。
- **战局管理**：查看所有 PK 战局，支持按状态筛选（等待中/战局中/已结束），战局中显示当前回合，已结束显示结束时间。已取消的战局不入库不展示（与 `GET /api/admin/battles` 对齐）。

---

## 12.3 安全说明（重要）

- 管理端请求 **当前不带独立鉴权**，后端 `/api/admin/*` **任意可达**即可操作。
- **不得**暴露到公网；仅本地或受信内网使用。若需外网运维，应在前置网关或应用层增加鉴权与 IP 限制。

---

## 12.4 相关文档

- [10-http-api.md](./10-http-api.md)、[09-backend.md](./09-backend.md)、[13-env-deploy.md](./13-env-deploy.md)
