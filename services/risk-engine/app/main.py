from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="risk-engine")
from app.api.routes.risk_routes import router as risk_router
from app.core.event_consumer import consumer


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer.start()
    try:
        yield
    finally:
        consumer.stop()


app = FastAPI(
    title="CyberRisk Quantifier — Risk Engine",
    description="Core risk quantification, EAL calculation, and scenario simulation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "risk-engine"}
