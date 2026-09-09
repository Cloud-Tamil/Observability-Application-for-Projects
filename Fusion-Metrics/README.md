Fusion Metrics — Production-Style Observability Learning Lab







Fusion Metrics is a hands-on DevOps/observability project that demonstrates the complete flow from application traffic → application metrics → Prometheus scraping → PromQL → Grafana dashboards.

It is designed as a local production-style learning lab, not as a claim that the demo application itself is production-ready.

Table of Contents

1. Project Overview

2. Why This Project

3. Architecture

4. Technology Stack

5. Project Structure

6. Application Features

7. Metrics

8. Prerequisites

9. Run the Project

10. Test the Application

11. Understand the Dockerfile

12. Understand Docker Compose

13. Understand Prometheus

14. PromQL Learning Lab

15. Grafana

16. Generate Traffic

17. Validate the Complete Monitoring Flow

18. Health Checks

19. Troubleshooting

20. Failure Simulation Labs

21. SLI and SLO Practice

22. Useful Docker Commands

23. Security Practices Demonstrated

24. Production Gaps

25. Production Evolution Roadmap

26. CI/CD Evolution

27. Kubernetes Evolution

28. Interview Questions

29. Learning Roadmap

30. Cleanup

31. Final Mental Model

1. Project Overview

Fusion Metrics contains three major components:

FastAPI application — serves business APIs and exposes /metrics.

Prometheus — periodically scrapes the application metrics endpoint and stores time-series data.

Grafana — queries Prometheus and displays operational dashboards.

The application intentionally generates measurable behavior such as request latency and occasional processing errors so that you can observe real changes in the dashboard.

Core request flow

User / curl
    |
    | HTTP request
    v
FastAPI application :8000
    |
    | exposes /metrics
    v
Prometheus :9090
    |
    | PromQL
    v
Grafana :3000

2. Why This Project

A DevOps engineer should be able to answer questions such as:

Is the application healthy?

How many requests are arriving?

Which endpoint receives the most traffic?

What is the current error rate?

What is the P95/P99 latency?

Is the application becoming slower?

Is Prometheus successfully scraping the application?

Is Grafana connected to Prometheus?

How do we troubleshoot an application when the dashboard changes?

This project gives you a practical environment to answer those questions.

3. Architecture

                         CLIENT TRAFFIC
                              |
                              v
                    +---------------------+
                    |     FastAPI App     |
                    |   fusion-metrics     |
                    |       :8000          |
                    +----------+----------+
                               |
                     /metrics  |
                               v
                    +---------------------+
                    |     Prometheus       |
                    |       :9090          |
                    |                      |
                    | TSDB + PromQL        |
                    +----------+----------+
                               |
                         PromQL queries
                               |
                               v
                    +---------------------+
                    |       Grafana        |
                    |       :3000          |
                    |                      |
                    | Dashboards           |
                    +---------------------+

Docker network

All services communicate through the Docker Compose network:

monitoring network

+------------------+       +------------------+
| fusion-metrics   |       | prometheus       |
| :8000            | <---- | :9090            |
+------------------+       +--------+---------+
                                    |
                                    |
                                    v
                           +------------------+
                           | grafana          |
                           | :3000            |
                           +------------------+

Inside Docker, service names resolve through Docker DNS.

For example:

http://fusion-metrics:8000
http://prometheus:9090

Do not use localhost for container-to-container communication.

4. Technology Stack

Component

Technology

Application

Python 3.11 + FastAPI

API server

Uvicorn

Containerization

Docker

Orchestration for local lab

Docker Compose

Metrics library

prometheus-client

Metrics backend

Prometheus

Visualization

Grafana

Configuration

Environment variables + YAML

Data store

In-memory Python list for the demo

Monitoring protocol

Prometheus HTTP scrape

5. Project Structure

fusion-metrics/
├── app/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .dockerignore
│   └── fusion_metrics/
│       ├── __init__.py
│       ├── config.py
│       ├── logic.py
│       ├── metrics.py
│       └── main.py
│
├── prometheus/
│   └── prometheus.yml
│
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── datasource.yml
│       └── dashboards/
│           ├── dashboard.yml
│           └── fusion-dashboard.json
│
├── scripts/
│   └── health-check.sh
│
├── docker-compose.yml
├── .gitignore
└── README.md

