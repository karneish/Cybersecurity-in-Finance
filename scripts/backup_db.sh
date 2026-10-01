#!/usr/bin/env bash
#
# Takes a pg_dump (custom format) backup of the cyberrisk database.
#
# Runs against the local PostgreSQL instance that scripts/dev.sh uses. If
# PG_USER / PG_PASSWORD / PG_DATABASE are not exported, they are read from
# DATABASE_URL in the repo's .env file, so this script needs no arguments in the
# normal case.
#
# Env vars (all optional, all override .env):
#   PG_USER, PG_PASSWORD, PG_DATABASE, PGHOST, PGPORT, BACKUP_DIR, RETENTION_DAYS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${REPO_ROOT}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${REPO_ROOT}/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/database/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PG_USER="${PG_USER:-postgres}"
PG_DATABASE="${PG_DATABASE:-cyberrisk}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"

# Prefer explicit PG_PASSWORD; otherwise scrape it out of DATABASE_URL.
if [ -z "${PG_PASSWORD:-}" ]; then
  if printf '%s' "${DATABASE_URL:-}" | grep -qE '://[^:@/]+:[^@]+@'; then
    PG_PASSWORD="$(printf '%s' "$DATABASE_URL" | sed -E 's|.*://[^:@/]+:([^@]+)@.*|\1|')"
  else
    PG_PASSWORD="postgres"
  fi
fi

if [ -z "${PGHOST_OVERRIDDEN:-}" ]; then
  if printf '%s' "${DATABASE_URL:-}" | grep -qE '@[^:/]+:[0-9]+'; then
    url_host="$(printf '%s' "$DATABASE_URL" | sed -E 's|.*@([^:/]+):[0-9]+.*|\1|')"
    [ -n "${url_host}" ] && PGHOST="$url_host"
  fi
fi

command -v pg_dump >/dev/null 2>&1 \
  || { echo "ERROR: pg_dump not found on PATH. Install the PostgreSQL client tools." >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d_%H%M%S)"
file="$BACKUP_DIR/cyberrisk_${stamp}.dump"

echo "Backing up $PGHOST:$PGPORT/$PG_DATABASE -> $file"
PGPASSWORD="$PG_PASSWORD" pg_dump -U "$PG_USER" -h "$PGHOST" -p "$PGPORT" \
  -d "$PG_DATABASE" -Fc -f "$file"

echo "Backup size: $(du -h "$file" | cut -f1)"

# Retention: prune backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name 'cyberrisk_*.dump' -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true

echo "Done: $file"