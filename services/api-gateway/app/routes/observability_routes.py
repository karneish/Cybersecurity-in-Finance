"""Gateway observability: Prometheus /metrics and a service docs index at /api-docs."""

import time
from typing import Awaitable, Callable

from fastapi import APIRouter
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import settings

router = APIRouter(tags=["observability"])

METRICS_REQUESTS = Counter(
    "gateway_http_requests_total",
    "Total HTTP requests handled by the gateway",
    ["target"],
)
METRICS_FAILURES = Counter(
    "gateway_upstream_failures_total",
    "Upstream HTTP failures (5xx / transport errors) per target",
    ["target"],
)
METRICS_IN_FLIGHT = Gauge("gateway_requests_in_flight", "HTTP requests currently in flight")
METRICS_LATENCY = Histogram(
    "gateway_request_duration_seconds",
    "HTTP request latency in seconds",
    ["target"],
)


def _target_for(path: str) -> str:
    from app.routes.gateway_routes import ROUTES, is_excluded

    if is_excluded(path) or path in ("/metrics", "/api-docs"):
        return "gateway"
    best, best_len = "unmatched", 0
    for prefix, _ in ROUTES:
        if path == prefix or path.startswith(prefix + "/"):
            if len(prefix) > best_len:
                best, best_len = prefix, len(prefix)
    return best


class MetricsMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        target = _target_for(scope.get("path", ""))
        start = time.perf_counter()
        path = scope.get("path", "")
        clear = path in ("/metrics", "/api-docs", "/health")
        if not clear:
            METRICS_IN_FLIGHT.inc()

        status: list[int] = [500]

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                status[0] = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            METRICS_FAILURES.labels(target=target).inc()
            raise
        finally:
            if not clear:
                METRICS_IN_FLIGHT.dec()
                METRICS_REQUESTS.labels(target=target).inc()
                if status[0] >= 500:
                    METRICS_FAILURES.labels(target=target).inc()
                METRICS_LATENCY.labels(target=target).observe(time.perf_counter() - start)


@router.get("/metrics", include_in_schema=False)
def metrics_endpoint() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@router.get("/api-docs", tags=["observability"])
def api_docs_index() -> list[dict]:
    from app.routes.gateway_routes import ROUTES

    services: list[dict] = []
    for prefix, base in sorted(ROUTES, key=lambda item: item[1]):
        base = base.rstrip("/")
        services.append(
            {
                "api": prefix,
                "service": base,
                "docs": f"{base}/docs",
                "openapi": f"{base}/openapi.json",
                "health": f"{base}/health",
            }
        )
    return services