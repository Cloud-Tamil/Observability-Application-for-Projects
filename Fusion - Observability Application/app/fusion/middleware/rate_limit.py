import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from ..core.cache import client
from ..core.config import settings

_SKIP = {"/metrics","/health/live","/health/ready","/docs","/openapi.json","/redoc"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path in _SKIP:
            return await call_next(request)

        ident = request.headers.get("X-API-Key") or (
            request.client.host if request.client else "anon")
        now = int(time.time())
        window = settings.rate_limit_window_seconds
        bucket = now // window
        key = f"rl:{ident}:{bucket}"

        try:
            pipe = client().pipeline()
            pipe.incr(key)
            pipe.expire(key, window + 1)
            count, _ = await pipe.execute()
            count = int(count)
        except Exception:
            return await call_next(request)  # fail-open

        remaining = max(0, settings.rate_limit_requests - count)
        if count > settings.rate_limit_requests:
            retry = window - (now % window)
            return JSONResponse(
                status_code=429,
                content={"detail": "rate limit exceeded", "retry_after": retry},
                headers={"X-RateLimit-Limit": str(settings.rate_limit_requests),
                         "X-RateLimit-Remaining": "0", "Retry-After": str(retry)})

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
