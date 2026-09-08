# Floework Production Cutover, Live Environment Verification & Rollback Runbook

This document defines the authoritative, step-by-step operational runbook for executing the zero-downtime, zero-data-loss production cutover of the **Floework SaaS Execution Platform** to its decoupled AWS-native target architecture (Amazon Route 53, ALB, ECS Fargate, S3 + CloudFront CDN with OAC, RDS PostgreSQL 16 Multi-AZ, and Amazon SQS FIFO).

---

## 1. Cutover Overview & Architecture

```
                                  [Route 53 DNS]
                               (api.floework.com / Apex)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [Application Load Balancer]                    [CloudFront CDN Edge + OAC]
       (Port 80/443 SSL via ACM)                      (S3 Bucket + SPA Rewrites)
                 │                                               │
                 ▼                                               ▼
       [ECS Fargate Modular API]                    [React 18 Single-Page App]
          (Port 3000 /health)                        (Vite + TailwindCSS Bundles)
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
       [RDS PostgreSQL 16 Multi-AZ]    [Amazon SQS FIFO Queues]
        (7 Multi-Tenant Tables)          (focus, audit, notify)
```

---

## 2. Team Roles & Communication Matrix

| Role | Responsibility | Primary Contact |
| :--- | :--- | :--- |
| **Cutover Commander** | Overall execution sign-off, Go/No-Go decisions, stakeholder bridge | Release Engineering Lead |
| **Database Lead** | Delta synchronization execution, checksum verification, replication lag | Principal Data Architect |
| **Cloud Infrastructure Lead** | Route 53 DNS records, ACM certificates, CloudFront edge invalidation | DevOps / SRE Lead |
| **Application & QA Lead** | Synthetic smoke tests, CORS validation, SPA route hydration certification | Lead Software Engineer |

- **War Room Channel**: `#floework-prod-cutover` (Slack / Bridge)
- **Target Maintenance Budget**: **15 Minutes** (Sunday 02:00 UTC - 02:15 UTC)
- **Zero-Data-Loss Guarantee**: Continuous topological delta sync with SHA-256 integrity checksums.
- **Rollback Safety Window**: **48 Hours** guaranteed reverse replication (`--reverse`).

---

## 3. Pre-Flight Checklist

### T-7 Days (Preparation & Drift Check)
- [ ] Run speculative Terraform plan across all 16 staging/production modules:
  ```bash
  /home/topfloorboss/.local/bin/terraform -chdir=terraform/environments/staging plan
  ```
- [ ] Ensure all monorepo test suites are passing at 100%:
  ```bash
  npm run test:api && npm run test:web
  ```
- [ ] Reduce DNS TTL on existing authoritative DNS records to **60 seconds** (reduces client caching during switchover).
- [ ] Verify that AWS Secrets Manager and SSM Parameter Store contain all required runtime keys (`/floework/prod/*`).

### T-24 Hours (Dry-Run Rehearsal)
- [ ] Execute database delta sync dry-run to identify potential schema mismatches or unindexed foreign keys:
  ```bash
  npm run sync -- --dry-run
  ```
- [ ] Rehearse synthetic smoke test harness against staging origins:
  ```bash
  node scripts/smoke_test_e2e.mjs --dry-run --json
  ```
- [ ] Rehearse complete production cutover orchestrator in dry-run mode:
  ```bash
  node scripts/production_cutover.mjs --dry-run
  ```
- [ ] Verify ACM wildcard SSL/TLS certificate status is `ISSUED` and Route 53 DNS validation records are active.

### T-2 Hours (Pre-Cutover Freeze)
- [ ] Lock code deployments to `main` (code freeze in effect).
- [ ] Confirm AWS RDS PostgreSQL 16 Multi-AZ replication state is `healthy` with 0ms replication lag.
- [ ] Confirm ECS Fargate service desired task count >= 2 with ALB target health passing.
- [ ] Confirm CloudFront CDN distribution status is `Deployed`.

---

## 4. T-0 Cutover Sequence (15-Minute Maintenance Window)

```
[00:00] Start Window -> [00:02] Banner On -> [00:05] Delta Sync -> [00:08] Origin Smoke -> [00:10] DNS Switch -> [00:13] Public Smoke -> [00:15] Go-Live!
```

### Step 1: Maintenance Window Lock (T+00:00 to T+00:02)
1. Display the planned maintenance banner on the client SPA:
   - Sets `MaintenanceBanner` active with informative messaging.
   - Prevents uncommitted browser mutations during database catch-up.

### Step 2: Final Database Delta Synchronization (T+00:02 to T+00:06)
1. Execute live forward delta sync across all 7 topological tables:
   ```bash
   node scripts/cutover_delta_sync.mjs --since "2026-09-01T00:00:00Z"
   ```
2. Inspect the returned SHA-256 consistency digest and verify `allInSync === true`:
   ```json
   {
     "allInSync": true,
     "totalDeltas": 0,
     "checksumDigest": "ec71b38e4aa09012"
   }
   ```
3. If delta sync reports unresolvable errors, halt and invoke Rollback Procedure.

