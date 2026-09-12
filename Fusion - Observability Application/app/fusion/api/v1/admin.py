import asyncio, random
from fastapi import APIRouter, Depends, Query
from ...core import cache
from ..deps import require_scope

router = APIRouter(prefix="/admin", tags=["admin"],
                   dependencies=[Depends(require_scope("admin"))])


@router.get("/simulate/latency")
async def simulate_latency(ms: int = Query(500, ge=0, le=10_000)):
    await asyncio.sleep(ms / 1000)
    return {"slept_ms": ms}


@router.get("/simulate/error")
async def simulate_error(rate: float = Query(1.0, ge=0, le=1)):
    if random.random() < rate:
        raise RuntimeError("simulated failure")
    return {"failed": False}


@router.post("/cache/flush")
async def flush_cache():
    await cache.client().flushdb()
    return {"flushed": True}