Important files

File

Purpose

app/Dockerfile

Builds the application container

app/requirements.txt

Python dependencies

main.py

FastAPI routes and application startup

logic.py

Demo business/data-processing logic

metrics.py

Prometheus metric definitions

config.py

Environment-based configuration

prometheus.yml

Prometheus scrape configuration

datasource.yml

Automatic Grafana → Prometheus datasource setup

dashboard.yml

Automatic dashboard provider configuration

fusion-dashboard.json

Grafana dashboard definition

docker-compose.yml

Runs the complete stack

health-check.sh

Basic end-to-end health validation

6. Application Features

The FastAPI application provides:

Root endpoint

GET /

Health endpoint

GET /v1/health

Insert data

POST /v1/data

Example:

curl -X POST http://localhost:8000/v1/data \
  -H 'Content-Type: application/json' \
  -d '{"value":100}'

Aggregate data

GET /v1/data/aggregate

Return stored data

GET /v1/data/all

Prometheus metrics

GET /metrics

Swagger UI

http://localhost:8000/docs

7. Metrics

The application exposes custom metrics using the Prometheus Python client.

7.1 HTTP request counter

fusion_http_requests_total

Labels:

method
endpoint
status

Example:

fusion_http_requests_total{method="GET",endpoint="/v1/health",status="200"}

This is a Counter because request totals should increase over time.

7.2 HTTP latency histogram

fusion_http_request_duration_seconds

Prometheus exposes histogram series such as:

fusion_http_request_duration_seconds_bucket
fusion_http_request_duration_seconds_sum
fusion_http_request_duration_seconds_count

This allows you to calculate P50, P95, P99 and other latency percentiles.

7.3 Ingested items

fusion_ingested_items_total

This tracks successfully ingested data points.

7.4 Active workers

fusion_active_workers

This is a Gauge, because its value can increase or decrease.

7.5 Processing errors

fusion_processing_errors_total

Label:

error_type

7.6 Application information

fusion_metrics_app_info

This provides application metadata such as application/version information.

8. Prerequisites

You need:

Docker

Docker Compose v2

curl

Python 3 for optional local testing

A terminal

Google Cloud Shell is a convenient environment for this lab.

Verify:

docker --version
docker compose version
curl --version
python3 --version

The application does not require GKE, Cloud Run, or other Google Cloud services to run. Cloud Shell is simply being used as the terminal environment.

9. Run the Project

9.1 Open Cloud Shell

Open Google Cloud Shell.

Create or enter the project directory:

cd ~
cd fusion-metrics

If the directory does not exist:

mkdir -p ~/fusion-metrics
cd ~/fusion-metrics

Verify the files:

find . -maxdepth 4 -type f | sort

9.2 Build the application image

docker compose build

Check the image:

docker images | grep fusion-metrics

9.3 Start all services

docker compose up -d

Check status:

docker compose ps

Expected services:

fusion-metrics
prometheus
grafana

9.4 View logs

All services:

docker compose logs -f

Application only:

docker compose logs -f fusion-metrics

Prometheus only:

docker compose logs -f prometheus

Grafana only:

docker compose logs -f grafana

Stop following logs with:

Ctrl+C

10. Test the Application

10.1 Root endpoint

curl http://localhost:8000/

10.2 Health endpoint

curl http://localhost:8000/v1/health

10.3 Insert one data point

curl -X POST http://localhost:8000/v1/data \
  -H 'Content-Type: application/json' \
  -d '{"value":100}'

Try several values:

curl -X POST http://localhost:8000/v1/data -H 'Content-Type: application/json' -d '{"value":200}'
curl -X POST http://localhost:8000/v1/data -H 'Content-Type: application/json' -d '{"value":300}'
curl -X POST http://localhost:8000/v1/data -H 'Content-Type: application/json' -d '{"value":400}'

10.4 Aggregate endpoint

