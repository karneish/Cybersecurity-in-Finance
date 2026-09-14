import asyncio
import os

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="notification-service")
from app.core.stomp import start_bridge
from app.routes.ws_routes import router as ws_router

bridge_thread = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bridge_thread
    loop = asyncio.get_running_loop()
    bridge_thread = start_bridge(loop)
    try:
        yield
    finally:
        pass


app = FastAPI(
    title="CyberRisk Quantifier — Notification Service",
    description="WebSocket/STOMP live feed bridging Redis events to the dashboard",
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

app.include_router(ws_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "notification-service"}