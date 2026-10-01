from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class OrmModel(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)


class LoginRequest(OrmModel):
    username: str
    password: str


class RegisterRequest(OrmModel):
    username: str
    email: str
    password: str
    full_name: str | None = None


class RefreshTokenRequest(OrmModel):
    refresh_token: str


class UpdateRoleRequest(OrmModel):
    role: str


class UserDTO(OrmModel):
    id: UUID
    username: str
    email: str
    full_name: str | None
    role: str


class LoginResponse(OrmModel):
    token: str
    refresh_token: str
    expires_in: int
    user: UserDTO


class AuditEntry(BaseModel):
    id: UUID
    user_id: UUID | None
    action: str
    resource_type: str | None
    resource_id: str | None
    details: str | None
    created_at: datetime