from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, get_current_user

from app import services
from app.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    UserDTO,
)
from app.services import get_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        return services.login(db, payload.username, payload.password)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return services.register(db, payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))


@router.post("/refresh", response_model=LoginResponse)
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        return services.refresh_tokens(db, payload.refresh_token)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))


@router.get("/me", response_model=UserDTO)
def me(identity: Annotated[UserIdentity, Depends(get_current_user)], db: Session = Depends(get_db)):
    user = get_user(db, identity.username)
    return UserDTO(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )