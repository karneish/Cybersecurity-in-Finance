#!/usr/bin/env bash
#
# CyberRisk Quantifier — Render bootstrap (native Python runtime, no Docker).
#
# Render invokes this via render.yaml's `startCommand`, and it must stay in the
# foreground as PID 1's child — `exec supervisord` at the end is what keeps the
# service alive and lets Render route $PORT and poll /health.
#
#  1. Resolve the repo root, the Python interpreter and the supervisord
#     binaries from the live host (Render's native runtime has no fixed paths
#     like the old container image did).
#  2. Normalise DATABASE_URL (Render Postgres requires TLS).
#  3. Wait for PostgreSQL (Render may still be provisioning it on first deploy).
#  4. Wait for Redis (non-fatal — services reconnect with backoff).
#  5. Run migrations + seed (idempotent, safe on every boot).
#  6. Render the supervisord config into a runtime directory and check the
#     edge proxy imports, then exec supervisord.
#
set -euo pipefail

log()  { echo "[render] $*"; }
fatal() { echo "[render] FATAL: $*" >&2; exit 1; }

log "bootstrapping cyberrisk backend (native python runtime)"

# ── 1. Resolve host paths and binaries ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUNTIME_DIR="${REPO_ROOT}/.render"

cd "${REPO_ROOT}"

PORT="${PORT:-8080}"
export PORT
export PYTHONUNBUFFERED=1

PYTHON_BIN="$(command -v python3 || command -v python || true)"
[ -n "${PYTHON_BIN}" ] || fatal "no python interpreter on PATH"

SUPERVISORD_BIN="$(command -v supervisord || echo /usr/local/bin/supervisord)"

[ -x "${SUPERVISORD_BIN}" ] || fatal "supervisord not found (expected 'supervisord' on PATH); is it installed by render.yaml buildCommand?"

mkdir -p "${RUNTIME_DIR}"

log "repo root   : ${REPO_ROOT}"
log "runtime dir : ${RUNTIME_DIR}"
log "python      : ${PYTHON_BIN}"
log "supervisord : ${SUPERVISORD_BIN}"
log "public port : ${PORT}"

# Fail fast and loudly if the build step did not actually produce a usable
# environment — a missing package otherwise shows up as ten identical
# supervisord restart loops with no useful cause.
"${PYTHON_BIN}" - <<'PY' || fatal "python environment is incomplete (see traceback above)"
import sys
missing = []
for mod in ("uvicorn", "fastapi", "cybercommon", "psycopg2", "redis"):
    try:
        __import__(mod)
    except Exception as exc:  # noqa: BLE001
        missing.append(f"{mod} ({exc.__class__.__name__}: {exc})")
if missing:
    print("[render] missing imports: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)
print(f"[render] python {sys.version.split()[0]} imports OK", flush=True)
PY

# ── 2. PostgreSQL: require TLS (Render Postgres encrypts all connections) ──
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$("${PYTHON_BIN}" - <<'PY'
import os
url = os.environ.get("DATABASE_URL", "")
if "sslmode=" not in url:
    sep = "&" if "?" in url else "?"
    url = url + sep + "sslmode=require"
print(url)
PY
)"
  export DATABASE_URL
  log "DATABASE_URL normalised with sslmode=require"
else
  fatal "DATABASE_URL is not set"
fi

# ── 3. Wait for PostgreSQL ──
"${PYTHON_BIN}" - <<'PY'
import os
import sys
import time

import psycopg2

url = os.environ["DATABASE_URL"]
last = None
for _ in range(90):  # ~5 minutes
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

# ── 4. Wait for Redis (non-fatal) ──
"${PYTHON_BIN}" - <<'PY'
import os
import sys
import time

import redis

url = os.environ.get("REDIS_URL", "redis://localhost:6379")
last = None
for _ in range(90):  # ~3 minutes
    try:
        redis.Redis.from_url(url, socket_connect_timeout=3, socket_timeout=3).ping()
        print("[render] redis is reachable", flush=True)
        break
    except Exception as exc:  # noqa: BLE001
        last = exc
        time.sleep(2)
else:
    print(f"[render] WARNING: redis unreachable ({last}); continuing (services will retry)", file=sys.stderr, flush=True)
PY

# ── 5. Migrate + seed (idempotent) ──
log "running database migrations + seed"
"${PYTHON_BIN}" database/migrate_and_seed.py

# ── 6. Render the supervisord config ──
# No nginx config is generated any more: the public edge is
# deploy/render/edge_proxy.py, running inside serve_all.py. Render's native
# runtime has a read-only /var/lib/apt, so nginx could not be installed.
log "generating supervisord config"
sed -e "s|__REPO__|${REPO_ROOT}|g" \
    -e "s|__RUNTIME__|${RUNTIME_DIR}|g" \
    -e "s|__PYTHON__|${PYTHON_BIN}|g" \
    "${REPO_ROOT}/deploy/render/supervisord.conf.template" > "${RUNTIME_DIR}/supervisord.conf"

# Fail fast if the edge proxy cannot even be imported, rather than letting
# supervisord restart-loop with the traceback buried in the log.
"${PYTHON_BIN}" -c "import sys; sys.path.insert(0, '${REPO_ROOT}/deploy/render'); import edge_proxy" \
  || fatal "deploy/render/edge_proxy.py could not be imported (see traceback above)"

# ── 7. Start everything (foreground) ──
log "starting supervisord"
exec "${SUPERVISORD_BIN}" -c "${RUNTIME_DIR}/supervisord.conf"