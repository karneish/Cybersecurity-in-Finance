# syntax=docker/dockerfile:1
#
# CyberRisk Quantifier — unified backend image for Render.
#
# This image packages ALL ten Python microservices (api-gateway + 9 services)
# plus nginx (the single public entry point) into ONE deployable unit so a
# single Render Web Service exposes exactly the same API surface as the local
# `docker compose` stack:
#
#   https://<render-host>/api/*   → nginx → api-gateway  (JWT/rate-limit/route)
#   https://<render-host>/ws      → nginx → notification-service (STOMP)
#   https://<render-host>/health  → nginx → api-gateway  (Render health check)
#
# Each service runs under supervisord on its own fixed localhost port (see
# supervisord.conf). Only the shared `cybercommon` package is pip-installed;
# every service's `app` package is imported from its own working directory so
# the (intentionally identical across services) `app` top-level package name
# never collides.
#
FROM python:3.12-slim

ENV PIP_DEFAULT_TIMEOUT=300 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# System dependencies: nginx = public edge proxy, gcc/libpq-dev = wheels that
# occasionally compile from source (bcrypt/psycopg2), gettext-base = envsubst.
RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx \
      gcc \
      g++ \
      libpq-dev \
      curl \
      && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# ─── Shared package + union of every service's runtime dependencies ──────
COPY services/ ./services/

RUN pip install --no-cache-dir \
      ./services/common \
      "uvicorn[standard]>=0.27.0" \
      "httpx>=0.27.0" \
      "prometheus-client>=0.20.0" \
      "asyncpg>=0.29.0" \
      "numpy>=1.26.0" \
      "pandas>=2.2.0" \
      "scipy>=1.12.0" \
      "xgboost>=2.0.0" \
      "scikit-learn>=1.4.0" \
      "ortools>=9.8.0" \
      "openai>=1.12.0" \
      "supervisor>=4.2.5"

# The services/ tree stays in the image: each uvicorn imports its own `app`
# package from its service directory at runtime (--app-dir in supervisord.conf).

# ─── Migration / seed tooling + fixtures ────────────────────────────────
COPY database/ ./database/
COPY mock-data/ ./mock-data/

# ─── Runtime glue (nginx template, supervisord, bootstrap script) ────────
COPY deploy/render/nginx.conf.template /etc/nginx/nginx-render.template
COPY deploy/render/supervisord.conf /etc/supervisor/conf.d/cyberrisk.conf
COPY deploy/render/start.sh /opt/render/start.sh
RUN chmod +x /opt/render/start.sh \
    && mkdir -p /var/log/cyberrisk

# Service-to-service wiring — everything lives in this one container, so the
# gateway/engine/ai services talk to each other over localhost. Render's PORT
# is assigned to nginx at runtime (see start.sh).
ENV AUTH_SERVICE_URL=http://127.0.0.1:8081 \
    ASSET_SERVICE_URL=http://127.0.0.1:8082 \
    VULN_SERVICE_URL=http://127.0.0.1:8083 \
    CONTROL_SERVICE_URL=http://127.0.0.1:8084 \
    INGESTION_SERVICE_URL=http://127.0.0.1:8085 \
    NOTIFICATION_SERVICE_URL=http://127.0.0.1:8086 \
    RISK_ENGINE_URL=http://127.0.0.1:8090 \
    INVESTMENT_URL=http://127.0.0.1:8091 \
    AI_SERVICE_URL=http://127.0.0.1:8092

EXPOSE 8080

CMD ["/opt/render/start.sh"]