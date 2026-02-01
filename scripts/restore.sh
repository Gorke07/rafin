#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────
DB_CONTAINER="${DB_CONTAINER:-rafin-db}"
DB_USER="${POSTGRES_USER:-rafin}"
DB_NAME="${POSTGRES_DB:-rafin}"

# ─── Argument check ────────────────────────────────────────────
if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/${DB_NAME}_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] ERROR: File not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "[restore] WARNING: This will DROP and recreate database '${DB_NAME}'"
read -rp "Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "[restore] Aborted"
  exit 0
fi

echo "[restore] Restoring from: ${BACKUP_FILE}"

if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$DB_NAME"
  docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$DB_NAME"
  gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" > /dev/null
elif command -v psql &>/dev/null; then
  dropdb -U "$DB_USER" --if-exists "$DB_NAME"
  createdb -U "$DB_USER" "$DB_NAME"
  gunzip -c "$BACKUP_FILE" | psql -U "$DB_USER" "$DB_NAME" > /dev/null
else
  echo "[restore] ERROR: Neither docker nor psql found" >&2
  exit 1
fi

echo "[restore] Database '${DB_NAME}' restored successfully"
