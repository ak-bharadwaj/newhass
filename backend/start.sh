#!/bin/sh
set -e

# Run database migrations (handle multiple branches)
alembic upgrade heads

# Start the application server
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers ${WORKERS:-12} \
  --loop uvloop \
  --limit-concurrency 2000 \
  --backlog 8192 \
  --timeout-keep-alive 10 \
  --log-level warning
