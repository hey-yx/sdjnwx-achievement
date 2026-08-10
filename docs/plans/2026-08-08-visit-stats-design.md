# 访问统计页面设计方案

> 日期：2026-08-08
> 需求：新增统计页，展示页面访问次数 / IP / 用户设备基本信息，支持导出，UI 与主页风格一致。

## 架构

```
┌─────────────┐  POST /api/track   ┌─────────────────────┐
│ Vue 静态前端  │ ────────────────▶ │ Node 后端 (Express)  │──▶ data/visits.json
│ 埋点上报     │                    │ + 登录/统计/导出       │
└──────┬──────┘ ◀───────────────── └─────────────────────┘
       │   GET/POST /api/stats|export (token 鉴权)
       ▼
  /login 登录页 ──▶ /stats 统计页（隐藏路由，不进导航）
```

- 后端独立目录 `server/`，Node 进程运行；静态站不动。线上由 Nginx 将 `/api` 反代到后端端口。
- 根目录 `npm run dev` / `npm run preview` 用 `concurrently` 同时启动 vite 和 API（express 依赖放在根 `package.json`）。
- 存储：JSON 文件 `server/data/visits.json`，内存 + 防抖落盘，零依赖零配置。
- 配置：`server/.env`（自动加载，不覆盖已存在环境变量），`STATS_TZ` 控制统计时区（默认 Asia/Shanghai）。

## 数据采集

- `src/utils/tracker.js`：路由变化时上报 `POST /api/track`，前端解析设备/系统/浏览器，附带页面路径、来源、屏幕分辨率、UA 原始串。
- IP 由后端从请求头 `x-forwarded-for` / `remoteAddress` 获取。
- 记录字段：`time, ip, page, referrer, device, os, browser, screen, ua`。

## 鉴权

- `POST /api/login {password}` → 校验 `ADMIN_PASSWORD` 环境变量 → 返回 HMAC 签名 token（含过期时间，默认 24h）。
- 统计/导出接口需 `Authorization: Bearer <token>`，前端存 localStorage。

## 统计页 /stats

- 顶部卡片：总访问量 / 独立访客(IP去重) / 今日访问 / 页面数。
- 明细表格：时间、IP、设备、系统、浏览器、页面、屏幕、来源；按时间倒序，支持按页面/日期筛选 + 分页。
- 每页访问 Top 榜。
- 导出 CSV：`GET /api/export`，带 token，Excel/WPS 可直开。

## 文件清单

| 文件 | 说明 |
|---|---|
| `server/index.js` | Express：track/login/stats/export + token 中间件 + .env 加载 + 时区统计 |
| `server/.env.example` | 环境变量示例（ADMIN_PASSWORD / TOKEN_SECRET / PORT / STATS_TZ） |
| `src/utils/tracker.js` | 埋点上报 + UA 解析 |
| `src/App.vue` | 路由变化触发上报（排除 /login /stats） |
| `src/views/LoginView.vue` | 登录页 |
| `src/views/StatsView.vue` | 统计页 |
| `src/router/index.js` | 新增 /login、/stats |
| `vite.config.js` | dev 代理 /api → localhost:3000 |
| `package.json` | 根目录 `dev`/`preview` 用 concurrently 同启 vite + API |
| `.gitignore` | 忽略 server/data、server/.env |
