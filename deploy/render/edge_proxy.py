"""Pure-Python public edge for the Render deployment — replaces nginx.

Why this exists
---------------
Render's *native* runtime has a read-only `/var/lib/apt`, so `apt-get install
nginx` in the build command fails:

    E: List directory /var/lib/apt/lists/partial is missing.
       - Acquire (30: Read-only file system)

nginx is the only genuinely system-level dependency in this project, so it is
replaced by this module: a small ASGI app that runs on the platform-assigned
`$PORT` and forwards to the services over loopback, exactly the routing the
old `nginx.conf.template` performed:

    /health, /actuator/health, /api/*, everything else  ->  api-gateway:18080
    /ws, /ws/*                                          ->  notification:8086

The ten microservices themselves bind 127.0.0.1 and are never reachable from
outside; only this edge listens on 0.0.0.0.

Design notes
------------
- HTTP responses are buffered, not streamed. The frontend uses no
  EventSource/SSE, and the only long-running endpoint is the gateway's own
  180s timeout, so buffering is sufficient and keeps the code small.
- The STOMP subprotocol is negotiated *upstream* and then echoed to the browser.
  notification-service picks from ("v12.stomp", "v11.stomp", "v10.stomp") via
  Sec-WebSocket-Protocol; if the proxy echoed the client's raw header instead of
  the negotiated value, @stomp/stompjs would reject the handshake.
- Content-Encoding and Content-Length are stripped from the response because
  httpx transparently decompresses; forwarding the original headers alongside a
  decompressed body would corrupt the client.
"""

from __future__ import annotations

import asyncio
import os
from typing import Iterable

import httpx
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route, WebSocketRoute
from starlette.websockets import WebSocket, WebSocketDisconnect

# Loopback ports served by serve_all.py.
GATEWAY_PORT = int(os.getenv("GATEWAY_PORT", "18080"))
NOTIFICATION_PORT = int(os.getenv("NOTIFICATION_PORT", "8086"))

GATEWAY_BASE = f"http://127.0.0.1:{GATEWAY_PORT}"
NOTIFICATION_WS = f"ws://127.0.0.1:{NOTIFICATION_PORT}"

# Generous: the gateway itself allows 180s for upstream calls, and the ortools
# optimiser plus the XGBoost forecast are the slow endpoints.
UPSTREAM_TIMEOUT = float(os.getenv("EDGE_TIMEOUT_SEC", "300"))

# Connection-scoped headers that must not be forwarded in either direction
# (RFC 9110 7.6.1). Host is dropped so httpx/websockets set the correct one.
_HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "host",
    }
)

# Stripped from the *response* only: the body we hand back is already decoded
# and already has a known length, so re-advertising either would break it.
_RESPONSE_STRIP = _HOP_BY_HOP | {"content-encoding", "content-length"}

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(UPSTREAM_TIMEOUT, connect=10.0),
            follow_redirects=False,
        )
    return _client


async def aclose() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _clean(request_headers: Iterable[tuple[str, str]], extra_drop: frozenset[str]) -> dict[str, str]:
    return {
        name: value
        for name, value in request_headers
        if name.lower() not in extra_drop
    }


def build_url(base: str, request: Request) -> str:
    url = base + request.url.path
    if request.url.query:
        url = f"{url}?{request.url.query}"
    return url


async def proxy_http(request: Request) -> Response:
    body = await request.body()
    headers = _clean(request.headers.items(), _HOP_BY_HOP)

    try:
        upstream = await get_client().request(
            request.method,
            build_url(GATEWAY_BASE, request),
            headers=headers,
            content=body or None,
        )
    except httpx.HTTPError as exc:
        return Response(
            content=f'{{"error":"Bad Gateway","message":"gateway unreachable: {exc}"}}',
            status_code=502,
            media_type="application/json",
        )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=_clean(upstream.headers.items(), _RESPONSE_STRIP),
    )


async def proxy_websocket(websocket: WebSocket) -> None:
    requested = _parse_subprotocols(websocket.headers.get("sec-websocket-protocol", ""))
    target = f"{NOTIFICATION_WS}/ws"

    # Connect upstream FIRST so the negotiated subprotocol is known before we
    # accept the browser's handshake — @stomp/stompjs validates the echo.
    try:
        from websockets.asyncio.client import connect as ws_connect
    except ImportError:  # pragma: no cover - older websockets
        from websockets import connect as ws_connect  # type: ignore[attr-defined]

    try:
        upstream_cm = ws_connect(target, subprotocols=requested or None, max_size=None)
        upstream = await upstream_cm.__aenter__()
    except Exception as exc:  # noqa: BLE001
        await websocket.close(code=1011)
        print(f"[edge] /ws upstream connect failed: {exc}", flush=True)
        return

    try:
        await websocket.accept(subprotocol=upstream.subprotocol)
        await asyncio.gather(
            _pump_client_to_upstream(websocket, upstream),
            _pump_upstream_to_client(websocket, upstream),
            return_exceptions=True,
        )
    finally:
        await upstream_cm.__aexit__(None, None, None)
        try:
            await websocket.close()
        except RuntimeError:
            pass


def _parse_subprotocols(header: str) -> list[str]:
    return [part.strip() for part in header.split(",") if part.strip()]


async def _pump_client_to_upstream(websocket: WebSocket, upstream) -> None:
    """Browser -> notification-service (STOMP frames arrive as text)."""
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                return
            text = message.get("text")
            if text is not None:
                await upstream.send(text)
            else:
                data = message.get("bytes")
                if data is not None:
                    await upstream.send(data)
    except (WebSocketDisconnect, asyncio.CancelledError):
        raise
    except Exception:  # noqa: BLE001
        return


async def _pump_upstream_to_client(websocket: WebSocket, upstream) -> None:
    """notification-service -> browser."""
    try:
        async for message in upstream:
            if isinstance(message, bytes):
                await websocket.send_bytes(message)
            else:
                await websocket.send_text(message)
    except (WebSocketDisconnect, asyncio.CancelledError):
        raise
    except Exception:  # noqa: BLE001
        return


def build_edge_app() -> Starlette:
    """Route table mirroring the old nginx.conf.template."""
    return Starlette(
        routes=[
            # Health probes, answered by the gateway.
            Route("/health", proxy_http, methods=["GET", "HEAD"]),
            Route("/actuator/health", proxy_http, methods=["GET", "HEAD"]),
            # STOMP broker. Exact match plus the trailing-slash form, because
            # the old nginx config declared both.
            WebSocketRoute("/ws", proxy_websocket),
            WebSocketRoute("/ws/{path:path}", proxy_websocket),
            # Everything else, including /api/*, falls through to the gateway,
            # which owns auth, rate limiting and service routing.
            Route("/{path:path}", proxy_http, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]),
        ],
    )


edge_app = build_edge_app()
