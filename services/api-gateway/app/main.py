from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="api-gateway")
from app.middleware import SecurityHeadersMiddleware
from app.routes import gateway_routes
from app.routes.observability_routes import MetricsMiddleware, router as observability_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    if gateway_routes._client is not None:
        await gateway_routes._client.aclose()
        gateway_routes._client = None


app = FastAPI(
    title="CyberRisk Quantifier — API Gateway",
    description="Reverse proxy with JWT authentication, rate limiting, and circuit breaking",
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


app.add_middleware(
    SecurityHeadersMiddleware,
    server_name="api-gateway",
)
app.add_middleware(
    MetricsMiddleware,
)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/actuator/health")
def actuator_health():
    return {"status": "UP"}


app.include_router(observability_router)
app.include_router(gateway_routes.router)