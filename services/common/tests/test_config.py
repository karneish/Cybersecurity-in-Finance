"""Unit tests for cybercommon config — DB pool tuning knobs."""

from cybercommon.config import Settings


def test_database_pool_defaults():
    settings = Settings(_env_file=None)
    assert settings.db_pool_size == 10
    assert settings.db_max_overflow == 20
    assert settings.db_pool_recycle == 1800
    assert settings.db_pool_timeout == 30
    assert settings.db_pool_pre_ping is True


def test_database_pool_env_override(monkeypatch):
    monkeypatch.setenv("DB_POOL_SIZE", "5")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "15")
    monkeypatch.setenv("DB_POOL_RECYCLE", "600")
    monkeypatch.setenv("DB_POOL_TIMEOUT", "12")
    monkeypatch.setenv("DB_POOL_PRE_PING", "false")
    settings = Settings(_env_file=None)
    assert settings.db_pool_size == 5
    assert settings.db_max_overflow == 15
    assert settings.db_pool_recycle == 600
    assert settings.db_pool_timeout == 12
    assert settings.db_pool_pre_ping is False