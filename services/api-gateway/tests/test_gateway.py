"""Smoke tests for the API gateway bootstrap, security headers, and observability routes.

Requires ``pip install -e ./services/common`` and runs from ``services/api-gateway``.
Does not exercise the full proxy path (which requires Redis + upstreams).
"""

import json

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app, raise_server_exceptions=False)


def test_health_returns_secure_headers():
    r = _client().get("/health")
    assert r.status_code == 200
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("content-security-policy") == "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    assert r.headers.get("referrer-policy") == "no-referrer"
    assert "max-age=31536000" in r.headers.get("strict-transport-security", "")
    assert r.headers.get("cache-control") == "no-store"
    assert r.headers.get("x-server") == "api-gateway"


def test_security_headers_present_on_404():
    r = _client().get("/does-not-exist")
    assert r.status_code in (404, 500)
    assert r.headers.get("x-content-type-options") == "nosniff"


def test_metrics_endpoint():
    r = _client().get("/metrics")
    assert r.status_code == 200
    assert b"gateway_http_requests_total" in r.content


def test_api_docs_index():
    r = _client().get("/api-docs")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["api"].startswith("/api")


# ─── circuit breaker regression ──────────────────────────────────

class _WrongType(Exception):
    pass


class _FakeRedis:
    """A tiny Redis-alike that reproduces WRONGTYPE on HDEL of a string key."""

    def __init__(self):
        self.store = {}

    def incr(self, key):
        self.store[key] = self.store.get(key, 0) + 1
        return self.store[key]

    def expire(self, key, sec):
        return 1

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, ex=None):
        self.store[key] = value
        return True

    def delete(self, key):
        return int(self.store.pop(key, None) is not None)

    def hdel(self, key, *fields):
        if key in self.store and not isinstance(self.store[key], dict):
            raise _WrongType("WRONGTYPE Operation against a key holding the wrong kind of value")
        value = self.store.pop(key, {})
        return len(fields)


def test_circuit_track_success_after_failure_clears_integer_counter(monkeypatch):
    import app.routes.gateway_routes as gr

    fake = _FakeRedis()
    monkeypatch.setattr(gr, "redis_client", lambda: fake)

    upstream = "http://risk-engine:8090"
    gr.circuit_track(upstream, ok=False)
    assert fake.store[f"{gr._cb_key(upstream)}:fail"] == 1

    # A success that follows a staged failure must not HDEL the integer counter
    # (that raises WRONGTYPE in Redis); it must DELETE it.
    gr.circuit_track(upstream, ok=True)
    assert f"{gr._cb_key(upstream)}:fail" not in fake.store


def test_circuit_track_trips_open_after_threshold(monkeypatch):
    import app.routes.gateway_routes as gr

    fake = _FakeRedis()
    monkeypatch.setattr(gr, "redis_client", lambda: fake)
    threshold = gr.CIRCUIT_FAILURE_THRESHOLD

    upstream = "http://vuln-service:8083"
    for _ in range(threshold):
        gr.circuit_track(upstream, ok=False)

    state = json.loads(fake.store[gr._cb_key(upstream)])
    assert "open_until" in state
    assert f"{gr._cb_key(upstream)}:fail" not in fake.store
    assert gr.circuit_open(upstream) is True


def test_is_excluded_exact_match_not_substring():
    import app.routes.gateway_routes as gr

    assert gr.is_excluded("/api/auth/login") is True
    assert gr.is_excluded("/api/auth/refresh") is True
    assert gr.is_excluded("/health") is True
    assert gr.is_excluded("/ws") is True

    # Health-check lives under /api/alerts and must NOT be treated as exempt —
    # it needs gateway identity headers to authenticate upstream.
    assert gr.is_excluded("/api/alerts/health-check") is False
    assert gr.is_excluded("/api/alerts/events") is False
    assert gr.is_excluded("/api/risk/health-check") is False