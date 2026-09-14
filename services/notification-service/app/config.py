import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8086"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()