# Floework Chaos Engineering, Resiliency & GameDay Playbook

## 1. Overview & Chaos Engineering Principles

Floework employs proactive chaos engineering and automated fault injection to prove system resiliency before catastrophic outages occur in production. 

Our core reliability tenets:
1. **Zero Unhandled 500 Errors**: All external dependencies (Redis, Amazon Bedrock, Stripe, SES) are wrapped in timeouts, exponential backoffs, and circuit breakers with deterministic fallbacks.
2. **Graceful Service Degradation**: The core task execution engine remains functional even when telemetry, caching, or AI narrative synthesis tiers are fully degraded.
3. **Automated Recovery**: Compute tasks auto-scale and heal; database failover resolves in under 120 seconds without human intervention.
4. **Controlled Blast Radius**: Chaos experiments run during designated maintenance windows or against staging environments with automated rollback triggers.

---

## 2. Service Level Objectives (SLOs) & Error Budget Policy

| Objective | Target SLA | Metric Source | Error Budget Action |
| :--- | :--- | :--- | :--- |
| **Platform Availability** | **>= 99.9%** | ALB 5xx Rate / CloudWatch | Feature freeze if > 20% budget consumed in 24h |
| **API Latency (p99)** | **<= 250 ms** | CloudWatch ALB TargetResponseTime | Investigate database slow queries / indexing |
| **API Latency (p95)** | **<= 150 ms** | CloudWatch Container Insights | Scale ECS tasks if CPU > 70% |
| **API Latency (p50)** | **<= 50 ms** | CloudWatch Container Insights | Normal operational baseline |
| **Worker Processing Success** | **>= 99.9%** | SQS FIFO DLQ Message Count | Alert on DLQ > 0; inspect poison pill payloads |

---

## 3. GameDay Chaos Experiment Scenarios

### Experiment 1: Distributed Cache Partition (Redis Failure)
- **Hypothesis**: If Amazon ElastiCache Redis becomes partitioned or crashes, API endpoints will fall back to in-memory sliding window rate limiters without dropping requests or throwing 500 errors.
- **Fault Mechanism**: Revoke Redis security group ingress or inject artificial `ECONNREFUSED` exceptions.
- **Verification**:
  - API endpoints return HTTP 200/429 status codes.
  - CloudWatch logs output `[RateLimit] Redis unreachable, falling back to in-memory limiter`.
  - Zero unhandled exceptions in `/ecs/floework-production-api`.

### Experiment 2: Generative AI Service Degradation (Bedrock Outage)
- **Hypothesis**: If Amazon Bedrock experiences severe throttling or network timeouts (>25s), the API will return a structured statistical narrative within 1,000ms via the `opossum` circuit breaker.
- **Fault Mechanism**: Simulate `ThrottlingException` or latency spikes against `generateNarrative`.
- **Verification**:
  - Circuit breaker trips (`breaker.opened === true`).
  - Narrative endpoint returns HTTP 200 with fallback payload (`fallback: true`).
  - Client SPA renders executive summary cleanly without blank state.

### Experiment 3: RDS PostgreSQL Multi-AZ Standby Failover
- **Hypothesis**: If the primary database instance reboots or suffers hardware failure, synchronous Multi-AZ failover will promote the standby replica in under 120s, and application connection pools will reconnect with exponential backoff.
- **Fault Mechanism**: Execute `aws rds reboot-db-instance --db-instance-identifier floework-prod-db --force-failover`.
- **Verification**:
  - ALB health probes maintain container availability.
  - Temporary connection errors recover within 3 retry attempts (`executeWithRetry`).
  - Schema migrations and OCC mutations resume cleanly post-failover.

### Experiment 4: SQS Worker Poison Pill Ingestion & Dead-Letter Queue Isolation
- **Hypothesis**: If corrupt or malformed JSON payloads enter `focus-completion.fifo`, the background worker will isolate them without crashing, retry exactly 3 times, and route them to `focus-completion-dlq.fifo`.
- **Fault Mechanism**: Enqueue corrupt byte payloads into SQS queue.
- **Verification**:
  - Worker process remains active (`workerProcessCrashed: false`).
  - Valid FIFO messages continue processing in strict order.
  - Poison pills arrive in DLQ for offline forensic inspection.

### Experiment 5: High-Concurrency Surge & Target-Tracking Auto-Scaling
- **Hypothesis**: A 10x traffic spike will trigger ECS Fargate target tracking scaling policies (CPU > 70%, Memory > 80%), scaling tasks from 2 to 10 while maintaining p99 latency <= 250ms.
- **Fault Mechanism**: Run synthetic concurrency load harness (`node scripts/chaos_resiliency_test.mjs --concurrency 100`).
- **Verification**:
  - Latency percentiles remain within SLA (p50 < 50ms, p99 < 250ms).
  - ECS Service desired count scales up automatically.

---

## 4. Automated Chaos CLI Harness

Run the automated chaos test suite locally or in CI:

```bash
# Execute simulated chaos experiments in dry-run mode
npm run chaos:dry-run

# Run full chaos and resiliency suite
npm run chaos:test
```

---

## 5. Stop-The-Line Safety Triggers

During any active GameDay or fault injection experiment, immediately abort if:
1. Production ALB 5xx error rate exceeds **1.0%** over any 1-minute window.
2. RDS replica lag exceeds **60 seconds**.
3. SQS DLQ backlog exceeds **50 messages**.
4. P99 API response time exceeds **1,000 ms** for more than 2 consecutive minutes.
