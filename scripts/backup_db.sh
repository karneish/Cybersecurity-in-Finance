#!/usr/bin/env bash
# Takes a pg_dump (custom format) backup of the cyberrisk database.
#
# Usage:
#   ./scripts/backup_db.sh                    # local pg_dump (default postgres/postgres@localhost:5432)
#   PG_CONTAINER=db ./scripts/backup_db.sh    # via docker exec into a container named "db"
#
# Env vars (all optional): PG_CONTAINER, PG_USER, PG_PASSWORD, PG_DATABASE,
#                          PGHOST, PGPORT, BACKUP_DIR, RETENTION_DAYS
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-database/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-postgres}"
PG_DATABASE="${PG_DATABASE:-cyberrisk}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d_%H%M%S)"
file="$BACKUP_DIR/cyberrisk_${stamp}.dump"

if [[ -n "${PG_CONTAINER:-}" ]]; then
  echo "Backing up via container '${PG_CONTAINER}' -> ${file}"
  docker exec -e PGPASSWORD="$PG_PASSWORD" "$PG_CONTAINER" \
    pg_dump -U "$PG_USER" -h localhost -d "$PG_DATABASE" -Fc -f /tmp/cyberrisk.dump
  docker cp "${PG_CONTAINER}:/tmp/cyberrisk.dump" "$file"
  docker exec "$PG_CONTAINER" rm -f /tmp/cyberrisk.dump
else
  echo "Backing up $PGHOST:$PGPORT/$PG_DATABASE -> ${file}"
  PGPASSWORD="$PG_PASSWORD" pg_dump -U "$PG_USER" -h "$PGHOST" -p "$PGPORT" \
    -d "$PG_DATABASE" -Fc -f "$file"
fi

echo "Backup size: $(du -h "$file" | cut -f1)"

# Retention: prune backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name 'cyberrisk_*.dump' -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true

echo "Done: $file"