"""CyberRisk Quantifier — shared configuration."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/cyberrisk",
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_pre_ping: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

    jwt_secret: str = os.getenv(
        "JWT_SECRET",
        "cybergate-default-secret-key-for-jwt-token-signing-2024",
    )
    jwt_expiry: int = int(os.getenv("JWT_EXPIRY", "3600"))
    jwt_refresh_expiry: int = int(os.getenv("JWT_REFRESH_EXPIRY", "604800"))

    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8000"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()