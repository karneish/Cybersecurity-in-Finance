from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, require_roles

from app import services
from app.schemas import UpdateRoleRequest, UserDTO

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserDTO])
def list_users(
    identity: Annotated[UserIdentity, Depends(require_roles("ADMIN"))],
    db: Session = Depends(get_db),
):
    return [
        UserDTO(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
        )
        for u in services.list_users(db)
    ]


@router.put("/{user_id}/role", response_model=UserDTO)
def update_role(
    user_id: UUID,
    payload: UpdateRoleRequest,
    identity: Annotated[UserIdentity, Depends(require_roles("ADMIN"))],
    db: Session = Depends(get_db),
):
    try:
        user = services.update_role(db, user_id, payload.role)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return UserDTO(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    identity: Annotated[UserIdentity, Depends(require_roles("ADMIN"))],
    db: Session = Depends(get_db),
):
    try:
        services.delete_user(db, user_id)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))