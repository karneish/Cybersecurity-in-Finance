from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="control-service")
from app.routes.control_routes import router as control_router

app = FastAPI(
    title="CyberRisk Quantifier — Control Service",
    description="Security control catalog, asset-control status, and effectiveness",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(control_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "control-service"}