import logging
from redis.asyncio import Redis, from_url
from .config import settings
from .metrics import CACHE_HITS, CACHE_MISSES

log = logging.getLogger(__name__)
_client: Redis | None = None


def client() -> Redis:
    global _client
    if _client is None:
        _client = from_url(settings.redis_url, decode_responses=True)
    return _client


async def ping() -> bool:
    try:
        return bool(await client().ping())
    except Exception:
        log.exception("redis_ping_failed")
        return False


async def close() -> None:
    if _client is not None:
        await _client.aclose()


async def get_cached(key: str, name: str = "default"):
    val = await client().get(key)
    (CACHE_HITS if val is not None else CACHE_MISSES).labels(cache=name).inc()
    return val


async def set_cached(key: str, value: str, ttl: int = 30):
    await client().set(key, value, ex=ttl)