curl http://localhost:8000/v1/data/aggregate

10.5 All stored data

curl http://localhost:8000/v1/data/all

10.6 Swagger UI

Open:

http://localhost:8000/docs

In Google Cloud Shell, use Web Preview → port 8000 rather than assuming your local laptop's localhost:8000 can reach the Cloud Shell VM directly.

11. Understand the Dockerfile

The application uses a multi-stage Docker build.

Conceptually:

Stage 1: builder

python:3.11-slim
      |
      +-- install Python dependencies
      |
      +-- /install

Stage 2: runtime

python:3.11-slim
      |
      +-- copy installed dependencies
      +-- copy application
      +-- create non-root user
      +-- run Uvicorn

Why multi-stage builds?

The build stage is separated from the runtime stage so build-time artifacts do not need to remain in the final image.

Why a non-root user?

The container runs as:

fusion

instead of root.

Verify:

docker exec fusion-metrics whoami

Expected:

fusion

Why one Uvicorn worker?

The demo stores application state in an in-memory Python list and uses process-local metrics. Multiple worker processes would have separate memory and separate metric registries.

For a real production application, persistent state and a proper multi-process metrics strategy should be used.

12. Understand Docker Compose

The Compose stack contains:

fusion-metrics
prometheus
grafana

Application

host :8000 → container :8000

Prometheus

host :9090 → container :9090

Grafana

host :3000 → container :3000

All services share:

monitoring

Docker network.

Service discovery

Prometheus uses:

fusion-metrics:8000

Grafana uses:

prometheus:9090

This works because Docker Compose provides service-name DNS on the shared network.

13. Understand Prometheus

Prometheus periodically scrapes the application.

The configured target is:

fusion-metrics:8000/metrics

13.1 Prometheus health

curl http://localhost:9090/-/healthy

curl http://localhost:9090/-/ready

13.2 Prometheus targets

curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool

Look for the Fusion Metrics target.

The important state is:

up

If it is down, investigate the Docker network and application health.

13.3 Test connectivity from Prometheus container

docker exec prometheus wget -qO- http://fusion-metrics:8000/v1/health

Test metrics:

docker exec prometheus wget -qO- http://fusion-metrics:8000/metrics

This demonstrates the difference between:

localhost

and:

service-name

inside a container network.

14. PromQL Learning Lab

PromQL is the query language used by Prometheus.

Open Prometheus:

http://localhost:9090

In Cloud Shell, use Web Preview → port 9090.

14.1 View all HTTP requests

fusion_http_requests_total

14.2 Only successful requests

fusion_http_requests_total{status="200"}

14.3 Only POST requests

fusion_http_requests_total{method="POST"}

14.4 Requests for /v1/data

fusion_http_requests_total{endpoint="/v1/data"}

14.5 Total request rate

sum(rate(fusion_http_requests_total[1m]))

This converts a monotonically increasing counter into a per-second rate.

14.6 Request rate by endpoint

sum by (endpoint) (rate(fusion_http_requests_total[5m]))

Useful for identifying the busiest endpoints.

14.7 Request rate by HTTP status

sum by (status) (rate(fusion_http_requests_total[5m]))

14.8 5xx error rate

sum(rate(fusion_http_requests_total{status=~"5.."}[5m]))

14.9 Percentage of requests returning 5xx

100 * sum(rate(fusion_http_requests_total{status=~"5.."}[5m]))
/ clamp_min(sum(rate(fusion_http_requests_total[5m])), 1)

This is useful for SLI/SLO practice.

14.10 P95 latency

histogram_quantile(
  0.95,
  sum(rate(fusion_http_request_duration_seconds_bucket[5m])) by (le)
)

14.11 P99 latency

histogram_quantile(
  0.99,
  sum(rate(fusion_http_request_duration_seconds_bucket[5m])) by (le)
)

14.12 Average request latency

rate(fusion_http_request_duration_seconds_sum[5m])
/
rate(fusion_http_request_duration_seconds_count[5m])

Remember:

Average latency ≠ P95 latency

Both can be useful, but they answer different operational questions.

