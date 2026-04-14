# 10 · HTTP API

[← 返回索引](./README.md)

---

约定：**JSON** 请求体与响应；字段名多为 **中文**（与配置结构一致）。除特别声明外，`Content-Type: application/json`。

---

## 10.1 健康检查

**`GET /api/health`**  

- **响应示例**：`{ "状态": "ok" }`

---

## 10.2 认证（无需 Bearer）

### 注册

**`POST /api/register`**

- **Body**：`{ "用户名": string, "密码": string }`
- **成功**：`{ "token": string, "用户名": string }`
- **错误**：`400` 校验失败；`409` 用户名已存在；`500` 注册失败

### 登录

**`POST /api/login`**

- **Body**：`{ "用户名": string, "密码": string }`
- **成功**：`{ "token": string, "用户名": string }`
- **错误**：`400` 校验失败；`401` 用户名或密码错误；`500` 登录失败

---

## 10.3 需登录的接口（`Authorization: Bearer <token>`）

中间件校验 JWT，失败返回 **401**。

### 读取配置

**`GET /api/config`**

- **成功**：`{ "配置": object, "配置已认证": boolean }`（空配置会补默认并规范化）
- **错误**：`404` 用户不存在；`500` 读取失败

### 保存配置

**`POST /api/config`**

- **Body**：`{ "配置": object }`
- **成功**：`{ "成功": true, "配置已认证": true }`
- **错误**：`400` 缺少配置或 `validateConfigForSave` 失败（`{ "错误": string }`）；`404` 用户不存在；`500` 保存失败

### 战斗属性

**`GET /api/attrs`**  
**`GET /api/attrs?debug=1`** 或 **`?debug=true`**

- **成功**：`{ "属性": object }`；调试时额外 `调试` 分层信息
- **错误**：`404` / `500` 同配置接口语义

---

## 10.4 管理端（当前无 Bearer 要求）

**`GET /api/admin/users`**

- **Query**：`page`（默认 1）、`pageSize`（默认 10，最大 100）、`keyword`（可选）、`login`（可选，`all` 等）
- **成功**：`{ "list": array, "total": number, "page": number, "pageSize": number }`

**`PATCH /api/admin/users/:id/password`**

- **Body**：`{ "新密码": string }`（校验规则同注册密码：长度与非法字符限制见 `validatePassword`）
- **成功**：`{ "成功": true }`
- **错误**：`400` 无效 id 或密码校验失败；`404` 用户不存在；`500` 修改失败

---

## 10.5 全局错误

未捕获异常：**`500`**，`{ "错误": "服务器错误" }`（见 `index.js` 错误处理中间件）。

---

## 10.6 相关文档

- [09-backend.md](./09-backend.md)、[11-mobile.md](./11-mobile.md)、[12-admin.md](./12-admin.md)
