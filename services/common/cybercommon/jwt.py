"""JWT helpers — HS256, claim layout identical to the retired Java JwtService.

Claims: sub=username, roles=role, role=role, iat, exp.
"""

import jwt

from cybercommon.config import settings

ALGORITHM = "HS256"


def _secret() -> bytes:
    return settings.jwt_secret.encode("utf-8")


def _create(claims: dict, expiry_seconds: int) -> str:
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    payload = {
        "sub": claims["sub"],
        "roles": claims["roles"],
        "role": claims["role"],
        "iat": now,
        "exp": now + timedelta(seconds=expiry_seconds),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def create_access_token(username: str, role: str) -> str:
    return _create({"sub": username, "roles": role, "role": role}, settings.jwt_expiry)


def create_refresh_token(username: str, role: str) -> str:
    return _create({"sub": username, "roles": role, "role": role}, settings.jwt_refresh_expiry)


def decode_token(token: str) -> dict:
    """Return decoded claims or raise jwt.PyJWTError on any validation failure."""
    return jwt.decode(token, _secret(), algorithms=[ALGORITHM])


def is_token_valid(token: str) -> bool:
    try:
        decode_token(token)
        return True
    except Exception:
        return False


def extract_username(token: str) -> str:
    return decode_token(token)["sub"]