14.13 Active workers

fusion_active_workers

14.14 Total ingested items

fusion_ingested_items_total

14.15 Ingestion rate

rate(fusion_ingested_items_total[5m])

14.16 Processing errors by type

sum by (error_type) (
  rate(fusion_processing_errors_total[5m])
)

15. Grafana

Grafana is configured to use Prometheus automatically.

Open:

http://localhost:3000

In Google Cloud Shell, use:

Web Preview → port 3000

Default login

Username: admin
Password: admin

Change default credentials before using any real environment. These credentials are intentionally simple for a local learning lab.

15.1 Dashboard provisioning

The project automatically provisions:

Prometheus datasource
        |
        v
Fusion Metrics dashboard

The dashboard contains panels such as:

Request Rate

P95 HTTP Latency

5xx Error Rate

Active Requests/Workers

Total Ingested

Processing Errors

This means you do not need to manually build the entire dashboard from scratch each time.

16. Generate Traffic

Monitoring becomes useful when traffic exists.

16.1 Generate 100 requests

for i in {1..100}; do
  curl -s -X POST http://localhost:8000/v1/data \
    -H 'Content-Type: application/json' \
    -d "{\"value\":$((RANDOM % 1000 + 1))}" > /dev/null
done

Wait for Prometheus to scrape the metrics and refresh Grafana.

16.2 Generate continuous traffic

while true; do
  curl -s -X POST http://localhost:8000/v1/data \
    -H 'Content-Type: application/json' \
    -d "{\"value\":$((RANDOM % 1000 + 1))}" > /dev/null
  sleep 1
done

Stop with:

Ctrl+C

16.3 Generate concurrent traffic

for i in {1..500}; do
  curl -s -X POST http://localhost:8000/v1/data \
    -H 'Content-Type: application/json' \
    -d "{\"value\":$((RANDOM % 1000 + 1))}" > /dev/null &
done
wait

This is useful for observing:

request rate

latency changes

processing errors

dashboard movement

Do not use uncontrolled load generation against production systems.

17. Validate the Complete Monitoring Flow

Use this sequence whenever you want to prove the entire stack is working.

Step 1 — Application

curl http://localhost:8000/v1/health

Expected: successful response.

Step 2 — Application metrics

curl -s http://localhost:8000/metrics | grep '^fusion_'

Expected: custom Fusion Metrics series.

Step 3 — Prometheus

curl http://localhost:9090/-/ready

Expected: Prometheus is ready.

Step 4 — Prometheus target

curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool

Expected: application target is up.

Step 5 — PromQL

Query:

sum(rate(fusion_http_requests_total[5m]))

Step 6 — Grafana

Open the dashboard and confirm the panels show data.

End-to-end chain

curl
 |
v
FastAPI
 |
| /metrics
v
Prometheus scrape
 |
v
PromQL
 |
v
Grafana dashboard

If you understand this chain, you understand the core of the lab.

18. Health Checks

Application Docker health status

docker inspect fusion-metrics --format '{{json .State.Health}}'

You should see health-check information.

The application health check calls:

/v1/health

List containers

docker compose ps

One-command health check

Run:

./scripts/health-check.sh

If the script is not executable:

chmod +x scripts/health-check.sh
./scripts/health-check.sh

19. Troubleshooting

Problem 1 — Application container is restarting

Check:

docker compose ps
docker compose logs --tail=100 fusion-metrics

Inspect:

docker inspect fusion-metrics

Common causes:

Python import error

dependency installation failure

application startup error

incorrect Dockerfile command

port/configuration issue

Problem 2 — Prometheus target is DOWN

Check application:

curl http://localhost:8000/metrics

Check Docker DNS/network:

docker exec prometheus wget -qO- http://fusion-metrics:8000/metrics

Check Prometheus config:

cat prometheus/prometheus.yml

The target should use:

fusion-metrics:8000

not:

localhost:8000

Problem 3 — Grafana has no data

Check Prometheus:

curl http://localhost:9090/-/ready

Check target status:

curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool

Check Grafana logs:

