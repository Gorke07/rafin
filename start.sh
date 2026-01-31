#!/bin/sh
set -e

echo "[rafin] Initializing database..."

# Parse DATABASE_URL to extract components
# Format: postgresql://user:pass@host:port/dbname
DB_URL="$DATABASE_URL"
DB_USER=$(echo "$DB_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Wait for PostgreSQL to be ready
echo "[rafin] Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if bun -e "const c = require('postgres')('postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/postgres'); c\`SELECT 1\`.then(() => { c.end(); process.exit(0) }).catch(() => { c.end(); process.exit(1) })" 2>/dev/null; then
    echo "[rafin] PostgreSQL is ready"
    break
  fi
  RETRY=$((RETRY + 1))
  echo "[rafin] PostgreSQL not ready, retrying ($RETRY/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "[rafin] ERROR: Could not connect to PostgreSQL after $MAX_RETRIES attempts"
  exit 1
fi

# Create database if it doesn't exist
echo "[rafin] Ensuring database '$DB_NAME' exists..."
bun -e "
const postgres = require('postgres');
const sql = postgres('postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/postgres');
sql.unsafe(\"SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'\").then(async (rows) => {
  if (rows.length === 0) {
    console.log('[rafin] Creating database ${DB_NAME}...');
    await sql.unsafe('CREATE DATABASE \"${DB_NAME}\"');
    console.log('[rafin] Database created');
  } else {
    console.log('[rafin] Database ${DB_NAME} already exists');
  }
  await sql.end();
  process.exit(0);
}).catch(async (err) => {
  console.error('[rafin] Database check failed:', err.message);
  await sql.end();
  process.exit(1);
});
"

# Run migrations (push schema to database)
echo "[rafin] Pushing database schema..."
cd /app && bunx drizzle-kit push --force --config=packages/db/drizzle.config.ts
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
