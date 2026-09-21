import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    auth_service_url: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8081")
    asset_service_url: str = os.getenv("ASSET_SERVICE_URL", "http://asset-service:8082")
    vulnerability_service_url: str = os.getenv("VULN_SERVICE_URL", "http://vulnerability-service:8083")
    control_service_url: str = os.getenv("CONTROL_SERVICE_URL", "http://control-service:8084")
    ingestion_service_url: str = os.getenv("INGESTION_SERVICE_URL", "http://ingestion-service:8085")
    notification_service_url: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8086")
    risk_engine_url: str = os.getenv("RISK_ENGINE_URL", "http://risk-engine:8090")
    investment_url: str = os.getenv("INVESTMENT_URL", "http://investment-optimizer:8091")
    ai_service_url: str = os.getenv("AI_SERVICE_URL", "http://ai-service:8092")

    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8080"))

    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if o.strip()
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()