"""Service-to-service authentication.

Backend services that call each other directly (not through the gateway)
carry a dedicated identity signed with the shared JWT secret, e.g.
``sub=service:ai-service, roles=ADMIN``. This keeps internal orchestration
authenticated without going through the public gateway.
"""

from cybercommon import jwt as jwt_service


def service_token(service: str, role: str = "ADMIN") -> str:
    return jwt_service.create_access_token(f"service:{service}", role)


def service_headers(service: str, role: str = "ADMIN") -> dict:
    return {"Authorization": f"Bearer {service_token(service, role)}"}