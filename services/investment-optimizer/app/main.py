from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="investment-optimizer")
from app.api.routes.optimize_routes import router as optimize_router

app = FastAPI(
    title="CyberRisk Quantifier — Investment Optimizer",
    description="Budget optimization using OR-Tools, ROSI calculation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "investment-optimizer"}
