"""Unit tests for cybercommon.logging_setup — structured JSON logging."""

import io
import json
import logging

from cybercommon.logging_setup import JsonFormatter, setup_json_logging


def test_setup_json_logging_returns_namespaced_logger():
    logger = setup_json_logging(service="test-svc", level="DEBUG")
    assert logger.name == "cyberrisk.test-svc"


def test_formatter_emits_valid_json_with_extras():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("test.logging.formatter")
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    logger.info("hello %s", "world", extra={"request_id": "abc-123", "path": "/api/risk"})

    data = json.loads(stream.getvalue().strip())
    assert data["message"] == "hello world"
    assert data["level"] == "INFO"
    assert data["logger"] == "test.logging.formatter"
    assert data["request_id"] == "abc-123"
    assert data["path"] == "/api/risk"
    assert data["ts"].endswith("Z")


def test_formatter_includes_exception_traceback():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("test.logging.exc")
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    try:
        raise ValueError("boom")
    except ValueError:
        logger.exception("request failed")

    data = json.loads(stream.getvalue().strip())
    assert data["level"] == "ERROR"
    assert "boom" in data["exc_info"]


def test_setup_patches_uvicorn_formatters():
    try:
        from uvicorn.config import LOGGING_CONFIG
    except ImportError:
        return
    setup_json_logging(service="test-uvicorn")
    assert LOGGING_CONFIG["formatters"]["default"]["()"] is JsonFormatter
    assert LOGGING_CONFIG["formatters"]["access"]["()"] is JsonFormatter
    assert LOGGING_CONFIG["disable_existing_loggers"] is False