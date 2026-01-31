#!/bin/sh
set -e

# Start API in background (cwd must be apps/api for relative paths)
cd /app/apps/api && bun run dist/index.js &
API_PID=$!

# Start Web
cd /app && bun run apps/web/server.js &
WEB_PID=$!

# If either process exits, stop both
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM

wait -n
kill $API_PID $WEB_PID 2>/dev/null
exit 1
