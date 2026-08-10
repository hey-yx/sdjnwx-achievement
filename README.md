# 全人健康·全链协同·处方育人

卫生类高职院校健康教育体系的创新与实践 — 济南护理职业学院

<p align="center">
  <img src="public/screenshot.svg" alt="网站截图" width="800">
  <br>
  <sub>✨ 截图带有 SMIL 动画效果（边框绘制 + 光效扫描），需在浏览器中打开 SVG 查看</sub>
</p>

## 项目说明

本项目为济南护理职业学院教学成果奖申报展示网站，全面呈现「全人健康·全链协同·处方育人」健康教育体系的创新理念、实践成果与荣誉奖励。包含：

- 首页展示、成果申报书、成果报告、荣誉获奖等图文展示页面
- 成果视频页（自动播放、占位与降级处理）
- 获奖照片 / 申报附件 / PDF 弹窗预览
- 隐藏的访问统计后台（`/login` 登录后进入 `/stats`）

## 技术栈

- Vue 3 + Vue Router + Vite
- Express（Node 后端，提供埋点统计 API）
- SVG SMIL 动画
- 响应式布局

## 目录结构

```
├── src/                 # 前端源码
│   ├── views/           # HomeView / DocPage / LoginView / StatsView / NotFoundView
│   ├── router/          # 路由配置（含隐藏的 /login、/stats）
│   └── utils/tracker.js # 访问埋点上报 + UA 解析
├── server/              # Express 后端（独立 npm 包，独立进程）
│   ├── package.json     # 独立的依赖与 start/dev 脚本
│   ├── index.js         # track / login / stats / export 接口
│   ├── data/            # visits.json（访问记录，自动落盘）
│   └── .env.example     # 环境变量示例
├── public/              # 静态资源（图片、视频、PDF、二维码）
└── docs/                # 设计文档
```

## 本地开发

```bash
npm install
npm run dev        # 同时启动 Vite 前端 + Express API
```

- 前端默认端口：Vite 默认 `5173`
- 后端端口：`3000`（可在 `server/.env` 中通过 `PORT` 修改）
- 开发环境由 Vite 将 `/api` 代理到后端（见 `vite.config.js`）

后端可作为独立包单独运行：

```bash
cd server
npm install      # 安装独立依赖（server/node_modules）
npm start        # 或 npm run dev，仅启动 API
```

生产构建：

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览生产构建（同启前端 + API）
```

## 访问统计接口

前端统一通过同源相对路径 `/api/*` 请求，部署后需将 `/api` 反代到后端进程。

| 接口 | 方法 | 用途 | 鉴权 |
|---|---|---|---|
| `/api/track` | POST | 访问埋点上报 | 无 |
| `/api/login` | POST | 管理员登录，换取 token | 无 |
| `/api/stats` | GET | 统计数据（分页 / 日期范围筛选 / Top 榜） | Bearer token |
| `/api/export` | GET | 导出访问明细 CSV（跟随当前筛选条件） | Bearer token |

### 埋点数据字段

`/api/track` 采集以下字段（前端 `src/utils/tracker.js` 上报，后端落盘 `server/data/visits.json`）：

| 字段 | 说明 |
|---|---|
| `time` | 访问时间（UTC，服务端生成） |
| `ip` | 访问者 IP（取自 `x-forwarded-for` / `remoteAddress`） |
| `page` | 访问页面路径 |
| `device` | 设备类型：mobile / tablet / desktop |
| `os` | 操作系统 |
| `browser` | 浏览器（含微信内置浏览器识别） |
| `screen` | 屏幕分辨率 |
| `viewport` | 浏览器视口尺寸 |
| `lang` | 浏览器语言 |
| `network` | 网络类型（4g / wifi 等，无则空） |
| `timezone` | 用户时区 |
| `ua` | UserAgent 原始串 |

统计页时间展示、日期筛选与 CSV 导出统一按 `STATS_TZ`（默认 `Asia/Shanghai`）换算，与存储的 UTC 时间口径一致。

## 部署

线上由 Nginx 服务 `dist/` 静态文件，并将 `/api` 反代到 Node 后端（默认端口 `3000`）：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # 支持前端 history 路由
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 环境变量（`server/.env`）

从 `server/.env.example` 复制后按需修改：

```bash
# 管理密码（默认 sdjnwx20260809，强烈建议修改）
ADMIN_PASSWORD=change-me

# token 签名密钥（不设则每次启动随机生成，重启后旧 token 会失效）
# TOKEN_SECRET=change-me-too

# token 有效期（天），默认 15 天
# TOKEN_TTL_DAYS=15

# 服务端口
# PORT=3000

# 统计按哪个时区计算「今日」和日期筛选（默认 Asia/Shanghai）
# STATS_TZ=Asia/Shanghai
```

`server/data/`、`server/.env` 与 `server/node_modules/` 已加入 `.gitignore`，不会提交到版本库。
