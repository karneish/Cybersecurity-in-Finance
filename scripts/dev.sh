#!/usr/bin/env bash
#
# CyberRisk Quantifier — native local dev stack (no Docker).
#
# Replaces `docker compose up`. Runs the same ten uvicorn processes plus the
# Vite dev server directly on this machine, on the exact ports .env.example
# documents:
#
#   auth-service 8081 · asset-service 8082 · vulnerability-service 8083
#   control-service 8084 · ingestion-service 8085 · notification-service 8086
#   risk-engine 8090 · investment-optimizer 8091 · ai-service 8092
#   api-gateway 8080 (public) · frontend 3000
#
# PostgreSQL and Redis must already be running locally; the script checks and
# tells you if they are not.
#
# Usage: scripts/dev.sh [--no-frontend] [--skip-install]
#        scripts/dev.sh --stop
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_DIR="${REPO_ROOT}/.dev"
LOG_DIR="${STATE_DIR}/logs"
PID_FILE="${STATE_DIR}/pids"
FRONTEND_PORT=3000

SKIP_INSTALL=0
START_FRONTEND=1
STOP_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --stop)          STOP_ONLY=1 ;;
    --no-frontend)   START_FRONTEND=0 ;;
    --skip-install)  SKIP_INSTALL=1 ;;
    -h|--help)       sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

log()  { echo "==> $*"; }
ok()   { echo "    $*"; }
warn() { echo "    $*" >&2; }
die()  { echo "ERROR: $*" >&2; exit 1; }

mkdir -p "${LOG_DIR}"
cd "${REPO_ROOT}"

# ─── stop ────────────────────────────────────────────────────────────────
stop_stack() {
  if [ ! -f "${PID_FILE}" ]; then
    warn "Nothing to stop (no .dev/pids)."
    return
  fi
  log "Stopping stack"
  # shellcheck disable=SC2016
  while read -r name pid; do
    [ -n "${pid}" ] || continue
    if kill -0 "${pid}" 2>/dev/null; then
      # Negative pid targets the whole process group (uvicorn + vite children).
      kill -TERM "-${pid}" 2>/dev/null || kill -TERM "${pid}" 2>/dev/null || true
      ok "stopped ${name} (pid ${pid})"
    fi
  done < "${PID_FILE}"
  rm -f "${PID_FILE}"
  ok "stack stopped"
}

if [ "${STOP_ONLY}" -eq 1 ]; then
  stop_stack
  exit 0
fi

# Anything left from a crashed run would hold the ports.
if [ -f "${PID_FILE}" ]; then
  log "Found processes from a previous run"
  stop_stack
fi

# ─── load .env ───────────────────────────────────────────────────────────
if [ -f "${REPO_ROOT}/.env" ]; then
  # VITE_* are Vercel BUILD-TIME variables and must NOT reach the Vite dev
  # server. Vite reads them out of the environment, so exporting one silently
  # overrides the client.ts `|| '/api'` fallback and every request 404s at the
  # gateway. Locally the Vite proxy maps /api -> :8080 and /ws -> :8086.
  set -a
  # shellcheck disable=SC1091
  . <(grep -vE '^[[:space:]]*(export[[:space:]]+)?VITE_' "${REPO_ROOT}/.env")
  set +a
  if grep -qE '^[[:space:]]*(export[[:space:]]+)?VITE_' "${REPO_ROOT}/.env"; then
    warn "ignoring VITE_* in .env (Vercel-only; local dev uses the Vite proxy)"
  fi
  ok "loaded .env"
else
  warn "No .env found — using defaults. Copy .env.example to .env."
fi

# ─── preflight ───────────────────────────────────────────────────────────
log "Checking prerequisites"

PYTHON_BIN="$(command -v python3 || command -v python || true)"
[ -n "${PYTHON_BIN}" ] || die "Python not found on PATH. Install Python 3.12+."

py_version="$("${PYTHON_BIN}" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
ok "python ${py_version} (${PYTHON_BIN})"
case "${py_version}" in
  3.1[0-9]|3.[1-9]) die "Python 3.12+ required (found ${py_version})." ;;
esac

port_open() { "${PYTHON_BIN}" -c "
import socket, sys
s = socket.socket()
s.settimeout(1.5)
sys.exit(0 if s.connect_ex(('127.0.0.1', int(sys.argv[1]))) == 0 else 1)
" "$1"; }

# Redis is strongly recommended but not fatal: the gateway's rate limiter and
# circuit breaker fail open, so the stack stays usable. What degrades is live
# event delivery over /ws.
degraded=()
redis_port=6379
case "${REDIS_URL:-}" in *:*) redis_port="${REDIS_URL##*:}" ;; esac
redis_port="${redis_port%%/*}"
if port_open "${redis_port}"; then
  ok "redis reachable on ${redis_port}"
else
  degraded+=("redis")
  warn "Redis is NOT reachable on ${redis_port}."
  warn "  The stack will still start, but live /ws updates will never arrive and"
  warn "  POST /api/ingestion/events will 500. Install Redis, or point REDIS_URL"
  warn "  at a hosted instance in .env, then restart."
fi

pg_port=5432
if printf '%s' "${DATABASE_URL:-}" | grep -q '@[^:/]*:[0-9]\+'; then
  pg_port="$(printf '%s' "${DATABASE_URL}" | sed -E 's|.*@[^:/]*:([0-9]+).*|\1|')"
