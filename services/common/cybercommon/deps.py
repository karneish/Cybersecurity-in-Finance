"""FastAPI auth dependencies.

Request identity can arrive two ways:

1. Via the API gateway (fast path). The gateway validates the JWT and
   forwards `X-User-Id` / `X-User-Roles` plus a keyed HMAC signature in
   `X-User-Sig`. The signature proves the identity headers were issued by
   the gateway, so direct service ports can no longer be spoofed with a
   bare `X-User-Id` header.

2. Direct service access (local dev, tests). The `Authorization: Bearer`
   token is decoded with the shared JWT secret; the identity headers are
   ignored in that case.
"""

import hashlib
import hmac

from fastapi import Depends, Header, HTTPException, status

from cybercommon import jwt as jwt_service
from cybercommon.config import settings


class UserIdentity:
    def __init__(self, username: str, roles: str):
        self.username = username
        self.roles = [r.strip() for r in (roles or "").split(",") if r.strip()]

    def has_role(self, role: str) -> bool:
        return role in self.roles


def gateway_signature(username: str, roles: str) -> str:
    """Keyed HMAC over the forwarded identity so backends can trust `X-User-Id`."""
    message = f"{username}|{roles or ''}".encode("utf-8")
    return hmac.new(
        settings.jwt_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()


def _identity_from_token(token: str) -> UserIdentity:
    claims = jwt_service.decode_token(token)
    return UserIdentity(claims["sub"], claims.get("roles", ""))


def _identity_from_gateway(x_user_id: str, x_user_roles: str, x_user_sig: str | None) -> UserIdentity:
    if not x_user_sig or not hmac.compare_digest(
        x_user_sig, gateway_signature(x_user_id, x_user_roles)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing JWT token",
        )
    return UserIdentity(x_user_id, x_user_roles)


def get_current_user(
    x_user_id: str | None = Header(default=None),
    x_user_roles: str | None = Header(default=None),
    x_user_sig: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> UserIdentity:
    if authorization and authorization.startswith("Bearer "):
        try:
            return _identity_from_token(authorization[7:])
        except Exception:
            pass
    if x_user_id:
        return _identity_from_gateway(x_user_id, x_user_roles or "", x_user_sig)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing JWT token",
    )


def require_roles(*roles: str):
    def dependency(user: UserIdentity = Depends(get_current_user)) -> UserIdentity:
        if not any(user.has_role(r) for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return dependency