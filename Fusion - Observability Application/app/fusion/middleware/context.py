import logging, time, uuid
from starlette.middleware.base import BaseHTTPMiddleware
from ..core.logging import request_id_ctx

log = logging.getLogger("fusion.access")
_SKIP = {"/metrics", "/health/live", "/health/ready"}


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        rid = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        token = request_id_ctx.set(rid)
        request.state.request_id = rid
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        dur_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = rid
        if request.url.path not in _SKIP:
            log.info("http_request", extra={
                "request_id": rid,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(dur_ms, 2),
            })
        return response