fi
port_open "${pg_port}" \
  && ok "postgres reachable on ${pg_port}" \
  || die "PostgreSQL is not reachable on ${pg_port}. Start it, or point DATABASE_URL elsewhere in .env"

# ─── dependencies ────────────────────────────────────────────────────────
if [ "${SKIP_INSTALL}" -eq 0 ]; then
  log "Installing Python dependencies"
  "${PYTHON_BIN}" -m pip install --quiet --upgrade pip
  "${PYTHON_BIN}" -m pip install --quiet -r "${REPO_ROOT}/requirements.txt"
  "${PYTHON_BIN}" -m pip install --quiet "${REPO_ROOT}/services/common"
  ok "dependencies installed"
fi

"${PYTHON_BIN}" -c 'import uvicorn, fastapi, cybercommon, psycopg2, redis' 2>/dev/null \
  || die "Required packages are missing. Re-run without --skip-install."

# ─── migrations ──────────────────────────────────────────────────────────
log "Running database migrations + seed"
"${PYTHON_BIN}" "${REPO_ROOT}/database/migrate_and_seed.py" \
  || die "database/migrate_and_seed.py failed — see the traceback above."
ok "database ready"

# ─── launch ──────────────────────────────────────────────────────────────
# api-gateway is last so the upstreams answer before traffic is routed.
# Each entry is "service-dir:package:port". The packages are uniquely named
# (they used to all be `app`) so that ten services can share one interpreter in
# deploy/render/serve_all.py without colliding -- see deploy/tools/rename_package.py.
SERVICES=(
  "auth-service:authapp:8081"
  "asset-service:assetapp:8082"
  "vulnerability-service:vulnapp:8083"
  "control-service:controlapp:8084"
  "ingestion-service:ingestapp:8085"
  "notification-service:notifyapp:8086"
  "risk-engine:riskapp:8090"
  "investment-optimizer:investapp:8091"
  "ai-service:aiapp:8092"
  "api-gateway:gwapp:8080"
)

: > "${PID_FILE}"

log "Starting backend services"
for entry in "${SERVICES[@]}"; do
  name="$(printf '%s' "$entry" | cut -d: -f1)"
  pkg="$(printf '%s' "$entry" | cut -d: -f2)"
  port="$(printf '%s' "$entry" | cut -d: -f3)"
  # setsid puts each service in its own process group so stop_stack can signal
  # the whole group (uvicorn's reloader/workers included).
  setsid "${PYTHON_BIN}" -m uvicorn "${pkg}.main:app" \
    --host 127.0.0.1 --port "${port}" \
    --app-dir "services/${name}" --log-level info \
    > "${LOG_DIR}/${name}.log" 2>&1 &
  pid=$!
  echo "${name} ${pid}" >> "${PID_FILE}"
  ok "${name} -> 127.0.0.1:${port} (pid ${pid})"
done

# PID_FILE already holds the backend PIDs at this point (written before the
# frontend launches), so a frontend failure can't orphan the ten services.
if [ "${START_FRONTEND}" -eq 1 ]; then
  if command -v npm >/dev/null 2>&1; then
    log "Starting Vite dev server"
    cd "${REPO_ROOT}/frontend"
    setsid npm run dev > "${LOG_DIR}/frontend.log" 2>&1 &
    echo "frontend $!" >> "${PID_FILE}"
    ok "frontend -> http://localhost:${FRONTEND_PORT} (pid $!)"
    cd "${REPO_ROOT}"
  else
    warn "npm not found on PATH - skipping the frontend. Backend is still running."
  fi
fi

on_exit() {
  echo
  stop_stack
  exit 0
}
trap on_exit INT TERM

# ─── wait for health ─────────────────────────────────────────────────────
log "Waiting for services to report healthy"
unhealthy=()
for entry in "${SERVICES[@]}"; do
  name="$(printf '%s' "$entry" | cut -d: -f1)"
  port="$(printf '%s' "$entry" | cut -d: -f3)"
  if port_open "${port}" && curl -fsS --max-time 3 "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    ok "${name} healthy"
  else
    warn "${name} did not report healthy — see .dev/logs/${name}.log"
    unhealthy+=("${name}")
  fi
done

echo
echo "  Stack is up." >&2
echo "    API      http://localhost:8080/api" >&2
echo "    Docs     http://localhost:8080/docs" >&2
echo "    Health   http://localhost:8080/health" >&2
[ "${START_FRONTEND}" -eq 1 ] && echo "    Frontend http://localhost:${FRONTEND_PORT}" >&2
echo "    Logs     ${LOG_DIR}" >&2
echo
echo "  Press Ctrl+C to stop." >&2
echo

if [ "${#unhealthy[@]}" -gt 0 ]; then
  warn "Not healthy: ${unhealthy[*]}"
fi

if [ "${#degraded[@]}" -gt 0 ]; then
  warn "Degraded (missing: ${degraded[*]}) - see the warnings above."
fi

# ─── supervise: exit as soon as any process dies ─────────────────────────
while true; do
  sleep 3
  dead=()
  while read -r name pid; do
    [ -n "${pid}" ] || continue
    kill -0 "${pid}" 2>/dev/null || dead+=("${name}")
  done < "${PID_FILE}"
  if [ "${#dead[@]}" -gt 0 ]; then
    warn "process(es) exited: ${dead[*]} — stopping the rest"
    break
  fi
done

stop_stack