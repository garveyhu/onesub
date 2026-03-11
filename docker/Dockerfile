# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies first
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --ignore-scripts

# Copy source code and build
COPY frontend/ ./
RUN yarn build

# ---- Stage 2: Build Backend & Final Image ----
FROM python:3.12-slim

# Install system dependencies, nginx & uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 curl ca-certificates nginx && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:${PATH}"
ENV PYTHONPATH="/app/backend/src:${PYTHONPATH}"

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default
# Remove the default symlink and recreate it to be safe
RUN rm -f /etc/nginx/sites-enabled/default && \
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Setup backend
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy backend source code files
COPY backend/alembic.ini ./
COPY backend/README.md ./
COPY backend/config/ ./config/
COPY backend/src/ ./src/
COPY backend/migrations/ ./migrations/

# Create a data directory for the SQLite volume
RUN mkdir -p data

# Copy frontend build from stage 1
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port 80 (Nginx will handle both static files and API proxy)
EXPOSE 80

CMD ["/app/entrypoint.sh"]
