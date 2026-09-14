"""Unit tests for cybercommon.cache — Redis-backed caching utilities."""

import re

import cybercommon.cache as cache_mod
from cybercommon.cache import cache_evict, cache_get, cache_put, cached


class FakeRedis:
    """Minimal in-memory stand-in for redis.Redis (decode_responses=True)."""

    def __init__(self):
        self.store: dict[str, tuple[str, int | None]] = {}

    def get(self, key):
        item = self.store.get(key)
        return item[0] if item else None

    def set(self, key, value, ex=None):
        self.store[key] = (value, ex)

    def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.store:
                del self.store[key]
                deleted += 1
        return deleted

    def scan_iter(self, match=None, count=100):
        pattern = match.replace("*", ".*") if match else ".*"
        return (k for k in list(self.store) if re.match(pattern, k))


def _install_fake(monkeypatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(cache_mod, "redis_client", lambda: fake)
    return fake


def test_get_miss_returns_none(monkeypatch):
    _install_fake(monkeypatch)
    assert cache_get("national", "summary") is None


def test_put_get_roundtrip(monkeypatch):
    _install_fake(monkeypatch)
    cache_put("national", {"total_eal": 1234.5, "sri": 0.62}, 120, "summary")
    assert cache_get("national", "summary") == {"total_eal": 1234.5, "sri": 0.62}


def test_get_on_redis_error_returns_none(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("redis down")

    monkeypatch.setattr(cache_mod, "redis_client", boom)
    assert cache_get("national", "summary") is None


def test_put_on_redis_error_does_not_raise(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("redis down")

    monkeypatch.setattr(cache_mod, "redis_client", boom)
    cache_put("national", {"x": 1}, 60, "summary")


def test_cached_decorator_reuses_results(monkeypatch):
    fake = _install_fake(monkeypatch)
    calls: list[int] = []

    @cached("demo", ttl=60)
    def compute(pk: int, db=None):
        calls.append(pk)
        return {"pk": pk, "value": pk * 2}

    assert compute(1, db=object()) == {"pk": 1, "value": 2}
    assert compute(1, db=object()) == {"pk": 1, "value": 2}
    assert len(calls) == 1

    compute(2)
    assert len(calls) == 2
    assert len(fake.store) == 2


def test_cached_kwargs_excluded_from_key(monkeypatch):
    calls = []
    _install_fake(monkeypatch)

    @cached("kw", ttl=60)
    def fetch(db, sector: str = "all"):
        calls.append(sector)
        return {"sector": sector}

    assert fetch(object(), sector="banking") == {"sector": "banking"}
    assert fetch(object(), sector="banking") == {"sector": "banking"}
    assert len(calls) == 1


def test_cache_evict_scopes_to_namespace(monkeypatch):
    _install_fake(monkeypatch)
    cache_put("national", {"a": 1}, 60, "k1")
    cache_put("national", {"b": 2}, 60, "k2")
    cache_put("other", {"c": 3}, 60, "k1")

    cache_evict("national")

    assert cache_get("national", "k1") is None
    assert cache_get("national", "k2") is None
    assert cache_get("other", "k1") == {"c": 3}