docker compose logs --tail=100 grafana

Check the datasource URL.

Inside Docker, it should be:

http://prometheus:9090

not:

http://localhost:9090

Problem 4 — Grafana dashboard is empty

Generate traffic:

for i in {1..100}; do
  curl -s -X POST http://localhost:8000/v1/data \
    -H 'Content-Type: application/json' \
    -d "{\"value\":$((RANDOM % 1000 + 1))}" > /dev/null
done

Wait for the next Prometheus scrape interval, then refresh Grafana.

Problem 5 — Port already in use

Check:

docker ps

If another process owns the port, either stop it or change the host-side port in docker-compose.yml.

Example:

ports:
  - "3001:3000"

The first port is the host port; the second is the container port.

Problem 6 — Everything is down

Try:

docker compose down
docker compose up -d --build
docker compose ps

Then test again.

20. Failure Simulation Labs

The best way to learn monitoring is to deliberately create failures in a safe lab.

Lab A — Observe 5xx errors

The application has an intentional error probability so that processing failures can become visible.

Run traffic:

for i in {1..500}; do
  curl -s -X POST http://localhost:8000/v1/data \
    -H 'Content-Type: application/json' \
    -d "{\"value\":$((RANDOM % 1000 + 1))}" > /dev/null
done

Then query:

sum(rate(fusion_http_requests_total{status=~"5.."}[5m]))

Observe the error panel in Grafana.

Lab B — Observe latency

The application intentionally introduces configurable latency.

Current environment variables include:

MIN_LATENCY=0.05
MAX_LATENCY=0.60

After changing configuration, rebuild/recreate the application:

docker compose up -d --build

Then generate traffic and observe P95 latency.

Lab C — Break Prometheus scraping

Temporarily change the target to an invalid service name.

Then reload/restart Prometheus:

docker compose restart prometheus

Observe the target becoming unavailable.

Restore the correct target:

fusion-metrics:8000

Then:

docker compose restart prometheus

This teaches you to distinguish:

Application failure

from:

Monitoring pipeline failure

Lab D — Stop the application

docker compose stop fusion-metrics

Check:

docker compose ps

Prometheus should eventually report the target as down.

Start it again:

docker compose start fusion-metrics

Observe recovery.

21. SLI and SLO Practice

An SLI is a measurement of service behavior.

An SLO is a target for that measurement.

Example:

SLI:
Successful requests / total requests

SLO:
99.9% successful requests over the measurement window

Availability-style query

100 * sum(rate(fusion_http_requests_total{status=~"2.."}[5m]))
/
clamp_min(sum(rate(fusion_http_requests_total[5m])), 1)

Error percentage

100 * sum(rate(fusion_http_requests_total{status=~"5.."}[5m]))
/
clamp_min(sum(rate(fusion_http_requests_total[5m])), 1)

Latency SLO idea

For example:

95% of requests should complete below 500 ms

You would design a histogram-based query around the relevant bucket boundary and then use it as an SLI.

22. Useful Docker Commands

List containers

docker ps
docker compose ps

List images

docker images

List networks

docker network ls

Inspect the monitoring network

docker network inspect fusion-metrics_monitoring

Application logs

docker compose logs -f fusion-metrics

Restart application

docker compose restart fusion-metrics

Restart everything

docker compose restart

Rebuild application

docker compose build --no-cache fusion-metrics

Recreate everything

docker compose up -d --build

Stop containers

docker compose stop

Stop and remove containers/networks

docker compose down

Remove volumes too

docker compose down -v

docker compose down -v deletes the Prometheus and Grafana data volumes created by this lab. Use it when you intentionally want a clean reset.

23. Security Practices Demonstrated

This project includes several useful container practices.

Non-root container

The application runs as:

fusion

rather than root.

Read-only configuration mounts

Prometheus/Grafana configuration is mounted read-only where appropriate:

:ro

Dependency pinning

Python packages are pinned in:

requirements.txt

Health checks

The application has a container health check.

Resource limits

The application service defines CPU/memory limits in Compose.

Secrets warning

The current Grafana credentials are intentionally simple for local learning.

