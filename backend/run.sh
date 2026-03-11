#!/bin/bash
uv sync
uv run alembic upgrade head
uv run python seed.py
uv run python -m backend.app.main
