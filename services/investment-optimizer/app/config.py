import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://localhost:5432/cyberrisk"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    risk_engine_url: str = os.getenv("RISK_ENGINE_URL", "http://localhost:8090")
    control_service_url: str = os.getenv("CONTROL_SERVICE_URL", "http://localhost:8084")
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_pre_ping: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8091"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
