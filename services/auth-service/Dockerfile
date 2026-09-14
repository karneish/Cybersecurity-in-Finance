# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=120
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY common/pyproject.toml /opt/common/
COPY common/cybercommon/ /opt/common/cybercommon/
RUN pip install --no-cache-dir /opt/common/

COPY auth-service/pyproject.toml ./
COPY auth-service/app/ ./app/
RUN pip install --no-cache-dir .

EXPOSE 8081

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8081}"]
