"""AuthService — JWT issuance, role handling, and refresh-token rotation.

Refresh rotation policy (OWASP refresh-token rotation):
  * every successful refresh revokes the presented token and issues a new pair
  * reuse of a revoked token revokes the entire token family
  * tokens are stored as SHA-256 hashes (plaintext never persisted)
"""

import hashlib
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from cybercommon import jwt as jwt_service
from cybercommon.models import AuditLog, RefreshToken, User
from cybercommon.security import hash_password, verify_password

from app.config import settings
from app.schemas import LoginResponse, RegisterRequest, UpdateRoleRequest, UserDTO

VALID_ROLES = {"VIEWER", "ANALYST", "CISO", "ADMIN"}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_pair(db: Session, user: User, family_id: UUID | None = None) -> tuple[str, str, RefreshToken]:
    access = jwt_service.create_access_token(user.username, user.role)
    refresh = jwt_service.create_refresh_token(user.username, user.role)

    ledger = RefreshToken(
        user_id=user.id,
        token_hash=_hash(refresh),
        family_id=family_id or uuid4(),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.jwt_refresh_expiry),
    )
    db.add(ledger)
    db.commit()
    db.refresh(ledger)
    return access, refresh, ledger


def _audit(db: Session, user_id: UUID, action: str, details: str) -> None:
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        resource_type="USER",
        resource_id=str(user_id),
        details=details,
    ))
    db.commit()


def _dto(user: User) -> UserDTO:
    return UserDTO(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


def _response(access: str, refresh: str, user: User) -> LoginResponse:
    return LoginResponse(
        token=access,
        refresh_token=refresh,
        expires_in=settings.jwt_expiry,
        user=_dto(user),
    )


def login(db: Session, username: str, password: str) -> LoginResponse:
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        raise PermissionError("Invalid username or password")
    if not user.is_active:
        raise PermissionError("User account is disabled")

    access, refresh, _ = _issue_pair(db, user)
    _audit(db, user.id, "LOGIN", "Successful login")
    return _response(access, refresh, user)


def register(db: Session, request: RegisterRequest) -> LoginResponse:
    if db.query(User).filter(User.username == request.username).first():
        raise ValueError("Username already exists")
    if db.query(User).filter(User.email == request.email).first():
        raise ValueError("Email already exists")

    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role="ANALYST",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access, refresh, _ = _issue_pair(db, user)
    _audit(db, user.id, "REGISTER", "New user registered")
    return _response(access, refresh, user)


def refresh_tokens(db: Session, refresh_token: str) -> LoginResponse:
    if not jwt_service.is_token_valid(refresh_token):
        raise PermissionError("Invalid refresh token")

    digest = _hash(refresh_token)
    ledger = db.query(RefreshToken).filter(RefreshToken.token_hash == digest).first()

    # Token reuse / rotation policy
    if ledger is None or ledger.revoked_at is not None:
        if ledger is not None:
            # Reuse of a revoked token → revoke entire family
            db.query(RefreshToken).filter(
                RefreshToken.family_id == ledger.family_id,
                RefreshToken.revoked_at.is_(None),
            ).update({"revoked_at": datetime.now(timezone.utc)})
            db.commit()
        raise PermissionError("Refresh token has been revoked")

    now = datetime.now(timezone.utc)
    if ledger.expires_at.replace(tzinfo=timezone.utc) < now:
        ledger.revoked_at = now
        db.commit()
        raise PermissionError("Refresh token has expired")

    user = db.query(User).filter(User.id == ledger.user_id).first()
    if user is None or not user.is_active:
        raise PermissionError("User not found or disabled")

    access, refresh, new_ledger = _issue_pair(db, user, family_id=ledger.family_id)
    ledger.revoked_at = now
    ledger.replaced_by = new_ledger.id
    db.commit()

    _audit(db, user.id, "REFRESH", "Token rotation")
    return _response(access, refresh, user)


def get_user(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise KeyError("User not found")
    return user


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.created_at).all()


def update_role(db: Session, user_id: UUID, role: str) -> User:
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role: {role}")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise KeyError("User not found")
    user.role = role
    db.commit()
    db.refresh(user)
    _audit(db, user.id, "ROLE_UPDATE", f"Role changed to {role}")
    return user


def delete_user(db: Session, user_id: UUID) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise KeyError("User not found")
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update(
        {"revoked_at": datetime.now(timezone.utc)}
    )
    db.delete(user)
    db.commit()