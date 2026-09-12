from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from ...core import cache, db
from ...core.config import settings

router = APIRouter(tags=["health"])
_START = datetime.now(timezone.utc)


@router.get("/health/live")
async def live():
    return {"status": "alive", "ts": datetime.now(timezone.utc).isoformat()}


@router.get("/health/startup")
async def startup():
    return {"status": "started", "version": settings.version}


@router.get("/health/ready")
async def ready(response: Response):
    db_ok = await db.ping()
    redis_ok = await cache.ping()
    healthy = db_ok and redis_ok
    response.status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if healthy else "degraded",
        "uptime_seconds": round((datetime.now(timezone.utc) - _START).total_seconds(), 2),
        "version": settings.version,
        "dependencies": {"postgres": db_ok, "redis": redis_ok},
    }
