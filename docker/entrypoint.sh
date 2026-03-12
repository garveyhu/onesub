#!/bin/bash
set -e

# Run backend migrations and seed data
cd /app/backend
uv run alembic upgrade head
uv run python -m backend.scripts.init_admin

# Start FastAPI backend in the background
# We bind to 127.0.0.1 since Nginx will proxy to it locally
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --proxy-headers &

# Start Nginx in the foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"
