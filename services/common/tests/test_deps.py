"""Tests for the hardened auth dependency chain (WS2).

Covers:
  * direct JWT bearer access (local dev / tests)
  * gateway-signed X-User-* headers (proxy fast path)
  * spoofed, unsigned X-User-Id headers are rejected
  * role guards deny and allow as configured
"""

from fastapi import Depends, FastAPI, status
from fastapi.testclient import TestClient

from cybercommon import jwt as jwt_service
from cybercommon.deps import UserIdentity, gateway_signature, get_current_user, require_roles

app = FastAPI()

ADMIN = "ADMIN"


@app.get("/me")
def me(user: UserIdentity = Depends(get_current_user)):
    return {"username": user.username, "roles": user.roles}


@app.get("/staff", dependencies=[Depends(require_roles("ANALYST", "CISO", "ADMIN"))])
def staff():
    return {"ok": True}


@app.get("/sovereign", dependencies=[Depends(require_roles("CISO", "ADMIN"))])
def sovereign():
    return {"ok": True}


client = TestClient(app)

ANALYST = jwt_service.create_access_token("alice", "ANALYST")
CISO = jwt_service.create_access_token("bob", "CISO")
VIEWER = jwt_service.create_access_token("carol", "VIEWER")


def _gateway_headers(user: str, roles: str) -> dict:
    return {
        "X-User-Id": user,
        "X-User-Roles": roles,
        "X-User-Sig": gateway_signature(user, roles),
    }


def test_no_auth_is_rejected():
    assert client.get("/me").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/staff").status_code == status.HTTP_401_UNAUTHORIZED


def test_bearer_token_is_accepted():
    resp = client.get("/me", headers={"Authorization": f"Bearer {ANALYST}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"
    assert resp.json()["roles"] == ["ANALYST"]


def test_bearer_role_gates():
    assert client.get("/staff", headers={"Authorization": f"Bearer {ANALYST}"}).status_code == 200
    assert client.get("/sovereign", headers={"Authorization": f"Bearer {ANALYST}"}).status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/sovereign", headers={"Authorization": f"Bearer {CISO}"}).status_code == 200
    assert client.get("/staff", headers={"Authorization": f"Bearer {VIEWER}"}).status_code == status.HTTP_403_FORBIDDEN


def test_signed_gateway_headers_accepted():
    assert client.get("/me", headers=_gateway_headers("alice", ADMIN)).status_code == 200
    assert client.get("/sovereign", headers=_gateway_headers("bob", "CISO,ADMIN")).status_code == 200


def test_unsigned_spoofed_header_rejected():
    resp = client.get("/me", headers={"X-User-Id": "admin", "X-User-Roles": ADMIN})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_bad_signature_rejected():
    resp = client.get(
        "/me",
        headers={"X-User-Id": "admin", "X-User-Roles": ADMIN, "X-User-Sig": "deadbeef"},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_signature_is_content_sensitive():
    assert gateway_signature("admin", "ADMIN") != gateway_signature("admin", "VIEWER")
    assert gateway_signature("admin", "ADMIN") != gateway_signature("admim", "ADMIN")