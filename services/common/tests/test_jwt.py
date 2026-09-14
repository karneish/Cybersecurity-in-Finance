"""Unit tests for cybercommon.jwt — HS256 access/refresh token creation & validation."""

import pytest

from cybercommon import jwt as jwt_service
from cybercommon.config import settings


def test_create_access_token_roundtrip():
    token = jwt_service.create_access_token("admin", "ADMIN")
    claims = jwt_service.decode_token(token)
    assert claims["sub"] == "admin"
    assert claims["role"] == "ADMIN"
    assert claims["roles"] == "ADMIN"
    assert claims["exp"] > claims["iat"]


def test_refresh_token_has_longer_expiry():
    access = jwt_service.create_access_token("ciso", "CISO")
    refresh = jwt_service.create_refresh_token("ciso", "CISO")
    acc = jwt_service.decode_token(access)
    ref = jwt_service.decode_token(refresh)
    assert (ref["exp"] - ref["iat"]) > (acc["exp"] - acc["iat"])


def test_token_validity():
    token = jwt_service.create_access_token("analyst", "ANALYST")
    assert jwt_service.is_token_valid(token) is True
    assert jwt_service.is_token_valid("not.a.jwt") is False


def test_tampered_token_rejected():
    token = jwt_service.create_access_token("analyst", "ANALYST")
    forged = token[:-4] + "AAAA"
    assert jwt_service.is_token_valid(forged) is False


def test_expired_token_rejected(monkeypatch):
    monkeypatch.setattr(settings, "jwt_expiry", -1)
    token = jwt_service.create_access_token("analyst", "ANALYST")
    with pytest.raises(Exception):
        jwt_service.decode_token(token)
    assert jwt_service.is_token_valid(token) is False


def test_extract_username():
    token = jwt_service.create_access_token("scro_regulator", "ANALYST")
    assert jwt_service.extract_username(token) == "scro_regulator"