from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="asset-service")
from app.routes.asset_routes import router as asset_router

app = FastAPI(
    title="CyberRisk Quantifier — Asset Service",
    description="IT asset inventory, dependency graph, and criticality scoring",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asset_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "asset-service"}