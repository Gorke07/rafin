#!/bin/sh
set -e

echo "[rafin] Initializing database..."
bun run /app/packages/db/src/ensure-database.ts

echo "[rafin] Pushing database schema..."
cd /app/packages/db && bunx drizzle-kit push --force
echo "[rafin] Database schema is up to date"

# Start API in background (cwd must be apps/api for relative paths)
echo "[rafin] Starting API..."
cd /app/apps/api && bun run dist/index.js &
API_PID=$!

# Start Web
echo "[rafin] Starting Web..."
cd /app && bun run apps/web/server.js &
WEB_PID=$!

echo "[rafin] All services started"

# If either process exits, stop both
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM

wait -n
kill $API_PID $WEB_PID 2>/dev/null
exit 1
