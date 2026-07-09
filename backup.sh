#!/bin/bash
# Daily pg_dump backup for eagle-amsterdam's self-hosted Supabase Postgres.
# Runs pg_dump inside the db container (no host port exposure needed).
set -euo pipefail

APP_DIR="/opt/apps/eagle-amsterdam"
BACKUP_DIR="/opt/backups/eagle-amsterdam"
RETENTION_DAYS=14
DB_CONTAINER="eagle-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

PGPASSWORD=$(grep '^POSTGRES_PASSWORD=' "$APP_DIR/supabase/.env" | cut -d= -f2-)

mkdir -p "$BACKUP_DIR"

docker exec -e PGPASSWORD="$PGPASSWORD" "$DB_CONTAINER" \
  pg_dump -U postgres -d postgres --format=custom \
  > "$BACKUP_DIR/eagle-amsterdam_${TIMESTAMP}.dump"

find "$BACKUP_DIR" -name "eagle-amsterdam_*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "$(date -Iseconds) backup OK: eagle-amsterdam_${TIMESTAMP}.dump"
