#!/usr/bin/env bash
#
# CyberRisk Quantifier — Render bootstrap.
#
# 1. Normalise DATABASE_URL (Render Postgres requires TLS).
# 2. Wait for PostgreSQL (Render may still be provisioning it on first deploy).
# 3. Wait for Redis (non-fatal — services reconnect with backoff).
# 4. Run migrations + seed (idempotent, safe on every boot).
# 5. Render the nginx config on the platform-assigned $PORT.
# 6. Launch all ten processes under supervisord (foreground).
#
set -euo pipefail

echo "[render] bootstrapping cyberrisk backend"
PORT="${PORT:-8080}"
export PORT

# ── 1. PostgreSQL: require TLS (Render Postgres encrypts all connections) ──
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(python - <<'PY'
import os
url = os.environ.get("DATABASE_URL", "")
if "sslmode=" not in url:
    sep = "&" if "?" in url else "?"
    url = url + sep + "sslmode=require"
print(url)
PY
)"
  export DATABASE_URL
  echo "[render] DATABASE_URL normalised with sslmode=require"
else
  echo "[render] FATAL: DATABASE_URL is not set" >&2
  exit 1
fi

# ── 2. Wait for PostgreSQL ──
python - <<'PY'
import os
import sys
import time

import psycopg2

url = os.environ["DATABASE_URL"]
last = None
for attempt in range(90):  # ~5 minutes
    try:
        conn = psycopg2.connect(url, connect_timeout=5)
        conn.close()
        print("[render] postgres is reachable", flush=True)
        break
    except Exception as exc:  # noqa: BLE001
        last = exc
        time.sleep(2)
else:
    print(f"[render] FATAL: could not reach postgres: {last}", file=sys.stderr, flush=True)
    sys.exit(1)
PY

# ── 3. Wait for Redis (non-fatal) ──
python - <<'PY'
import os
import sys
import time

import redis

url = os.environ.get("REDIS_URL", "redis://localhost:6379")
last = None
for attempt in range(90):  # ~3 minutes
    try:
        client = redis.Redis.from_url(url, socket_connect_timeout=3, socket_timeout=3)
        client.ping()
        print("[render] redis is reachable", flush=True)
        break
    except Exception as exc:  # noqa: BLE001
        last = exc
        time.sleep(2)
else:
    print(f"[render] WARNING: redis unreachable ({last}); continuing (services will retry)", file=sys.stderr, flush=True)
PY

# ── 4. Migrate + seed (idempotent) ──
echo "[render] running database migrations + seed"
cd /repo
python database/migrate_and_seed.py

# ── 5. Render nginx config on the platform-assigned port ──
echo "[render] generating nginx config (port ${PORT})"
sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx-render.template > /etc/nginx/nginx.conf

# ── 6. Start everything (foreground) ──
echo "[render] starting supervisord"
exec /usr/local/bin/supervisord -n -c /etc/supervisor/conf.d/cyberrisk.conf