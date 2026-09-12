from prometheus_client import Counter, Gauge, Histogram, Info

APP_INFO = Info("fusion_app", "Build information")

HTTP_REQUESTS = Counter(
    "fusion_http_requests_total", "HTTP requests",
    ["method", "endpoint", "status_code"])
HTTP_LATENCY = Histogram(
    "fusion_http_request_duration_seconds", "HTTP latency (s)",
    ["method", "endpoint"],
    buckets=(0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2.5,5,10))
HTTP_INFLIGHT = Gauge(
    "fusion_http_requests_in_progress", "In-flight requests",
    ["method", "endpoint"])

SLO_REQUESTS = Counter(
    "fusion_slo_requests_total", "Requests classified for SLO",
    ["endpoint", "class"])

DEP_CALLS = Counter(
    "fusion_dependency_calls_total", "Dependency calls",
    ["dependency", "operation", "result"])

BUSINESS_OPS = Counter(
    "fusion_business_operations_total", "Business ops",
    ["operation", "status"])
ITEMS_STORED = Gauge("fusion_items_stored", "Items in DB")
CACHE_HITS = Counter("fusion_cache_hits_total", "Cache hits", ["cache"])
CACHE_MISSES = Counter("fusion_cache_misses_total", "Cache misses", ["cache"])
