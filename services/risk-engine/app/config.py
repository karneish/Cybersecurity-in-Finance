import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://localhost:5432/cyberrisk"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    asset_service_url: str = os.getenv("ASSET_SERVICE_URL", "http://localhost:8082")
    vuln_service_url: str = os.getenv("VULN_SERVICE_URL", "http://localhost:8083")
    control_service_url: str = os.getenv("CONTROL_SERVICE_URL", "http://localhost:8084")
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    db_pool_recycle: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    db_pool_pre_ping: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"
    national_cache_ttl: int = int(os.getenv("NATIONAL_CACHE_TTL", "120"))
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8090"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
