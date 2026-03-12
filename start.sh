#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
BACKEND_DIR="${PROJECT_DIR}/backend"

echo "🚀 OneSub 一键启动"
echo "================================"

# 启动后端
echo "📦 启动后端服务 ..."
cd "$BACKEND_DIR"
uv sync
uv run alembic upgrade head
uv run python -m backend.scripts.init_admin
uv run python -m backend.app.main &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 启动前端
echo "🎨 启动前端服务 ..."
cd "$FRONTEND_DIR"
yarn dev &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"

# 等待前端 Vite 启动
sleep 3

# 打开浏览器
echo "🌐 打开浏览器 ..."
open "http://localhost:5173"

echo ""
echo "================================"
echo "✅ 全部启动完成！"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C 停止所有进程
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# 等待子进程
wait
