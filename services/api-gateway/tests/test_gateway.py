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