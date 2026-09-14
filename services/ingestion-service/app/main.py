from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="ingestion-service")
from app.routes.ingestion_routes import router as ingestion_router
from app.services.ingestion_service import runner


@asynccontextmanager
async def lifespan(app: FastAPI):
    runner.start()
    try:
        yield
    finally:
        runner.stop()


app = FastAPI(
    title="CyberRisk Quantifier — Ingestion Service",
    description="Continuous event ingestion, simulation, replay, and live asset connectors",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ingestion-service"}