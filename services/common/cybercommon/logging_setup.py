"""Structured JSON logging for every service.

`setup_json_logging()` installs a stdlib-only JSON formatter on the root logger
and on the ``uvicorn`` loggers, and patches uvicorn's runtime logging config so
request-facing access/error logs are also emitted as JSON lines when a service
boots under ``uvicorn app.main:app``.

Log records may carry arbitrary structured context via ``extra={...}`` — those
fields are serialised alongside the standard timestamp/level/logger/message.
"""

import json
import logging
import sys
import time
from typing import Any

_RESERVED_FIELDS = frozenset(
    {
        "name", "msg", "args", "levelname", "levelno", "pathname",
        "filename", "module", "exc_info", "exc_text", "stack_info",
        "lineno", "funcName", "created", "msecs", "relativeCreated",
        "thread", "threadName", "processName", "process", "taskName", "message",
    }
)


class JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        for key, value in record.__dict__.items():
            if key not in _RESERVED_FIELDS:
                payload[key] = value
        return json.dumps(payload, default=str)


def _patch_uvicorn_logging_config() -> None:
    """Make uvicorn's runtime logging-config reuse the JSON formatters.

    uvicorn calls ``logging.config.dictConfig`` when a server starts, which would
    otherwise reset any handlers installed at import time. Swapping the formatter
    classes in uvicorn's config keeps every output line JSON.

    The keyword arguments uvicorn ships alongside its formatter classes must be
    dropped too: uvicorn's ``"default"`` entry passes ``use_colors=None``, which
    only its own ``DefaultFormatter`` accepts. ``JsonFormatter`` derives from
    plain ``logging.Formatter``, so leaving the key in place makes dictConfig
    raise ``TypeError: Formatter.__init__() got an unexpected keyword argument
    'use_colors'``.

    This stayed hidden while each service ran as its own process, because the
    uvicorn CLI builds its ``Config`` (and therefore runs dictConfig) *before* it
    imports the application. ``deploy/render/serve_all.py`` imports all ten apps
    before constructing any ``Config``, which reaches this path -- hence the
    explicit cleanup rather than relying on import ordering.
    """
    try:
        from uvicorn.config import LOGGING_CONFIG
    except Exception:
        return
    LOGGING_CONFIG["disable_existing_loggers"] = False
    formatters = LOGGING_CONFIG.setdefault("formatters", {})
    for name in ("default", "access"):
        entry = formatters.setdefault(name, {})
        entry["()"] = JsonFormatter
        # Keywords accepted only by uvicorn's own formatter subclasses.
        entry.pop("use_colors", None)


def setup_json_logging(
    *,
    service: str,
    level: str = "INFO",
    json_format: bool = True,
) -> logging.Logger:
    """Configure JSON structured logging for a service.

    Returns a namespaced logger: ``logging.getLogger(f"cyberrisk.{service}")``.
    """
    svc_logger = logging.getLogger(f"cyberrisk.{service}")
    log_level = getattr(logging, str(level).upper(), logging.INFO)

    if not json_format:
        logging.basicConfig(level=log_level)
        return svc_logger

    _patch_uvicorn_logging_config()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers = [handler]

    for uvicorn_logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        u_logger = logging.getLogger(uvicorn_logger_name)
        u_logger.handlers = [handler]
        u_logger.propagate = False
        u_logger.setLevel(log_level)

    svc_logger.setLevel(log_level)
    return svc_logger