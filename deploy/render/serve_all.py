#!/usr/bin/env python3
"""Run all ten microservices in a SINGLE Python process on one event loop.

Why this exists
---------------
Render's Free compute plan gives a web service 512 MB of RAM. Running the ten
services as ten OS processes costs ~1.0-1.4 GB, almost entirely because each
process loads its own copy of the same interpreter and libraries (numpy,
pandas, scipy, scikit-learn, xgboost, ortools). Measured on this repo:

    bare interpreter ..................  12 MB
    one FastAPI service's imports .....  72 MB
    every dependency, imported once ... 206 MB

So one process with everything loaded is roughly a third of the footprint.
This module keeps all ten apps, all ten ports and every inter-service HTTP URL
completely unchanged -- only the process topology differs. The gateway still
reaches auth on http://127.0.0.1:8081 exactly as before.

nginx remains the public edge on $PORT (see nginx.conf.template): it forwards
/api/* and /health to the gateway on 18080, and /ws to notification on 8086.
"""

from __future__ import annotations

import asyncio
import importlib
import os
import signal
import sys
from pathlib import Path

SERVICES_ROOT = Path(__file__).resolve().parents[2] / "services"

# (service directory, package name, port). The gateway is last so the upstreams
# it proxies to are already listening before traffic can arrive.
SERVICES: list[tuple[str, str, int]] = [
    ("auth-service", "authapp", 8081),
    ("asset-service", "assetapp", 8082),
    ("vulnerability-service", "vulnapp", 8083),
    ("control-service", "controlapp", 8084),
    ("ingestion-service", "ingestapp", 8085),
    ("notification-service", "notifyapp", 8086),
    ("risk-engine", "riskapp", 8090),
    ("investment-optimizer", "investapp", 8091),
    ("ai-service", "aiapp", 8092),
    ("api-gateway", "gwapp", 18080),  # internal-only; nginx owns the public port
]

HOST = "127.0.0.1"


def add_service_dirs_to_path() -> None:
    """Every service package is uniquely named, so all ten directories can sit
    on sys.path simultaneously -- no import juggling required."""
    for name, _pkg, _port in SERVICES:
        path = str(SERVICES_ROOT / name)
        if path not in sys.path:
            sys.path.insert(0, path)
    common = str(SERVICES_ROOT / "common")
    if common not in sys.path:
        sys.path.insert(0, common)


def load_apps() -> list[tuple[str, int, object]]:
    loaded = []
    for name, pkg, port in SERVICES:
        module = importlib.import_module(f"{pkg}.main")
        app = getattr(module, "app", None)
        if app is None:
            raise RuntimeError(f"{pkg}.main does not expose an `app` object")
        loaded.append((name, port, app))
        print(f"[serve_all] loaded {pkg:<14} -> 127.0.0.1:{port}", flush=True)
    return loaded


def build_servers(loaded):
    from uvicorn import Config, Server

    servers = []
    for name, port, app in loaded:
        config = Config(
            app=app,
            host=HOST,
            port=port,
            log_level=os.getenv("LOG_LEVEL", "info"),
            access_log=True,
            # Required: ingestion-service, notification-service, risk-engine and
            # the gateway all start background threads in their lifespan hooks.
            lifespan="on",
            timeout_keep_alive=30,
        )
        server = Server(config)
        # uvicorn's Server.capture_signals() installs SIGINT/SIGTERM handlers
        # per instance; with ten servers the last one installed would win and
        # only that single server would be told to exit. We install one handler
        # for the whole process instead (see main()).
        server.install_signal_handlers = lambda: None
        servers.append(server)
    return servers


async def run(servers) -> None:
    loop = asyncio.get_running_loop()

    def request_shutdown() -> None:
        print("[serve_all] shutdown requested; stopping all services", flush=True)
        for server in servers:
            server.should_exit = True

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, request_shutdown)
        except NotImplementedError:  # pragma: no cover - non-POSIX
            signal.signal(sig, lambda *_: request_shutdown())

    await asyncio.gather(*(server.serve() for server in servers))


def main() -> int:
    print("[serve_all] starting all ten services in one process", flush=True)
    add_service_dirs_to_path()
    loaded = load_apps()
    servers = build_servers(loaded)
    try:
        asyncio.run(run(servers))
    except KeyboardInterrupt:  # pragma: no cover
        pass
    print("[serve_all] all services stopped", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())