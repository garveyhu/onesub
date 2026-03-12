#!/bin/bash
uv sync
uv run alembic upgrade head
uv run python -m backend.scripts.init_admin
uv run python -m backend.app.main
