import json
import os
import time
import uuid

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from cybercommon import jwt as jwt_service
from cybercommon.redis import redis_client

from app.config import settings

router = APIRouter()

EXCLUDED_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/ws",
    "/actuator/health",
    "/health",
]

ROUTES = [
    ("/api/users", settings.auth_service_url),
    ("/api/auth", settings.auth_service_url),
    ("/api/assets", settings.asset_service_url),
    ("/api/vulnerabilities", settings.vulnerability_service_url),
    ("/api/controls", settings.control_service_url),
    ("/api/ingestion", settings.ingestion_service_url),
    ("/api/risk", settings.risk_engine_url),
    ("/api/investment", settings.investment_url),
    ("/api/ai", settings.ai_service_url),
]

RATE_LIMIT_PER_IP = int(os.getenv("RATE_LIMIT_PER_IP", "120"))
RATE_LIMIT_PER_USER = int(os.getenv("RATE_LIMIT_PER_USER", "300"))
RATE_LIMIT_WINDOW_SEC = int(os.getenv("RATE_LIMIT_WINDOW_SEC", "60"))

CIRCUIT_FAILURE_THRESHOLD = int(os.getenv("CIRCUIT_FAILURE_THRESHOLD", "5"))
CIRCUIT_RESET_SEC = int(os.getenv("CIRCUIT_RESET_SEC", "30"))

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def match_route(path: str) -> str | None:
    best = None
    best_len = 0
    for prefix, upstream in ROUTES:
        if path == prefix or path.startswith(prefix + "/"):
            if len(prefix) > best_len:
                best = upstream
                best_len = len(prefix)
    return best


def is_excluded(path: str) -> bool:
    return any(ex in path for ex in EXCLUDED_PATHS)


# ─── circuit breaker ───────────────────────────────────────────
def _cb_key(host: str) -> str:
    return f"gateway.circuit.{host}"


def circuit_open(host: str) -> bool:
    client = redis_client()
    raw = client.get(_cb_key(host))
    if not raw:
        return False
    try:
        state = json.loads(raw)
        return time.time() < state["open_until"]
    except Exception:
        return False


def circuit_track(host: str, ok: bool) -> None:
    client = redis_client()
    now = time.time()
    key = _cb_key(host)
    if ok:
        # Closed state: keep a small success marker, clear any staged failures.
        client.hdel(key + ":fail", "count")
        return
    failures = client.incr(key + ":fail")
    if failures == 1:
        client.expire(key + ":fail", CIRCUIT_RESET_SEC)
    if failures >= CIRCUIT_FAILURE_THRESHOLD:
        client.set(key, json.dumps({"open_until": now + CIRCUIT_RESET_SEC}), ex=CIRCUIT_RESET_SEC + 5)
        client.delete(key + ":fail")


# ─── rate limiting (sliding window via fixed-window counter) ───
def _rate_key(scope: str, ident: str) -> str:
    window = int(time.time()) // RATE_LIMIT_WINDOW_SEC
    return f"gateway.rl.{scope}:{ident}:{window}"


def _allowed(scope: str, ident: str, limit: int) -> bool:
    client = redis_client()
    key = _rate_key(scope, ident)
    current = client.incr(key)
    if current == 1:
        client.expire(key, RATE_LIMIT_WINDOW_SEC)
    return current <= limit


# ─── main proxy ────────────────────────────────────────────────
@router.api_route("/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def gateway_proxy(rest: str, request: Request):
    path = "/" + rest
    client_ip = request.client.host if request.client else "unknown"

    # Refresh tokens are always permitted through to auth.
    if is_excluded(path):
        upstream = match_route(path)
        if upstream is None:
            return JSONResponse(status_code=404, content={"error": "Not Found", "message": "No upstream for " + path, "status": 404})
        return await forward(upstream, path, request, identity=None)

    upstream = match_route(path)
    if upstream is None:
        return JSONResponse(status_code=404, content={"error": "Not Found", "message": "No upstream route for " + path, "status": 404})

    # JWT validation
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"error": "Unauthorized", "message": "Invalid or missing JWT token", "status": 401})
    token = auth_header[7:]
    try:
        claims = jwt_service.decode_token(token)
    except Exception as exc:
        return JSONResponse(status_code=401, content={"error": "Unauthorized", "message": f"Invalid or missing JWT token: {exc}", "status": 401})

    username = claims.get("sub", "")
    roles = claims.get("roles", "")

    # Rate limiting: per-IP then per-user
    if not _allowed("ip", client_ip, RATE_LIMIT_PER_IP):
        return JSONResponse(status_code=429, content={"error": "Too Many Requests", "message": "Rate limit exceeded (per IP)", "status": 429})
    if username and not _allowed("user", username, RATE_LIMIT_PER_USER):
        return JSONResponse(status_code=429, content={"error": "Too Many Requests", "message": "Rate limit exceeded (per user)", "status": 429})

    # Circuit breaker per upstream service
    if circuit_open(upstream):
        return JSONResponse(status_code=503, content={"error": "Service Unavailable", "message": f"Circuit open for {upstream}", "status": 503})

    response = await forward(
        upstream, path, request,
        identity={"X-User-Id": username, "X-User-Roles": roles},
    )
    circuit_track(upstream, ok=response.status_code < 500)
    return response


async def forward(upstream: str, path: str, request: Request, identity: dict | None) -> Response:
    client = get_client()
    url = upstream + path
    headers = {
        "Accept": request.headers.get("Accept", "application/json"),
        "Content-Type": request.headers.get("Content-Type", "application/json"),
        "X-Request-Id": request.headers.get("X-Request-Id", str(uuid.uuid4())),
    }
    if identity:
        headers.update(identity)

    body = await request.body()
    try:
        resp = await client.request(
            request.method,
            url,
            headers=headers,
            params=request.query_params,
            content=body or None,
        )
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=502, content={"error": "Bad Gateway", "message": f"Upstream unreachable: {exc}", "status": 502})

    content_type = resp.headers.get("content-type", "application/json")
    if "application/json" in content_type:
        try:
            data = resp.json()
            return JSONResponse(status_code=resp.status_code, content=data)
        except ValueError:
            return Response(content=resp.content, status_code=resp.status_code, media_type=content_type)
    return Response(content=resp.content, status_code=resp.status_code, media_type=content_type)