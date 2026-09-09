# ShopSphere — Production-Style Local Microservices + Observability

ShopSphere is a production-style local microservices application designed for learning and practicing:

* Docker
* Dockerfiles
* Docker Compose
* Microservices architecture
* Nginx API Gateway
* Docker networking
* Health checks
* Service-to-service communication
* Prometheus
* Grafana
* PromQL
* Application metrics
* CPU and memory monitoring
* Failure testing
* Container restart policies
* Persistent monitoring data
* Production container practices

---

## Architecture

```text
                         Browser
                            |
                            |
                     localhost:8080
                            |
                            v
                  +--------------------+
                  |   NGINX Gateway    |
                  |       :8080        |
                  +---------+----------+
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
      +-------------+ +-------------+ +-------------+
      |   Product   | |    Order    | |    User     |
      |   Service   | |   Service   | |   Service   |
      |    :3001    | |    :3002    | |    :3003    |
      +------+------+ +------+------+ +-------------+
             ^               |
             |               |
             +---------------+
              Product lookup


                  OBSERVABILITY

       +-----------------------------+
       |         Prometheus          |
       |            :9090            |
       +-------------+---------------+
                     |
                     |
                     v
       +-----------------------------+
       |           Grafana           |
       |            :3000            |
       +-----------------------------+
```

---

# Project Structure

```text
shopsphere/
|
+-- docker-compose.yml
+-- .dockerignore
+-- .gitignore
+-- README.md
|
+-- gateway/
|   +-- Dockerfile
|   +-- nginx.conf
|   +-- index.html
|
+-- services/
|   |
|   +-- product-service/
|   |   +-- Dockerfile
|   |   +-- package.json
|   |   +-- server.js
|   |
|   +-- order-service/
|   |   +-- Dockerfile
|   |   +-- package.json
|   |   +-- server.js
|   |
|   +-- user-service/
|       +-- Dockerfile
|       +-- package.json
|       +-- server.js
|
+-- observability/
    |
    +-- prometheus/
    |   +-- prometheus.yml
    |
    +-- grafana/
        |
        +-- provisioning/
        |   +-- datasources/
        |       +-- prometheus.yml
        |
        |   +-- dashboards/
        |       +-- dashboard-provider.yml
        |
        +-- dashboards/
            +-- shopsphere-dashboard.json
```

---

# Prerequisites

Install:

* Docker Desktop
* Docker Compose v2
* Git

Recommended:

* 4 GB or more RAM
* 10 GB free disk space

Verify Docker:

```bash
docker --version
```

Verify Compose:

```bash
docker compose version
```

---

# Start the Application

From the project root:

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

Expected services:

```text
shopsphere-gateway
shopsphere-product
shopsphere-order
shopsphere-user
shopsphere-prometheus
shopsphere-grafana
```

---

# Application URLs

ShopSphere:

```text
http://localhost:8080
```

Prometheus:

```text
http://localhost:9090
```

Grafana:

```text
http://localhost:3000
```

Grafana credentials:

```text
Username: admin
Password: admin
```

For a real production deployment, change the default password and use an external secret manager.

---

# API Endpoints

## Products

```text
GET /api/products
```

Example:

```bash
curl http://localhost:8080/api/products
```

Get a specific product:

```bash
curl http://localhost:8080/api/products/1
```

---

# Users

```text
GET /api/users
```

Example:

```bash
curl http://localhost:8080/api/users
```

---

# Orders

Get orders:

```bash
curl http://localhost:8080/api/orders
```

