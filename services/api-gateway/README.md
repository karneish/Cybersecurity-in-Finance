# api-gateway

Reverse proxy, JWT validator, rate limiter, and circuit breaker — all requests
to backend services flow through here.

**Port:** 8080  
**Stack:** FastAPI + httpx + Redis (rate limit state)

## Responsibilities

- **JWT validation:** every request (except login/register/refresh and health) must carry a valid `Authorization: Bearer <token>` header
- **Rate limiting:** Redis sliding window — 120 req/min per IP, 300 req/min per authenticated user
- **Circuit breaker:** per upstream service; opens after ≥5 consecutive 5xx, auto-resets after 30 s
- **Header injection:** `X-User-Id`, `X-User-Roles`, `X-User-Role` added so downstream services trust the gateway
- **Admin gating:** `/api/risk/national/*` endpoints require ADMIN role at the gateway level

## Route table

| Prefix | Upstream |
|---|---|
| `/api/auth/`, `/api/users/` | auth-service:8081 |
| `/api/assets/` | asset-service:8082 |
| `/api/vulnerabilities/`, `/api/findings/` | vulnerability-service:8083 |
| `/api/controls/` | control-service:8084 |
| `/api/ingestion/` | ingestion-service:8085 |
| `/api/risk/` | risk-engine:8090 |
| `/api/investment/` | investment-optimizer:8091 |
| `/api/ai/` | ai-service:8092 |

## Running locally

```bash
cd services/api-gateway
pip install -e ../common
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Swagger docs at `http://localhost:8080/docs`.