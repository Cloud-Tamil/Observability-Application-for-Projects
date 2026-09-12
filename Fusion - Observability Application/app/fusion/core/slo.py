from .config import settings
from .metrics import SLO_REQUESTS


def classify(endpoint: str, status_code: int, duration_s: float) -> None:
    """A request is 'good' iff status < 500 AND latency within SLO."""
    latency_ok = duration_s * 1000.0 <= settings.slo_latency_target_ms
    status_ok = status_code < 500
    cls = "good" if (latency_ok and status_ok) else "bad"
    SLO_REQUESTS.labels(endpoint=endpoint, **{"class": cls}).inc()
