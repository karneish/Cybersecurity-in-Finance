import json
import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def split_origins(raw: str) -> list[str]:
    """Accept a CORS allowlist as a JSON array *or* a comma-separated list.

    Kept as a plain ``str`` field plus this helper on purpose. Typing the field
    as ``list[str]`` makes pydantic-settings JSON-decode whatever it reads from
    the environment, so a perfectly reasonable ``a,b`` value raised
    SettingsError while *importing* this module — which killed the gateway at
    boot rather than surfacing as a bad request. Reading the raw string and
    splitting it here makes both spellings work on any pydantic-settings 2.x.
    """
    text = (raw or "").strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, list):
            return [str(origin).strip() for origin in parsed if str(origin).strip()]
    return [origin.strip() for origin in text.split(",") if origin.strip()]


class Settings(BaseSettings):
    # Loopback defaults: every backend process runs on one host, both locally
    # (scripts/dev.ps1 / scripts/dev.sh) and on Render. The previous Docker
    # service-name defaults (http://auth-service:8081) only resolved inside a
    # compose network and would hang for 180s per request anywhere else.
    auth_service_url: str = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8081")
    asset_service_url: str = os.getenv("ASSET_SERVICE_URL", "http://127.0.0.1:8082")
    vulnerability_service_url: str = os.getenv("VULN_SERVICE_URL", "http://127.0.0.1:8083")
    control_service_url: str = os.getenv("CONTROL_SERVICE_URL", "http://127.0.0.1:8084")
    ingestion_service_url: str = os.getenv("INGESTION_SERVICE_URL", "http://127.0.0.1:8085")
    notification_service_url: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://127.0.0.1:8086")
    risk_engine_url: str = os.getenv("RISK_ENGINE_URL", "http://127.0.0.1:8090")
    investment_url: str = os.getenv("INVESTMENT_URL", "http://127.0.0.1:8091")
    ai_service_url: str = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8092")

    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8080"))

    cors_origins_raw: str = Field(
        default=os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS),
        alias="CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origins(self) -> list[str]:
        return split_origins(self.cors_origins_raw)


settings = Settings()