Create an order:

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"productId":1,"quantity":2}'
```

Example response:

```json
{
  "id": 1,
  "userId": 1,
  "productId": 1,
  "quantity": 2,
  "total": 1999.98,
  "status": "CREATED"
}
```

---

# Health Checks

Product service:

```text
/health
```

Order service:

```text
/health
```

User service:

```text
/health
```

The Docker Compose health checks call these endpoints.

Example:

```bash
docker inspect shopsphere-product
```

---

# Readiness Endpoints

Each application also exposes:

```text
/ready
```

Example:

```text
http://product-service:3001/ready
```

The readiness concept becomes important when migrating this application to Kubernetes.

It maps naturally to:

```yaml
readinessProbe:
livenessProbe:
startupProbe:
```

---

# Prometheus

Prometheus runs on:

```text
http://localhost:9090
```

Prometheus scrapes:

```text
product-service:3001/metrics
order-service:3002/metrics
user-service:3003/metrics
```

The scrape interval is:

```yaml
scrape_interval: 5s
```

Therefore Prometheus collects application metrics every five seconds.

---

# Application Metrics

Every service exposes:

```text
/metrics
```

The main custom metric is:

```text
shopsphere_http_requests_total
```

Labels:

```text
service
method
route
status
```

Example:

```text
shopsphere_http_requests_total{
    service="product-service",
    method="GET",
    route="/api/products",
    status="200"
}
```

---

# Default Process Metrics

The Node.js services also expose metrics such as:

```text
process_cpu_seconds_total
```

and:

```text
process_resident_memory_bytes
```

These are collected through:

```javascript
client.collectDefaultMetrics()
```

---

# Grafana

Grafana is available at:

```text
http://localhost:3000
```

Login:

```text
admin
admin
```

The Prometheus datasource is automatically provisioned.

You do not need to manually create the datasource.

The datasource points to:

```text
http://prometheus:9090
```

---

# Dashboard

The ShopSphere dashboard contains:

## HTTP Requests / Second

PromQL:

```promql
sum by (service) (
  rate(shopsphere_http_requests_total[1m])
)
```

This shows traffic for each service.

---

# HTTP 5xx Errors

PromQL:

```promql
sum by (service) (
  rate(
    shopsphere_http_requests_total{
      status=~"5.."
    }[1m]
  )
)
```

This is useful for identifying application failures.

---

# Process CPU

PromQL:

```promql
sum by (job) (
  rate(process_cpu_seconds_total[1m])
)
```

This shows CPU consumption.

---

# Process Memory

PromQL:

```promql
sum by (job) (
  process_resident_memory_bytes
)
```

This shows process resident memory.

---

# Generate Traffic

PowerShell:

```powershell
1..100 | ForEach-Object {
    Invoke-WebRequest `
        -Uri "http://localhost:8080/api/products" `
        -UseBasicParsing
}
```

Linux/macOS:

```bash
for i in {1..100}; do
  curl http://localhost:8080/api/products
done
```

Then open Grafana.

You should see HTTP request traffic.

---

# Generate Order Traffic

PowerShell:

```powershell
1..50 | ForEach-Object {

    Invoke-WebRequest `
        -Uri "http://localhost:8080/api/orders" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"userId":1,"productId":1,"quantity":1}' `
        -UseBasicParsing
}
```

This generates traffic against:

```text
Gateway
    |
    v
Order Service
    |
    v
Product Service
```

---

# Test Service Failure

Stop Product Service:

```bash
docker stop shopsphere-product
```

Now attempt to create an order.

The Order Service will attempt:

```text
order-service
      |
      v
product-service
```

Since Product Service is unavailable, the Order Service returns:

```text
503 Product service unavailable
```

This allows you to practice real failure scenarios.

---

# Restart the Service

```bash
docker start shopsphere-product
```

Check:

```bash
docker compose ps
```

The service should become healthy again.

---

# View Logs

All services:

```bash
docker compose logs
```

Follow logs:

```bash
docker compose logs -f
```

Product Service:

```bash
docker compose logs -f product-service
```

Order Service:

```bash
docker compose logs -f order-service
```

User Service:

```bash
docker compose logs -f user-service
```

Gateway:

```bash
docker compose logs -f gateway
```

Prometheus:

```bash
docker compose logs -f prometheus
```

Grafana:

```bash
docker compose logs -f grafana
```

---

# Docker Networking

Docker Compose creates:

```text
shopsphere
```

network.

Containers can communicate using service names.

For example:

```text
order-service
      |
      v
http://product-service:3001
```

Prometheus:

```text
http://product-service:3001/metrics
```

Grafana:

```text
http://prometheus:9090
```

The application does not need to know container IP addresses.

Docker's internal DNS resolves the service names.

---

# Why Application Ports Are Not Published

Only these ports are published to the host:

```text
8080
9090
3000
```

The application ports:

```text
3001
3002
3003
```

are internal.

They use:

```yaml
expose:
```

rather than:

```yaml
ports:
```

This gives the architecture:

```text
Browser
   |
   v
Gateway
   |
   +---- Product
   |
   +---- Order
   |
   +---- User
```

instead of exposing every microservice directly.

This is closer to a production architecture.

---

# Docker Security

The application containers use:

```dockerfile
USER node
```

Therefore the Node.js applications do not run as root.

The Dockerfiles also use:

```text
node:22-alpine
```

to reduce image size.

Multi-stage builds are used so dependencies are prepared separately from the runtime image.

---

# Restart Policy

The services use:

```yaml
restart: unless-stopped
```

This means Docker automatically attempts to restart containers after failures unless they were intentionally stopped.

---

# Persistent Monitoring Data

Prometheus uses:

```text
prometheus_data
```

Grafana uses:

```text
grafana_data
```

Therefore:

```text
Prometheus
     |
     v
