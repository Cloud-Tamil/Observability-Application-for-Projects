# Fusion Metrics

**A production-style observability reference application.**

Fusion Metrics is a containerized FastAPI service wired end-to-end for
observability: Prometheus metrics, SLO recording rules, burn-rate alerts,
structured JSON logging, dependency-aware health probes, JWT auth, Redis
rate limiting, and auto-provisioned Grafana dashboards. Everything runs
locally with a single `docker compose up`.

The repo is deliberately shaped like a real DevOps pipeline target so it
can be extended with **Git, GitHub, Jenkins, Trivy, Kubernetes, AWS, and
Argo CD** without restructuring.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Feature Matrix](#feature-matrix)
3. [Project Layout](#project-layout)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [First Login](#first-login)
7. [API Reference](#api-reference)
8. [Metrics Reference](#metrics-reference)
9. [SLOs & Error Budget](#slos--error-budget)
10. [Alerting](#alerting)
11. [Logging](#logging)
12. [Dashboards](#dashboards)
13. [Health Checks](#health-checks)
14. [Configuration](#configuration)
15. [Local Development](#local-development)
16. [Troubleshooting](#troubleshooting)
17. [Extending to a Full Pipeline](#extending-to-a-full-pipeline)
18. [License](#license)

---

## Architecture

```
                            Docker network: observability
   ┌─────────────────────────────────────────────────────────────────────┐
   │                                                                     │
   │  Clients ──▶ :8000  nginx  ──▶  gunicorn + uvicorn workers           │
   │                       │              FastAPI                        │
   │                       │              ├── JWT auth / RBAC             │
   │                       │              ├── Redis rate limiter          │
   │                       │              ├── Redis read-through cache    │
   │                       │              ├── SQLAlchemy (async) ──▶ Postgres
   │                       │              └── /metrics, /health/*         │
   │                       │                                             │
   │                       ▼                                             │
   │             /metrics scrape (10s)                                   │
   │                                                                     │
   │   ┌────────────┐         ┌───────────┐        ┌─────────────────┐   │
   │   │ Prometheus │────────▶│ Alertmanager│      │    Grafana      │   │
   │   │  :9090     │  alerts │   :9093    │        │     :3001       │   │
   │   └─────┬──────┘         └───────────┘        └────────┬────────┘   │
   │         │                                              │            │
   │         └────────────── datasource ────────────────────┘            │
   │                                                                     │
   └─────────────────────────────────────────────────────────────────────┘
```

The app is **stateless** — all state lives in Postgres + Redis. This makes it
directly portable to Kubernetes, ECS, or any container scheduler.

---

## Feature Matrix

| Capability              | Implementation                                                    |
|-------------------------|-------------------------------------------------------------------|
| HTTP framework          | FastAPI 0.115 + gunicorn + uvicorn workers                        |
| Persistence             | PostgreSQL 16 (async SQLAlchemy 2.0 + asyncpg)                    |
| Cache + rate limiting   | Redis 7 (read-through cache + sliding-window limiter)             |
| Auth                    | JWT bearer tokens, scope-based RBAC (`read` / `write` / `admin`)  |
| Metrics                 | RED + USE + SLO metrics via `prometheus_client`                   |
| SLOs                    | Prometheus recording rules: availability + 5m/1h burn rates       |
| Alerting                | Prometheus → Alertmanager with severity routing + inhibition      |
| Logging                 | JSON-per-line to stdout, `request_id` correlation                 |
| Probes                  | `/health/live`, `/health/ready` (dep-aware), `/health/startup`    |
| Dashboards              | Grafana dashboard auto-provisioned from JSON                      |
| Edge                    | Nginx reverse proxy with JSON access logs + X-Request-ID          |
| Security                | Non-root container (uid 10001), no secrets baked, no build tools  |
| Process model           | gunicorn master + 2 uvicorn workers, graceful shutdown            |
| Config                  | 12-factor via `pydantic-settings`, `FUSION_*` env vars           |

---

## Project Layout

```
Fusion/
├── app/
│   ├── fusion/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app + lifespan + bootstrap
│   │   ├── models.py                  # SQLAlchemy ORM (User, Item)
│   │   ├── schemas.py                 # Pydantic request/response models
│   │   ├── core/
│   │   │   ├── config.py              # pydantic-settings, env-driven
│   │   │   ├── logging.py             # JSON formatter + request_id ctx
│   │   │   ├── metrics.py             # Prometheus metric definitions
│   │   │   ├── security.py            # JWT + bcrypt
│   │   │   ├── db.py                  # async engine + session factory
│   │   │   ├── cache.py               # Redis client + read-through helpers
│   │   │   └── slo.py                 # good/bad request classification
│   │   ├── middleware/
│   │   │   ├── context.py             # request_id + access log
│   │   │   ├── rate_limit.py          # Redis sliding-window limiter
│   │   │   └── instrumented_route.py  # custom APIRoute → RED metrics
│   │   └── api/
│   │       ├── deps.py                # auth, db session dependencies
│   │       └── v1/
│   │           ├── health.py          # live/ready/startup probes
│   │           ├── auth.py            # POST /auth/token
│   │           ├── items.py           # CRUD with cache
│   │           └── admin.py           # fault injection endpoints
│   └── requirements.txt
├── ops/
│   ├── nginx/nginx.conf
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   ├── recording_rules.yml        # SLO + latency/error recordings
│   │   └── alerts.yml                 # alert rules
│   ├── alertmanager/alertmanager.yml
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasources.yml
│       │   └── dashboards/dashboards.yml
│       └── dashboards/slo-overview.json
├── Dockerfile                         # multi-stage, non-root
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── Makefile
├── scaffold.sh                        # regenerates the whole project
└── README.md                          # this file
```

---

## Prerequisites

- **Docker Engine 24+** with Compose v2
- **~1.5 GB free RAM** for the full stack
- **Ports 8000, 9090, 9093, 3001** available on the host
- Optional: `make` for shortcut targets

Check your environment:

```bash
docker --version
docker compose version
free -h
```

---

## Quick Start

```bash
# 1. Move into the project root
cd ~/Fusion

# 2. (First time only) Generate the whole project from scratch
bash scaffold.sh

# 3. Create the env file (already git-ignored)
cp -n .env.example .env

# 4. Build and start the stack
docker compose up --build -d

# 5. Watch the app come up
docker compose logs -f --tail=80 app
```

Wait until the app logs show:

```json
{"level":"INFO","logger":"fusion.app","message":"application_startup","version":"2.0.0"}
{"level":"INFO","logger":"fusion.app","message":"bootstrap_admin_created","user":"admin"}
```

Then verify:

```bash
docker compose ps
make smoke
```

### Expected `docker compose ps` output

```
NAME                  STATUS            PORTS
fusion-app            Up (healthy)      8000/tcp
fusion-nginx          Up                0.0.0.0:8000->80/tcp
fusion-postgres       Up (healthy)      5432/tcp
fusion-redis          Up (healthy)      6379/tcp
fusion-prometheus     Up                0.0.0.0:9090->9090/tcp
fusion-alertmanager   Up                0.0.0.0:9093->9093/tcp
fusion-grafana        Up                0.0.0.0:3001->3000/tcp
```

### Service URLs

| Service       | URL                                | Credentials       |
|---------------|------------------------------------|-------------------|
| API (Nginx)   | http://localhost:8000/docs         | —                 |
| Metrics       | http://localhost:8000/metrics      | —                 |
| Prometheus    | http://localhost:9090              | —                 |
| Alertmanager  | http://localhost:9093              | —                 |
| Grafana       | http://localhost:3001              | `admin` / `admin` |

---

## First Login

The app bootstraps an admin user on first start using
`FUSION_BOOTSTRAP_ADMIN_USER` / `FUSION_BOOTSTRAP_ADMIN_PASSWORD`
(defaults: `admin` / `admin123`).

Get a token:

```bash
make token
# or
curl -s -X POST http://localhost:8000/api/v1/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

Use it:

```bash
TOKEN=$(make -s token | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/items

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"widget","value":42}' \
  http://localhost:8000/api/v1/items
```

> **Production:** override `FUSION_JWT_SECRET` and the bootstrap password in
> `.env` (or a Kubernetes Secret) before deploying anywhere non-local.

---

## API Reference

### Health & metadata

| Method | Path               | Auth | Purpose                                |
|--------|--------------------|------|----------------------------------------|
| GET    | `/`                | —    | Service name + version                 |
| GET    | `/docs`            | —    | Swagger UI                             |
| GET    | `/redoc`           | —    | ReDoc                                  |
| GET    | `/metrics`         | —    | Prometheus exposition format           |
| GET    | `/health/live`     | —    | Liveness — 200 while process runs      |
| GET    | `/health/startup`  | —    | Startup — 200 after boot               |
| GET    | `/health/ready`    | —    | Readiness — 200 if Postgres + Redis ok |

### Auth

| Method | Path                    | Auth | Purpose                 |
|--------|-------------------------|------|-------------------------|
| POST   | `/api/v1/auth/token`    | —    | Issue a JWT             |

**Request:**

```json
{ "username": "admin", "password": "admin123" }
```

**Response:**

```json
{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600 }
```

### Items (bearer required)

| Method | Path                    | Purpose                        |
|--------|-------------------------|--------------------------------|
| GET    | `/api/v1/items`         | List items (newest first)      |
| POST   | `/api/v1/items`         | Create item                    |
| GET    | `/api/v1/items/{id}`    | Get one (Redis-cached 30s)     |
| DELETE | `/api/v1/items/{id}`    | Delete + invalidate cache      |

### Admin (scope `admin` required)

| Method | Path                                        | Purpose                     |
|--------|---------------------------------------------|-----------------------------|
| GET    | `/api/v1/admin/simulate/latency?ms=500`     | Sleep N ms                  |
| GET    | `/api/v1/admin/simulate/error?rate=1.0`     | Randomly raise 500          |
| POST   | `/api/v1/admin/cache/flush`                 | Flush Redis                 |

These exist **only** so you can trigger alerts and populate dashboards.
In production, either remove them or protect with an additional network policy.

---

## Metrics Reference

All metrics are prefixed `fusion_` and exposed at `/metrics`.

### HTTP RED

| Metric                                        | Type      | Labels                                |
|-----------------------------------------------|-----------|---------------------------------------|
| `fusion_http_requests_total`                  | Counter   | `method`, `endpoint`, `status_code`   |
| `fusion_http_request_duration_seconds`        | Histogram | `method`, `endpoint`                  |
| `fusion_http_requests_in_progress`            | Gauge     | `method`, `endpoint`                  |

### SLO

| Metric                            | Type    | Labels               |
|-----------------------------------|---------|----------------------|
| `fusion_slo_requests_total`       | Counter | `endpoint`, `class` (good/bad) |

A request is **good** iff `status < 500` **and** `latency ≤ SLO_LATENCY_TARGET_MS`.
Everything else is **bad**.

### Dependencies & business

| Metric                                 | Type      | Labels                          |
|----------------------------------------|-----------|---------------------------------|
| `fusion_dependency_calls_total`        | Counter   | `dependency`, `operation`, `result` |
| `fusion_business_operations_total`     | Counter   | `operation`, `status`           |
| `fusion_items_stored`                  | Gauge     | —                               |
| `fusion_cache_hits_total`              | Counter   | `cache`                         |
| `fusion_cache_misses_total`            | Counter   | `cache`                         |
| `fusion_app_info`                      | Info      | `name`, `version`, `environment`|

### Useful PromQL snippets

```promql
# Requests per second
sum(rate(fusion_http_requests_total[1m]))

# Error rate
sum(rate(fusion_http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(fusion_http_requests_total[5m]))

# p95 latency
histogram_quantile(0.95,
  sum(rate(fusion_http_request_duration_seconds_bucket[5m])) by (le))

# Cache hit ratio
sum(rate(fusion_cache_hits_total[5m]))
/ (sum(rate(fusion_cache_hits_total[5m]))
   + sum(rate(fusion_cache_misses_total[5m])))
```

---

## SLOs & Error Budget

Fusion Metrics ships with a single, opinionated availability SLO:

> **99.9% of requests over any 30-day window must be "good".**

Where "good" means: `status < 500` **and** latency ≤ `FUSION_SLO_LATENCY_TARGET_MS`
(default **500 ms**).

### Recording rules

Defined in `ops/prometheus/recording_rules.yml`:

| Recorded series                      | Meaning                                  |
|--------------------------------------|------------------------------------------|
| `job:fusion_request_rate:5m`         | Request rate                             |
| `job:fusion_error_rate:5m`           | 5xx ratio                                |
| `job:fusion_latency_p95:5m`          | p95 latency                              |
| `job:fusion_slo_availability:5m`     | Fraction of good requests                |
| `job:fusion_slo_burn_rate:5m`        | Fast burn rate against 99.9% target      |
| `job:fusion_slo_burn_rate:1h`        | Slow burn rate                           |

### Burn rate intuition

A burn rate of `1x` exhausts the error budget exactly at the end of the
window. The standard multi-window pattern:

- **14.4×** over 5m ⇒ 2% budget in 1 hour ⇒ page immediately
- **6×** over 1h ⇒ 5% budget in 6 hours ⇒ ticket

Both are implemented as alerts (see below).

### Tuning

- Change the target in `recording_rules.yml` (search for `0.999`).
- Change the latency target with `FUSION_SLO_LATENCY_TARGET_MS`.
- Change the burn-rate windows by editing the `[5m]` / `[1h]` selectors.

---

## Alerting

### Rules (`ops/prometheus/alerts.yml`)

| Alert                     | Severity | Condition                                       |
|---------------------------|----------|-------------------------------------------------|
| `FusionServiceDown`       | critical | `up{job="fusion-metrics"} == 0` for 1m          |
| `FusionHighErrorRate`     | warning  | 5xx ratio > 5% for 2m                           |
| `FusionHighLatencyP95`    | warning  | p95 > 1s for 3m                                 |
| `FusionSLOFastBurn`       | critical | 5m burn rate > 14.4 for 2m                      |
| `FusionSLOSlowBurn`       | warning  | 1h burn rate > 6 for 15m                        |

View live alert state:

- Prometheus UI → http://localhost:9090/alerts
- Alertmanager UI → http://localhost:9093

### Routing (`ops/alertmanager/alertmanager.yml`)

- `critical` → `critical` receiver (continues to matching routes)
- `warning` → `warning` receiver
- Everything else → `default` receiver
- `critical` inhibits lower-severity alerts for the same `alertname` + `service`

The shipped receivers are **no-op webhooks** to localhost. To make them real,
replace with Slack/PagerDuty/webhook URLs:

```yaml
receivers:
  - name: critical
    slack_configs:
      - api_url: https://hooks.slack.com/services/XXX/YYY/ZZZ
        channel: '#alerts-critical'
        send_resolved: true
```

### Triggering an alert locally

```bash
make token
TOKEN=$(make -s token | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

# Fire 5xx errors at 100%
for i in $(seq 1 60); do
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8000/api/v1/admin/simulate/error?rate=1.0"
done
```

Within a couple of minutes you'll see `FusionHighErrorRate` and eventually
`FusionSLOFastBurn` go from `inactive` → `pending` → `firing` at
http://localhost:9090/alerts.

---

## Logging

### Format

Every log line is a single JSON object on stdout:

```json
{
  "timestamp": "2025-01-01T12:00:00+00:00",
  "level": "INFO",
  "logger": "fusion.access",
  "message": "http_request",
  "service": "fusion-metrics",
  "request_id": "c3f9...",
  "method": "GET",
  "path": "/api/v1/items",
  "status_code": 200,
  "duration_ms": 3.41
}
```

### Request correlation

Every request gets an `X-Request-ID` — generated if the client didn't send
one, otherwise echoed back. The same ID is injected into every log line
emitted while handling that request (via `contextvars`). Response headers
also carry it, so an upstream proxy (Nginx, ALB, Istio) can log it too.

### Uvicorn / gunicorn

Both are configured to use the same JSON formatter, so `docker compose logs`
output is parseable as JSON end-to-end.

```bash
docker compose logs -f app
docker compose logs app | jq 'select(.status_code >= 500)'
docker compose logs app | jq 'select(.request_id == "abc123")'
```

### Shipping elsewhere

Because logs are JSON on stdout, they plug straight into:

- **Loki + Promtail / Alloy** (add a Promtail service with Docker SD)
- **Fluent Bit → Elasticsearch / OpenSearch**
- **AWS CloudWatch Logs** (via `awslogs` driver or FireLens)

No application code changes are required.

---

## Dashboards

Grafana is fully provisioned at container start — no manual clicking.

- **Datasource**: `Prometheus` (`http://prometheus:9090`) — marked default
- **Folder**: `Fusion Metrics`
- **Dashboard**: `Fusion Metrics — SLO Overview` (`slo-overview.json`)

### Panels

| Panel                     | Signal                                |
|---------------------------|---------------------------------------|
| Availability (5m)         | `job:fusion_slo_availability:5m`      |
| Burn Rate (5m)            | `job:fusion_slo_burn_rate:5m`         |
| p95 Latency (5m)          | `job:fusion_latency_p95:5m`           |
| Traffic (req/s)           | `job:fusion_request_rate:5m`          |
| Latency percentiles       | p50 / p95 / p99 histogram quantiles   |
| Request rate by status    | `sum by (status_code)(rate(...))`     |

### Verifying provisioning

```bash
docker compose exec grafana ls /var/lib/grafana/dashboards
# → slo-overview.json

docker compose exec grafana ls /etc/grafana/provisioning/datasources
# → datasources.yml
```

### Adding your own dashboard

1. Build it in the Grafana UI.
2. **Share → Export → Save to file**, save as JSON.
3. Drop it into `ops/grafana/dashboards/`.
4. Grafana picks it up within 30s (no restart needed).

---

## Health Checks

Three probes, each with a distinct meaning:

| Endpoint            | Semantics                                                     | K8s mapping      |
|---------------------|---------------------------------------------------------------|------------------|
| `/health/live`      | Process is alive. Never touches dependencies.                 | `livenessProbe`  |
| `/health/startup`   | Finished bootstrapping.                                       | `startupProbe`   |
| `/health/ready`     | Postgres **and** Redis reachable. Returns 503 if either fails.| `readinessProbe` |

### Where they're wired

- **Container-level** — `HEALTHCHECK` in `Dockerfile` hits `/health/live`.
- **Compose-level** — `app` declares a healthcheck; `nginx` waits for it.
- **Prometheus** — no healthcheck on the target itself; it uses scrape
  success (`up{job="fusion-metrics"}`) as the liveness signal, which is
  what the `FusionServiceDown` alert keys off.

### Simulating dependency failure

```bash
# Stop Redis → /health/ready returns 503, app keeps serving reads that miss cache
docker compose stop redis
curl -i http://localhost:8000/health/ready

# Bring it back
docker compose start redis
curl -s http://localhost:8000/health/ready | jq
```

---

## Configuration

All settings use the `FUSION_` prefix and are loaded from environment
variables (or a local `.env` file for development).

### Application

| Var                              | Default                                          | Purpose                        |
|----------------------------------|--------------------------------------------------|--------------------------------|
| `FUSION_ENVIRONMENT`             | `local`                                          | Free-form env label            |
| `FUSION_LOG_LEVEL`               | `INFO`                                           | Root log level                 |
| `FUSION_VERSION`                 | `2.0.0`                                          | Reported in `/health/startup`  |
| `FUSION_SLO_LATENCY_TARGET_MS`   | `500`                                            | Latency SLO threshold          |

### Security

| Var                              | Default                                          | Purpose                        |
|----------------------------------|--------------------------------------------------|--------------------------------|
| `FUSION_JWT_SECRET`              | `change-me-in-prod`                              | HS256 signing key              |
| `FUSION_JWT_TTL_SECONDS`         | `3600`                                           | Token lifetime                 |
| `FUSION_BOOTSTRAP_ADMIN_USER`    | `admin`                                          | Auto-created on first boot     |
| `FUSION_BOOTSTRAP_ADMIN_PASSWORD`| `admin123`                                       | Auto-created on first boot     |

### Dependencies

| Var                              | Default                                          | Purpose                        |
|----------------------------------|--------------------------------------------------|--------------------------------|
| `FUSION_DATABASE_URL`            | `postgresql+asyncpg://fusion:fusion@postgres:5432/fusion` | SQLAlchemy URL        |
| `FUSION_REDIS_URL`               | `redis://redis:6379/0`                           | Redis URL                      |
| `FUSION_DB_POOL_SIZE`            | `10`                                             | SQLAlchemy pool size           |
| `FUSION_DB_MAX_OVERFLOW`         | `20`                                             | SQLAlchemy max overflow        |

### Rate limiting

| Var                                | Default | Purpose                          |
|------------------------------------|---------|----------------------------------|
| `FUSION_RATE_LIMIT_REQUESTS`       | `120`   | Requests per window per identity |
| `FUSION_RATE_LIMIT_WINDOW_SECONDS` | `60`    | Window length                    |

### Compose-level (Postgres / Grafana)

| Var                      | Default  |
|--------------------------|----------|
| `POSTGRES_USER`          | `fusion` |
| `POSTGRES_PASSWORD`      | `fusion` |
| `POSTGRES_DB`            | `fusion` |
| `GRAFANA_ADMIN_USER`     | `admin`  |
| `GRAFANA_ADMIN_PASSWORD` | `admin`  |

---

## Local Development

### Run the app without Docker

```bash
cd ~/Fusion

python -m venv .venv && source .venv/bin/activate
pip install -r app/requirements.txt

# Point at locally reachable services
export FUSION_DATABASE_URL="postgresql+asyncpg://fusion:fusion@localhost:5432/fusion"
export FUSION_REDIS_URL="redis://localhost:6379/0"
export PYTHONPATH="$PWD/app"

gunicorn fusion.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --reload --bind 0.0.0.0:8000
```

Or with the uvicorn CLI (faster reload):

```bash
PYTHONPATH=app uvicorn fusion.main:app --reload --port 8000
```

### Rebuild just the app

```bash
docker compose build app
docker compose up -d app
```

### Useful Makefile targets

```bash
make up       # build + start whole stack
make down     # stop stack
make build    # build image only
make logs     # tail all logs (200 lines)
make ps       # show container status
make restart  # restart all services
make smoke    # curl liveness + readiness
make token    # fetch a JWT for admin
make load     # generate continuous traffic (Ctrl+C to stop)
make clean    # stop + delete volumes
```

### Full reset

```bash
make clean && make up
```

---

## Troubleshooting

| Symptom                                        | Fix                                                                                          |
|------------------------------------------------|----------------------------------------------------------------------------------------------|
| `no configuration file provided: not found`    | You're in the wrong directory. `cd ~/Fusion` before running `docker compose`.                |
| `ModuleNotFoundError: No module named 'fusion'`| `PYTHONPATH=/app` is missing from the Dockerfile. Re-scaffold or add it manually.            |
| `app` container restarting                     | `docker compose logs app` — usually a bad `FUSION_DATABASE_URL`; ensure host is `postgres`.  |
| `app` stays `unhealthy`                        | First boot creates tables. Wait 30s, then `docker compose restart app`.                      |
| Prometheus target `DOWN`                       | App isn't listening or `/metrics` returns non-200. Check `docker compose logs app`.          |
| Grafana dashboard missing                      | Verify `ops/grafana/dashboards/slo-overview.json` exists and is valid JSON.                  |
| Alerts never fire                              | Alerts need `for:` durations to elapse. Generate sustained load with `make load`.            |
| Port 8000 already in use                       | Change `ports: ["8000:80"]` → `["8080:80"]` in `docker-compose.yml` (and use `:8080` URLs).  |
| OOM kill on low-RAM hosts                      | `docker compose down -v && docker system prune -af`. Then comment out Grafana or Alertmanager.|
| `bcrypt` install fails during build            | Rebuild with `docker compose build --no-cache app`.                                          |
| Forgot admin password                          | `docker compose down -v` wipes Postgres; next boot recreates the admin.                      |

### Diagnostics one-liners

```bash
# Is the app healthy?
curl -s http://localhost:8000/health/ready | jq

# What is Prometheus scraping?
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# What alerts are firing?
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[].labels.alertname'

# Latest 5xx log lines
docker compose logs app | jq 'select(.status_code >= 500)' | tail -5
```

---

## Extending to a Full Pipeline

The project is intentionally structured so that adding a real delivery
pipeline is a mechanical exercise — no restructuring required.

### 1. Git & GitHub

```bash
cd ~/Fusion
git init
git add .
git commit -m "feat: initial Fusion Metrics stack"

gh repo create fusion-metrics --private --source=. --push
```

Add `.gitignore` for `.venv/`, `__pycache__/`, `.env`, `*.egg-info/`.
Protect `main` and require PR reviews.

### 2. Continuous Integration

A minimal GitHub Actions workflow will:

1. `pip install -r app/requirements.txt`
2. Run `ruff check app/`
3. Run `pytest` (add tests under `tests/`)
4. `docker build -t fusion-metrics:${{ github.sha }} .`
5. Scan with **Trivy** — fail on `HIGH,CRITICAL`

Example Trivy step:

```yaml
- uses: aquasecurity/trivy-action@0.28.0
  with:
    image-ref: fusion-metrics:${{ github.sha }}
    severity: HIGH,CRITICAL
    exit-code: "1"
    ignore-unfixed: true
```

### 3. Jenkins

Stages map 1:1 to the GitHub Actions workflow:
`checkout → lint → test → buildx → trivy → push → deploy`.
Use `docker/build-push-action` style caching via `--cache-from` to keep
builds under a minute.

### 4. Kubernetes

The app is **stateless** and config is env-driven. A minimal manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: fusion-metrics }
spec:
  replicas: 3
  selector: { matchLabels: { app: fusion-metrics } }
  template:
    metadata: { labels: { app: fusion-metrics } }
    spec:
      containers:
        - name: app
          image: <registry>/fusion-metrics:2.0.0
          ports: [{ containerPort: 8000 }]
          envFrom: [{ secretRef: { name: fusion-metrics-env } }]
          livenessProbe:
            httpGet: { path: /health/live, port: 8000 }
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet: { path: /health/ready, port: 8000 }
            periodSeconds: 10
          startupProbe:
            httpGet: { path: /health/startup, port: 8000 }
            failureThreshold: 30
            periodSeconds: 5
          resources:
            requests: { cpu: "100m", memory: "192Mi" }
            limits:   { cpu: "500m", memory: "512Mi" }
```

Notes:
- `FUSION_JWT_SECRET`, `FUSION_DATABASE_URL`, `FUSION_REDIS_URL` go in a `Secret`.
- The **ServiceMonitor** (Prometheus Operator) replaces the static scrape config.
- Use a **PodDisruptionBudget** with `minAvailable: 2` and an HPA based on CPU.

### 5. AWS

- Push images to **ECR** (`aws ecr get-login-password | docker login …`).
- Run on **EKS** (Fargate or managed node groups) or ECS/Fargate.
- Postgres → **RDS**, Redis → **ElastiCache**.
- Secrets → **AWS Secrets Manager** with External Secrets Operator.
- Logs → CloudWatch Logs or Loki-on-S3.
- Front the Service with **ALB + ACM** for TLS.

### 6. Argo CD (GitOps)

Move the manifest repo to its own Git repository and let Argo CD sync it.
Recommended layout:

```
gitops/
├── base/                 # Deployment, Service, ServiceMonitor, PDB
├── overlays/
│   ├── dev/              # image tag + replica overrides
│   ├── staging/
│   └── prod/
└── applicationset.yaml
```

Bump image tags in `overlays/*/kustomization.yaml` from CI. Argo CD does
the rollout, and its own metrics feed the same Grafana instance.

### 7. What to add next

| Concern           | Tool                                                        |
|-------------------|-------------------------------------------------------------|
| Distributed tracing | OpenTelemetry SDK → Tempo/Jaeger (init *before* instrumentors) |
| Log aggregation   | Loki + Promtail (or Alloy) — plug into stdout JSON logs      |
| Profiling         | Pyroscope / Parca via `pyroscope-io` SDK                     |
| Chaos             | Litmus / Chaos Mesh — reuse `/admin/simulate/*` handlers     |
| Load testing      | k6 / Locust against `/api/v1/items`                          |
| Secret rotation   | External Secrets Operator + Vault / Secrets Manager          |

---

## License

MIT — free to use as a template for your own observability stack.