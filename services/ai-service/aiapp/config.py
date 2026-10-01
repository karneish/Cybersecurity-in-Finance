import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    risk_engine_url: str = os.getenv("RISK_ENGINE_URL", "http://localhost:8090")
    asset_service_url: str = os.getenv("ASSET_SERVICE_URL", "http://localhost:8082")
    investment_url: str = os.getenv("INVESTMENT_URL", "http://localhost:8091")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    use_mock_llm: bool = os.getenv("USE_MOCK_LLM", "true").lower() == "true"
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o")
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8092"))

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