prometheus_data

Grafana
     |
     v
grafana_data
```

The monitoring data survives normal container recreation.

---

# Stop Application

```bash
docker compose down
```

This stops and removes containers and the Compose network.

Volumes remain.

---

# Stop and Remove Data

```bash
docker compose down -v
```

This also removes:

```text
prometheus_data
grafana_data
```

Use this when you want a completely clean environment.

---

# Rebuild

After changing application code:

```bash
docker compose up -d --build
```

Or:

```bash
docker compose build --no-cache
docker compose up -d
```

Use `--no-cache` when you need to force a completely fresh Docker build.

---

# Useful Docker Commands

List containers:

```bash
docker ps
```

List all containers:

```bash
docker ps -a
```

List images:

```bash
docker images
```

List networks:

```bash
docker network ls
```

List volumes:

```bash
docker volume ls
```

Inspect the ShopSphere network:

```bash
docker network inspect shopsphere
```

---

# Production Evolution

This project is intentionally local.

The next production evolution would be:

```text
GitHub
   |
   v
GitHub Actions
   |
   +--> Unit Tests
   |
   +--> Security Scan
   |
   +--> Docker Build
   |
   +--> Trivy Scan
   |
   v
Amazon ECR
   |
   v
Amazon EKS
   |
   +--> Frontend
   |
   +--> API Gateway
   |
   +--> Product Service
   |
   +--> User Service
   |
   +--> Order Service
   |
   +--> Payment Service
   |
   +--> Inventory Service
   |
   +--> Notification Service
   |
   v
Amazon RDS PostgreSQL
   |
   v
ElastiCache Redis
```

Observability:

```text
                    EKS
                     |
          +----------+----------+
          |                     |
          v                     v
     Prometheus              Logs
          |                     |
          v                     v
      Grafana             Central Logging
          |
          v
      Alertmanager
```

---

# Recommended Production Improvements

Before calling the application truly production-ready, add:

1. PostgreSQL
2. Redis
3. Authentication
4. JWT/OAuth2
5. Secrets Manager
6. TLS
7. API rate limiting
8. Structured JSON logging
9. Distributed tracing
10. OpenTelemetry
11. Prometheus Alertmanager
12. Container vulnerability scanning
13. Image signing
14. CI/CD
15. Kubernetes
16. Helm
17. Horizontal Pod Autoscaler
18. PodDisruptionBudget
19. NetworkPolicies
20. Kubernetes Secrets or external secret management
21. AWS ECR
22. AWS EKS
23. AWS RDS
24. AWS ElastiCache
25. Terraform
26. CloudWatch
27. Centralized logging
28. Disaster recovery
29. Backup strategy
30. High availability

---

# Learning Path

Use this project in the following order:

```text
Phase 1
Docker
   |
   v
Dockerfiles
   |
   v
Docker Compose
   |
   v
Networking
   |
   v
Health Checks
```

Then:

```text
Phase 2

Prometheus
   |
   v
Metrics
   |
   v
PromQL
   |
   v
Grafana
   |
   v
Dashboards
```

Then:

```text
Phase 3

Failure Testing
   |
   v
Logs
   |
   v
Alerts
   |
   v
Observability
```

Then:

```text
Phase 4

Kubernetes
   |
   v
Deployments
   |
   v
Services
   |
   v
Ingress
   |
   v
ConfigMaps
   |
   v
Secrets
   |
   v
Probes
```

Finally:

```text
Phase 5

AWS
 |
 +--> ECR
 |
 +--> EKS
 |
 +--> RDS
 |
 +--> ElastiCache
 |
 +--> ALB
 |
 +--> Route 53
 |
 +--> IAM
 |
 +--> CloudWatch
 |
 +--> Terraform
 |
 +--> GitHub Actions
```

---

# Final Goal

The final architecture should eventually become:

```text
                         Internet
                            |
                            v
                         Route53
                            |
                            v
                           ALB
                            |
                            v
                          EKS
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
          Frontend       Gateway      Microservices
                                         |
                +------------------------+----------------+
                |          |          |        |          |
                v          v          v        v          v
              Users     Products    Orders   Payment   Inventory
                |          |          |        |          |
                +----------+----------+--------+----------+
                                         |
                             +-----------+-----------+
                             |                       |
                             v                       v
                          RDS PostgreSQL          Redis
                             |
                             v
                           Backup


                      OBSERVABILITY

                         EKS
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
         Prometheus    Grafana    OpenTelemetry
              |           |           |
              +-----------+-----------+
                          |
                          v
                    Alertmanager
                          |
                          v
                    Notifications
```

This local project is therefore the **foundation** for the larger ShopSphere DevOps project.
