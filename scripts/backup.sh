#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-rafin-db}"
DB_USER="${POSTGRES_USER:-rafin}"
DB_NAME="${POSTGRES_DB:-rafin}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ─── Setup ──────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup of database '${DB_NAME}' at $(date -Iseconds)"

# ─── Backup ─────────────────────────────────────────────────────
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  # Docker environment: dump from container
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
elif command -v pg_dump &>/dev/null; then
  # Local PostgreSQL: use pg_dump directly (uses DATABASE_URL or pg env vars)
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  echo "[backup] ERROR: Neither docker nor pg_dump found" >&2
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[backup] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ─── Rotation ───────────────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[backup] Removed ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

echo "[backup] Done. Total backups: $(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)"
