import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    jwt_refresh_expiry: int = int(os.getenv("JWT_REFRESH_EXPIRY", "604800"))
    jwt_expiry: int = int(os.getenv("JWT_EXPIRY", "3600"))
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8081"))
    # Only the three seeded SCRO demo accounts may sign in unless explicitly
    # re-enabled with AUTH_ALLOW_REGISTER=true.
    allow_register: bool = os.getenv("AUTH_ALLOW_REGISTER", "false").lower() in ("1", "true", "yes")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()