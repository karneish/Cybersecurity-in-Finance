import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    jwt_refresh_expiry: int = int(os.getenv("JWT_REFRESH_EXPIRY", "604800"))
    jwt_expiry: int = int(os.getenv("JWT_EXPIRY", "3600"))
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8081"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()