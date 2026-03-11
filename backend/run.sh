#!/bin/bash
uv sync
uv run alembic upgrade head
uv run python -m backend.app.main
