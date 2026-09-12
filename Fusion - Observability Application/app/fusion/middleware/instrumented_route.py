import time
from fastapi.routing import APIRoute
from ..core.metrics import HTTP_INFLIGHT, HTTP_LATENCY, HTTP_REQUESTS
from ..core.slo import classify


class InstrumentedRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request):
            endpoint = self.path
            method = request.method
            HTTP_INFLIGHT.labels(method=method, endpoint=endpoint).inc()
            start = time.perf_counter()
            status_code = 500
            try:
                response = await original(request)
                status_code = response.status_code
                return response
            finally:
                dur = time.perf_counter() - start
                HTTP_INFLIGHT.labels(method=method, endpoint=endpoint).dec()
                HTTP_REQUESTS.labels(method=method, endpoint=endpoint,
                                     status_code=str(status_code)).inc()
                HTTP_LATENCY.labels(method=method, endpoint=endpoint).observe(dur)
                classify(endpoint, status_code, dur)
        return handler
