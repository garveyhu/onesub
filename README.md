# OneSub

AI 代充订阅服务平台，为互联网用户提供 Claude、ChatGPT 等 AI 服务的便捷订阅。

## 技术栈

- 前端: React 19 + Vite + TypeScript + Antd + Tailwind CSS
- 后端: FastAPI + SQLAlchemy + Alembic + SQLite

## 目录结构

```
OneSub/
├── frontend/    React 前端
└── backend/     FastAPI 后端
```

## 本地启动

**前端**
```bash
cd frontend
yarn dev
```

**后端**
```bash
cd backend
./run.sh
```

## 核心功能

- 🏠 首页/落地页 — 服务介绍、套餐展示
- 🔐 用户登录/注册 — JWT 认证
- 📦 服务套餐展示 — Claude Pro、ChatGPT Plus 等
- 🛒 订单管理 — 创建订单、查看状态
- 💳 支付流程 — 支付宝对接
- 👤 个人中心 — 账号信息、订阅状态
- 🛠️ 管理后台 — 管理用户、套餐、订单
