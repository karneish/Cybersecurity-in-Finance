"""Generic Redis cache utilities with a ``cached`` decorator for sync endpoints.

Redis failures are treated as cache-misses / no-ops so a cache outage never
breaks the calling handler.
"""

import functools
import hashlib
import json
import logging

from cybercommon.redis import redis_client

logger = logging.getLogger(__name__)

PREFIX = "cyberrisk:cache"

_PRIMITIVES = (str, int, float, bool, type(None))


def _hash_key(parts: tuple[str, ...]) -> str:
    digest = hashlib.sha1(":".join(parts).encode("utf-8")).hexdigest()[:16]
    return digest


def _key(namespace: str, key_parts: tuple[str, ...]) -> str:
    return f"{PREFIX}:{namespace}:{_hash_key(key_parts)}"


def cache_get(namespace: str, *key_parts: str):
    """Return the cached payload for a namespace key, or None on miss/error."""
    if not key_parts:
        return None
    try:
        client = redis_client()
        raw = client.get(_key(namespace, key_parts))
    except Exception:
        logger.debug("cache_get failed for %s", namespace, exc_info=True)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        logger.warning("Undecodable cached payload for namespace %s", namespace)
        return None


def cache_put(namespace: str, payload, ttl: int, *key_parts: str) -> None:
    """Store a JSON-serializable payload for a namespace key with a TTL."""
    if not key_parts:
        return
    try:
        client = redis_client()
        client.set(_key(namespace, key_parts), json.dumps(payload, default=str), ex=ttl)
    except Exception:
        logger.debug("cache_put failed for %s", namespace, exc_info=True)


def cache_delete(namespace: str, *key_parts: str) -> None:
    if not key_parts:
        return
    try:
        client = redis_client()
        client.delete(_key(namespace, key_parts))
    except Exception:
        logger.debug("cache_delete failed for %s", namespace, exc_info=True)


def cache_evict(namespace: str) -> None:
    """Delete every cached entry under a namespace (scan-and-delete)."""
    prefix = f"{PREFIX}:{namespace}:"
    try:
        client = redis_client()
        keys = list(client.scan_iter(match=prefix + "*", count=100))
        if keys:
            client.delete(*keys)
            logger.info("Evicted %d cache entries under %s", len(keys), namespace)
    except Exception:
        logger.debug("cache_evict failed for %s", namespace, exc_info=True)


def _primitive_parts(args: tuple, kwargs: dict) -> tuple[str, ...]:
    parts: list[str] = []
    for value in args:
        if isinstance(value, _PRIMITIVES):
            parts.append(f"arg={value}")
    for key in sorted(kwargs):
        value = kwargs[key]
        if isinstance(value, _PRIMITIVES):
            parts.append(f"{key}={value}")
    return tuple(parts)


def cached(prefix: str, ttl: int):
    """Decorator caching a sync callable under ``prefix`` keyed by name + primitive args.

    Non-primitive arguments (e.g. a SQLAlchemy ``Session``) never enter the key.
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key_parts = (fn.__name__,) + _primitive_parts(args, kwargs)
            hit = cache_get(prefix, *key_parts)
            if hit is not None:
                return hit
            result = fn(*args, **kwargs)
            cache_put(prefix, result, ttl, *key_parts)
            return result

        return wrapper

    return decorator