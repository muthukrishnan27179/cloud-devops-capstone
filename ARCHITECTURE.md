# 🏛️ CloudPulse System Architecture & Technical Design Document

## 1. Executive Summary
**CloudPulse** is an enterprise-grade Cloud Infrastructure & Incident Management SaaS platform engineered to demonstrate modern Site Reliability Engineering (SRE), Cloud Native architecture, and DevOps principles.

The platform provides unified visibility into distributed microservice health, enables automated incident management, and exposes deep telemetry using the **RED Method (Rate, Errors, Duration)**.

---

## 2. Architectural Design Principles

1. **Defense in Depth:** Zero-trust principles applied across networking, container runtimes, API access controls, and data encryption.
2. **Observability First:** First-class Prometheus telemetry integrated into the core HTTP request lifecycle with sub-millisecond overhead.
3. **Graceful Degradation:** Resilient data layer that operates smoothly against managed PostgreSQL while seamlessly falling back to an in-memory store during network partitions or offline demos.
4. **Immutability & Portability:** Standardized multi-stage OCI-compliant Docker containers executable on bare metal, local Docker, Kubernetes, Render, or AWS ECS Fargate.
5. **Continuous Verification:** Every pull request and push to `main` undergoes automated linting, unit/integration testing, security scanning, container image compilation, and deployment triggers.

---

## 3. High-Level System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               INTERNET CLIENTS               │
                    │   Web Browsers | MUTHUKRISHNAN Ks | cURL     │
                    └───────────────────────┬──────────────────────┘
                                            │ HTTPS (Port 443)
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │       EDGE ROUTING & LOAD BALANCING          │
                    │   Cloudflare CDN / AWS ALB / Render Router   │
                    └───────────────────────┬──────────────────────┘
                                            │ HTTP (Port 3000)
                                            ▼
  ┌───────────────────────────────────────────────────────────────────────────────────┐
  │                            APPLICATION RUNTIME LAYER                              │
  │                                                                                   │
  │  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌───────────────────┐  │
  │  │   Request Interceptor   │  │   JWT Auth Middleware   │  │  Health Probes    │  │
  │  │   • X-Request-ID Trace  │  │   • Token Verification  │  │  • /health (Live) │  │
  │  │   • Structured Logger   │  │   • RBAC Enforcement    │  │  • /ready (Ready) │  │
  │  └────────────┬────────────┘  └────────────┬────────────┘  └─────────┬─────────┘  │
  │               │                            │                         │            │
  │               ▼                            ▼                         ▼            │
  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
  │  │                         REST API v1 CONTROLLERS                             │  │
  │  │   • /api/v1/auth (Register, Login, Token Issuance)                          │  │
  │  │   • /api/v1/services (CRUD for Cloud Microservices & DBs)                   │  │
  │  │   • /api/v1/incidents (Report, Update, Resolve Outages)                     │  │
  │  │   • /api/v1/simulate (Chaos Injection & High Concurrency Traffic)           │  │
  │  └─────────────────────────────────────┬───────────────────────────────────────┘  │
  │                                        │                                          │
  └────────────────────────────────────────┼──────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
  ┌──────────────────────────────────┐          ┌──────────────────────────────────┐
  │         PRIMARY DATA LAYER       │          │       OBSERVABILITY ENGINE       │
  │                                  │          │                                  │
  │   Managed PostgreSQL 16 Cluster  │          │   Prometheus v2.50 Scraper       │
  │   • Schema: users, services,     │          │   • Target: /metrics (every 10s) │
  │     incidents                    │          │   • Metric Types: Counter,       │
  │   • Connection Pooling (pg.Pool) │          │     Histogram, Gauge             │
  │   • Auto-failover to MemoryStore │          │   Grafana v10 Visual Dashboards  │
  │     if DB is unavailable         │          │   Alertmanager Threshold Rules   │
  └──────────────────────────────────┘          └──────────────────────────────────┘
```

---

## 4. Component Deep Dive

### 4.1 Application Layer (`server.js`, `src/`)
- **Node.js 20 LTS:** Event-driven, non-blocking I/O model suited for high-throughput metric collection.
- **Express Microservice:** Modular route separation:
  - `auth`: Handles user onboarding and cryptographically secure JWT issuance.
  - `services`: Cloud asset repository storing metadata (region, latency, SLA).
  - `incidents`: SRE incident triage state machine (`OPEN` ➔ `INVESTIGATING` ➔ `RESOLVED`).
  - `simulate`: Controlled chaos laboratory designed for chaos testing and synthetic traffic generation.

### 4.2 Data Storage & Persistence Layer
- **PostgreSQL 16 Engine:** Relational schema supporting strict foreign keys, timestamp indexing, and ACID transactions.
- **Connection Pooling:** Configured with minimum (2) and maximum (10) connection boundaries to prevent database socket exhaustion during traffic spikes.
- **Resilient Fallback Mode:** In environments where external databases cannot be provisioned (e.g. offline testing), CloudPulse initiates an in-memory repository with pre-seeded data, ensuring 100% test reliability.

### 4.3 Container Security & Multi-Stage Dockerfile
- **Build Stage Separation:** Development tools (`npm`, compiler toolchains) are discarded after dependency compilation.
- **Minimal Surface:** Built atop Alpine Linux (`node:20-alpine`) for a footprint under 140MB.
- **Process Management:** Leverages `tini` as `PID 1` to prevent orphaned zombie processes and guarantee immediate termination upon receiving container orchestrator signals.
- **Non-Root Execution:** Spawns an unprivileged user `nodejs` (`UID 1001`, `GID 1001`) preventing container escape vulnerabilities.

---

## 5. Telemetry & SRE Metrics Architecture

### 5.1 The RED Method
| Signal | Metric Name | Exposition Type | Description |
| :--- | :--- | :--- | :--- |
| **Rate** | `http_requests_total` | Counter | Total requests segmented by HTTP method, route, and status code. |
| **Errors** | `http_errors_total` | Counter | Tracks 4xx and 5xx responses to determine overall service error budget. |
| **Duration** | `http_request_duration_seconds` | Histogram | Latency distribution using logarithmic buckets (5ms to 5000ms). |

### 5.2 Kubernetes Health & Probe Matrix
| Probe | Path | Expected HTTP Status | Validation Criterion |
| :--- | :--- | :--- | :--- |
| **Liveness** | `/health` | `200 OK` | Process running, event loop responsive. |
| **Readiness** | `/ready` | `200 OK` (or `503 Service Unavailable`) | Database ping succeeded, connection pool ready. |
| **Telemetry** | `/metrics` | `200 OK` | Prometheus text exposition stream ready. |

---

## 6. Infrastructure as Code (IaC) & Cloud Architecture

### AWS Cloud Topology (Terraform)
- **VPC & Subnets:** Isolated Virtual Private Cloud with dual-AZ public subnets (`us-east-1a`, `us-east-1b`).
- **Application Load Balancer (ALB):** Public-facing reverse proxy with TLS termination and health probe routing.
- **Amazon ECS Fargate:** Serverless container execution eliminating the operational overhead of EC2 patch management.
- **Amazon CloudWatch:** Centralized structured log ingestion with configurable 7-day retention.

### Render Cloud Platform Blueprint (`render.yaml`)
- Declarative Infrastructure as Code (IaC) provisioning both the Dockerized Web Service and Managed PostgreSQL cluster within a shared private cloud network in the Oregon region.
