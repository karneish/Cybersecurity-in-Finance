"""Redis helpers."""

import redis

from cybercommon.config import settings


def redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


CHANNELS_VULNERABILITY = [
    "security.events.vulnerability",
]
CHANNELS_CONTROL = ["security.events.control"]
CHANNELS_ASSET = ["security.events.asset"]
CHANNELS_RISK = ["risk.events.updated"]