"""FastAPI auth dependencies.

The API gateway validates JWTs and forwards `X-User-Id` / `X-User-Roles`
headers. Direct service access (local dev, tests) falls back to decoding the
`Authorization: Bearer` token with the shared secret.
"""

from fastapi import Depends, Header, HTTPException, status

from cybercommon import jwt as jwt_service


class UserIdentity:
    def __init__(self, username: str, roles: str):
        self.username = username
        self.roles = [r.strip() for r in (roles or "").split(",") if r.strip()]

    def has_role(self, role: str) -> bool:
        return role in self.roles


def _identity_from_token(token: str) -> UserIdentity:
    claims = jwt_service.decode_token(token)
    return UserIdentity(claims["sub"], claims.get("roles", ""))


def get_current_user(
    x_user_id: str | None = Header(default=None),
    x_user_roles: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> UserIdentity:
    if x_user_id:
        return UserIdentity(x_user_id, x_user_roles or "")
    if authorization and authorization.startswith("Bearer "):
        try:
            return _identity_from_token(authorization[7:])
        except Exception:
            pass
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