Never copy this pattern directly into a real production environment.

24. Production Gaps

This project is intentionally smaller than a real production platform.

Current limitations

1. In-memory application data

data_store: list[float] = []

Data disappears when the container restarts.

2. Single application worker

The lab uses one Uvicorn worker because state and metrics are process-local.

3. No persistent database

A production application would normally use a database such as PostgreSQL, MySQL, or another appropriate datastore.

4. No authentication/authorization

The demo APIs are intentionally simple.

5. No TLS

Traffic is plain HTTP for the local lab.

6. No Alertmanager

Prometheus alerting rules are not wired to a notification system here.

7. No centralized logs

Container logs are not shipped to Loki or another centralized logging system.

8. No distributed tracing

There is no OpenTelemetry/Tempo/Jaeger integration.

9. No Kubernetes deployment

Docker Compose is being used as the local orchestration layer.

10. No CI/CD pipeline

Build/test/scan/deploy automation is not included in the basic lab.

25. Production Evolution Roadmap

A strong next version can evolve like this:

                 +------------------+
                 | GitHub            |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | CI/CD             |
                 | GitHub Actions    |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | Container Registry |
                 +---------+--------+
                           |
                           v
                 +------------------+
                 | Kubernetes        |
                 | GKE / EKS         |
                 +----+----+----+----+
                      |    |    |
                      |    |    +----------------+
                      |    |                     |
                      v    v                     v
                   App   Redis               PostgreSQL
                    |
                    v
               Prometheus
                    |
                    v
                 Grafana

Recommended production evolution:

PostgreSQL for persistent data.

Redis for caching/temporary state.

Kubernetes/GKE/EKS for orchestration.

Ingress/load balancer for HTTP traffic.

TLS certificates.

Secrets management.

Prometheus + Alertmanager.

Grafana dashboards.

Loki or another centralized logging system.

OpenTelemetry + Tempo/Jaeger for tracing.

CI/CD using GitHub Actions.

Image scanning.

Terraform for infrastructure.

Kubernetes RBAC.

NetworkPolicy.

HPA/autoscaling.

Backup and disaster recovery.

SLOs and alerting based on user impact.

26. CI/CD Evolution

A production-style pipeline could be:

Developer
   |
   v
GitHub
   |
   v
GitHub Actions
   |
   +--> Lint
   |
   +--> Unit Tests
   |
   +--> Security Scan
   |
   +--> Docker Build
   |
   +--> Image Scan
   |
   +--> Push Image
   |
   v
Container Registry
   |
   v
Kubernetes Deployment
   |
   v
Smoke Tests
   |
   v
Monitoring / Alerting

Useful future additions:

GitHub Actions

Trivy image scanning

pytest

Ruff/Black

Docker image tagging using Git SHA

Artifact Registry or ECR

Deployment approvals

Rollback strategy

27. Kubernetes Evolution

The Docker Compose application can later become Kubernetes workloads.

Example architecture:

Ingress
   |
   v
Service
   |
   v
Deployment
   |
   +---- Pod
   +---- Pod
   +---- Pod
          |
          v
     /metrics
          |
          v
     Prometheus
          |
          v
       Grafana

Production Kubernetes topics to learn next:

Deployment

Service

ConfigMap

Secret

Ingress

Readiness probe

Liveness probe

Startup probe

Resource requests

Resource limits

HPA

PodDisruptionBudget

RBAC

NetworkPolicy

ServiceMonitor

StatefulSet for stateful workloads

28. Interview Questions

Q1. Why use Prometheus?

Prometheus is designed for collecting and querying time-series metrics. It provides a pull-based scrape model and PromQL for analysis.

Q2. Why use a Counter for HTTP requests?

HTTP request totals increase over time, so a Counter is appropriate. Functions such as rate() can turn the counter into a request-per-second measurement.

Q3. Why use a Gauge for active workers?

A Gauge can move up and down, unlike a Counter.

Q4. Why use a Histogram for latency?

A Histogram groups observations into buckets and provides _sum and _count, enabling percentile calculations with histogram_quantile().

