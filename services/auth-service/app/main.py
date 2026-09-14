from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from cybercommon.logging_setup import setup_json_logging

setup_json_logging(service="auth-service")
from app.routes.auth_routes import router as auth_router
from app.routes.user_routes import router as user_router

app = FastAPI(
    title="CyberRisk Quantifier — Auth Service",
    description="Identity and access: login, register, JWT refresh rotation, role management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth-service"}