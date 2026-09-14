# common — shared Python package

The `cybercommon` package is installed first by every service Docker image at
`/opt/common/cybercommon`. It provides the shared foundation all microservices
depend on.

## Modules

| Module | Purpose |
|---|---|
| `config.py` | Pydantic `Settings` — DATABASE_URL, REDIS_URL, JWT_SECRET, etc. |
| `database.py` | SQLAlchemy async engine + `get_db()` FastAPI dependency |
| `models.py` | All ORM models (User, Asset, Vulnerability, SecurityControl, SecurityEvent, etc.) |
| `jwt.py` | PyJWT HS256 `create_access_token` / `decode_token` with expiry |
| `security.py` | passlib bcrypt `hash_password` / `verify_password` |
| `redis.py` | Redis client + named pub/sub channels |
| `deps.py` | FastAPI dependencies: `get_current_user`, `require_roles`, `require_admin` |
| `cache.py` | Simple in-memory + Redis caching helpers |
| `logging_setup.py` | Structured logging configuration |

## Installation

```bash
pip install -e services/common
```

The package is named `cybercommon` (installed as `cybercommon`, not `common`) to
avoid setuptools flat-layout conflicts.

## Tests

```bash
python -m pytest services/common/tests -q
```

Covers JWT encode/decode, password hashing, configuration loading, and Redis connectivity.