Q5. Why is rate() important?

Counters continuously increase. rate() calculates their average per-second increase over a selected time range.

Q6. Why does Prometheus use fusion-metrics:8000 instead of localhost:8000?

Because Prometheus is running in its own container. localhost inside the Prometheus container refers to the Prometheus container itself. Docker service DNS resolves fusion-metrics to the application container.

Q7. Why is Grafana's datasource http://prometheus:9090?

Grafana also runs in a container. It should reach Prometheus through the Docker network using the service name.

Q8. What is P95 latency?

P95 is the latency threshold below which approximately 95% of observations fall, based on the histogram data and calculation method.

Q9. What is the difference between monitoring and observability?

Monitoring focuses on predefined signals and known failure conditions. Observability is the broader ability to understand internal system behavior from telemetry such as metrics, logs, and traces.

Q10. What would you add for production?

Persistent storage, Kubernetes, TLS, authentication, secrets management, alerting, centralized logging, distributed tracing, CI/CD, image scanning, autoscaling, backups, and well-defined SLOs.

29. Learning Roadmap

Day 1 — Docker

Learn:

Dockerfile

image

container

port mapping

volume

network

non-root container

Commands:

docker build
docker run
docker ps
docker logs
docker exec
docker inspect

Day 2 — Docker Compose

Learn:

services

networks

volumes

healthchecks

dependencies

environment variables

Practice:

docker compose up -d
docker compose ps
docker compose logs
docker compose restart
docker compose down

Day 3 — FastAPI

Learn:

routes

HTTP methods

request bodies

response models

health endpoints

Swagger/OpenAPI

Practice every endpoint manually.

Day 4 — Prometheus

Learn:

scrape targets

labels

Counter

Gauge

Histogram

scrape interval

time series

Practice:

fusion_http_requests_total
rate(fusion_http_requests_total[5m])
sum by (endpoint) (rate(fusion_http_requests_total[5m]))

Day 5 — PromQL

Learn:

selectors

labels

aggregation

rate

increase

sum

sum by

regex matching

histogram quantiles

Day 6 — Grafana

Learn:

datasource

dashboard

panels

queries

variables

time ranges

thresholds

Day 7 — SRE/Observability

Learn:

SLI

SLO

SLA

error budget

latency

availability

alerting

incident response

30. Cleanup

Stop the stack

docker compose down

Stop and delete volumes

docker compose down -v

Remove the application image

docker image rm fusion-metrics:1.0.0

If the image is still referenced by a container, remove the stack first.

31. Final Mental Model

Remember this simple model:

APPLICATION
    |
    | exposes metrics
    v
/metrics
    |
    | Prometheus scrape
    v
PROMETHEUS
    |
    | PromQL
    v
GRAFANA
    |
    v
DASHBOARD

And operationally:

Traffic
  ↓
Application
  ↓
Metrics
  ↓
Prometheus
  ↓
PromQL
  ↓
Grafana
  ↓
Detect
  ↓
Investigate
  ↓
Fix
  ↓
Verify

That is the core observability loop.

Recommended Next Project

Once this lab is comfortable, build Fusion Metrics v2 — Production Observability Platform with:

FastAPI microservice
        |
        +---- PostgreSQL
        +---- Redis
        |
        v
Docker
        |
        v
GitHub Actions
        |
        v
Container Registry
        |
        v
Kubernetes / GKE
        |
        +---- Prometheus
        +---- Grafana
        +---- Alertmanager
        +---- Loki
        +---- Tempo / OpenTelemetry
        |
        v
Terraform

That version will let you practice the complete DevOps lifecycle:

Code
 → Build
 → Test
 → Scan
 → Package
 → Push
 → Deploy
 → Observe
 → Alert
 → Troubleshoot
 → Rollback

License

This project is intended for learning and portfolio practice. Add the license of your choice before distributing it as a public project.

Author

Tamilselvan — DevOps & Cloud Engineering Learning Project

Built to practice Docker, FastAPI, Prometheus, Grafana, observability, troubleshooting, SRE concepts, and production-oriented DevOps workflows.
