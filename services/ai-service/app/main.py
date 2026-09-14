from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="ai-service")
from app.api.routes.ai_routes import router as ai_router
from app.api.routes.rag_routes import router as rag_router

app = FastAPI(
    title="CyberRisk Quantifier — AI Service",
    description="AI-powered recommendations, NL queries, risk explanations, executive summaries",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(rag_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-service", "mock_llm": settings.use_mock_llm}
