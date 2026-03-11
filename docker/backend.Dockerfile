FROM python:3.12-slim

# Install system dependencies & uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 curl ca-certificates && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:${PATH}"
ENV PYTHONPATH="/app/backend/src:${PYTHONPATH}"

WORKDIR /app/backend

# Leverage Docker cache by copying dependencies first
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy project files
COPY backend/alembic.ini ./
COPY backend/main.py ./
COPY backend/seed.py ./
COPY backend/src/ ./src/
COPY backend/migrations/ ./migrations/

# Create a data directory for the SQLite volume
RUN mkdir -p data

EXPOSE 8000

# Start script: run migrations, seed data, and start uvicorn
CMD uv run alembic upgrade head && \
    uv run python seed.py && \
    uv run uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers
