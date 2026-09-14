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

| Username | Password | Role |
|---|---|---|
| admin | admin123 | ADMIN |
| ciso | admin123 | CISO |
| analyst | admin123 | ANALYST |