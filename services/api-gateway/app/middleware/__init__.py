"""ASGI middleware adding hardened security headers to every response."""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

_HEADERS: list[tuple[bytes, bytes]] = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (
        b"content-security-policy",
        b"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    ),
    (b"referrer-policy", b"no-referrer"),
    (
        b"permissions-policy",
        b"geolocation=(), microphone=(), camera=(), payment=(), usb=()",
    ),
    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    (b"cross-origin-opener-policy", b"same-origin"),
    (b"cache-control", b"no-store"),
]

_HEADER_NAMES = {name for name, _ in _HEADERS}


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, server_name: str = "api-gateway") -> None:
        self.app = app
        self.server_name = server_name

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        server_header = (b"x-server", self.server_name.encode())

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.get("headers") or []
                headers = [
                    item
                    for item in headers
                    if item[0].lower() not in _HEADER_NAMES and item[0].lower() != b"x-server"
                ]
                message["headers"] = headers + [server_header] + _HEADERS
            await send(message)

        await self.app(scope, receive, send_with_headers)