### Step 3: Pre-DNS Origin Verification (T+00:06 to T+00:09)
1. Run synthetic smoke tests directly against ALB and CloudFront origin endpoints:
   ```bash
   node scripts/smoke_test_e2e.mjs --api-url "http://${ALB_DNS_NAME}" --cdn-url "https://${CLOUDFRONT_DOMAIN}"
   ```
2. Verify all probes pass:
   - Liveness (`/health/live`) -> 200 OK
   - Deep Readiness (`/health/ready`) -> 200 OK
   - Multi-tenant boundary checks -> 401/403 Rejected (No 500s)
   - CDN Root & SPA Fallback (`/workspace/settings`) -> 200 OK HTML

### Step 4: Route 53 DNS Switchover (T+00:09 to T+00:11)
1. Execute the automated Route 53 alias record switch:
   ```bash
   node scripts/production_cutover.mjs --execute --domain "floework.com"
   ```
2. The orchestrator configures:
   - `api.floework.com` (Type A Alias) -> `module.alb.alb_dns_name` (Target Health Evaluation: true)
   - `floework.com` (Type A Alias) -> `module.frontend.cloudfront_domain_name` (`Z2FDTNDATAQYW2`)
3. Invalidate CloudFront edge cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*"
   ```

### Step 5: Post-DNS Live Certification (T+00:11 to T+00:14)
1. Run synthetic transactions against public domain names:
   ```bash
   node scripts/smoke_test_e2e.mjs --api-url "https://api.floework.com" --cdn-url "https://floework.com"
   ```
2. Verify:
   - SSL/TLS handshake completes with valid ACM certificate.
   - SPA routes hydrate correctly without 404s.
   - CloudFront security headers are present (`nosniff`, HSTS, X-Frame-Options).
   - API endpoints respond with P95 latency < 150ms.

### Step 6: Go-Live Declaration (T+00:15)
1. Deactivate maintenance banner.
2. Cutover Commander signs off on `cutover_audit_report.json`.
3. Announce cutover completion in `#floework-prod-cutover`.
4. Begin 48-Hour Monitoring Window.

---

## 5. Go / No-Go Decision Gate Matrix

Prior to Step 4 (DNS Switchover), all leads must provide unanimous GO consensus:

| Gate | Metric | Target | Failure Action |
| :--- | :--- | :--- | :--- |
| **G1: Database Sync** | Remaining table discrepancies | 0 deltas | Abort, investigate lock contention |
| **G2: API Readiness** | `/health/ready` probe | HTTP 200 (< 50ms) | Abort, check RDS pool / Redis |
| **G3: CDN Origin** | SPA rewrite `/workspace/settings` | HTTP 200 HTML | Abort, check CloudFront custom error response |
| **G4: Security Headers**| Strict-Transport-Security, nosniff | Present | Abort, verify CloudFront response policy |
| **G5: Error Rate** | ALB 5XX rate | 0.00% | Abort, check ECS container logs |

---

## 6. Automated 48-Hour Rollback Runbook

If an unrecoverable issue arises within 48 hours of cutover (e.g. latent data corruption, third-party provider outage):

```
                                [Rollback Triggered]
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼                                             ▼
        [Revert Route 53 DNS]                        [Reverse Delta Sync]
      (Point back to legacy origin)              (AWS RDS -> Legacy DB Replay)
                  │                                             │
                  └──────────────────────┬──────────────────────┘
                                         ▼
                             [Verify Legacy System Health]
```

### Automated Rollback Command:
```bash
node scripts/production_cutover.mjs --rollback --execute --domain "floework.com"
```

### Rollback Execution Steps:
1. **Trigger Rollback Protocol**:
   - Reverts Route 53 DNS records back to legacy origin endpoints.
   - Low TTL (60s) ensures DNS propagates within 1-2 minutes.
2. **Reverse Delta Synchronization**:
   - The orchestrator automatically executes:
     ```bash
     node scripts/cutover_delta_sync.mjs --reverse --since "${CUTOVER_TIMESTAMP}"
     ```
   - All mutations created on AWS RDS while live are transactionally replayed back to the legacy database in topological dependency order.
3. **Legacy Health Verification**:
   - Executes smoke probes against legacy endpoints to certify user operations are restored.
4. **Audit Logging**:
   - Generates `rollback_audit_report.json` with reverse sync checksums and incident timestamps.

---

## 7. Post-Cutover Monitoring & Alarm Baselines

Monitor the following Amazon CloudWatch alarms configured in `terraform/modules/observability`:

1. `floework-prod-ecs-cpu-high` (CPU > 80% for 3 consecutive 1m periods)
2. `floework-prod-ecs-memory-high` (RAM > 85% for 3 consecutive 1m periods)
3. `floework-prod-alb-5xx-high` (5XX count > 10 in 1m)
4. `floework-prod-rds-cpu-high` (RDS CPU > 75%)
5. `floework-prod-rds-storage-low` (Free storage < 5 GB)
6. `floework-prod-sqs-dlq-visible` (DLQ messages > 0 triggers immediate P1 paging)
7. `floework-prod-redis-memory-high` (Cache memory > 80%)

All alarms publish directly to the SNS alert bus topic (`module.observability.sns_alert_topic_arn`).
