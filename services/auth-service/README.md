# auth-service

Identity and access management — login, registration, JWT tokens, refresh-token
rotation, user management, and audit logging.

**Port:** 8081  
**Stack:** FastAPI + SQLAlchemy + passlib (bcrypt) + PyJWT

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create user (default role ANALYST) |
| POST | `/api/auth/login` | — | Login → `{ token, refreshToken, expiresIn, user }` |
| POST | `/api/auth/refresh` | — | Rotate refresh token (reuse detection) |
| GET | `/api/auth/me` | JWT | Profile from token |
| GET | `/api/auth/users` | ADMIN | List all users |
| PUT | `/api/auth/users/{id}/role` | ADMIN | Change user role |
| DELETE | `/api/auth/users/{id}` | ADMIN | Delete user |

## Refresh token security

- Tokens are SHA-256-hashed before storage
- Each token belongs to a **family**; rotation increments the family
- Reusing a rotated-away token **revokes the entire family**
- Sliding expiry: 604800 s (7 days)

## Demo users

Only the three SCRO demo accounts are seeded and active (public registration is disabled by default).

| Username | Password | Role |
|---|---|---|
| scro_regulator | Scro@2026! | CISO |
| scro_banker | Scro@2026! | ANALYST |
| scro_auditor | Scro@2026! | ANALYST |