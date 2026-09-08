# Floework Day-2 Operations Runbook

This runbook establishes standard operating procedures (SOPs) for operating, maintaining, scaling, and troubleshooting the **Floework SaaS Execution Platform** in production.

---

## 1. Operational Procedures Index

1. [Application Deployment & Rolling Update](#1-application-deployment--rolling-update)
2. [Automated 48-Hour Rollback Procedure](#2-automated-48-hour-rollback-procedure)
3. [Zero-Downtime Database Schema Migration](#3-zero-downtime-database-schema-migration)
4. [ECS Fargate Task Crash & Auto-Restart Recovery](#4-ecs-fargate-task-crash--auto-restart-recovery)
5. [RDS PostgreSQL Multi-AZ Failover & Reconnection](#5-rds-postgresql-multi-az-failover--reconnection)
6. [SQS FIFO Queue Backlog & DLQ Redrive](#6-sqs-fifo-queue-backlog--dlq-redrive)
7. [ElastiCache Redis Failover & Fallback](#7-elasticache-redis-failover--fallback)
8. [High HTTP 5xx Error Surge Containment](#8-high-http-5xx-error-surge-containment)
9. [AWS Cost Spike & Anomaly Containment](#9-aws-cost-spike--anomaly-containment)
10. [SSM Parameter & Secret Rotation](#10-ssm-parameter--secret-rotation)
11. [Disaster Recovery Point-in-Time Restoration](#11-disaster-recovery-point-in-time-restoration)

---

## 2. Standard Operating Procedures (SOPs)

### 1. Application Deployment & Rolling Update
* **Trigger**: Merge of validated code into branch `main`.
* **Automated Pipeline**: `.github/workflows/deploy-ecs.yml` builds Docker image, runs Trivy security scanning, pushes to Amazon ECR, registers task definition, and updates ECS service.
* **Health Gate**: ECS initiates rolling replacement: spins up new task, waits for ALB target group `/health` probe (3 consecutive 200 OKs over 45s), then drains older task.
* **Manual Verification**:
  ```bash
  npm run smoke -- --target production
  ```

### 2. Automated 48-Hour Rollback Procedure
* **Trigger**: Severe application regression, unrecoverable data corruption, or sustained 5xx outage following release.
* **Execution**:
  ```bash
  # Execute reverse delta sync to synchronize modern writes back to legacy storage
  node scripts/cutover_delta_sync.mjs --reverse

  # Revert Route 53 DNS records to previous origin
  node scripts/production_cutover.mjs --rollback
  ```
* **Verification**: Verify DNS resolution and execute smoke tests against legacy origin.

### 3. Zero-Downtime Database Schema Migration
* **Policy**: Schema migrations must follow the **Expand/Contract pattern**:
  1. *Expand*: Add nullable columns, new tables, or additive indexes.
  2. *Deploy*: Release application code utilizing both old and new columns.
  3. *Contract*: Drop obsolete columns in a subsequent release.
* **Execution**:
  ```bash
  # Check pending migrations
  npm run migrate:status

  # Rehearse in dry-run mode
  npm run migrate:dry-run

  # Apply transactionally
  npm run migrate:db
  ```

### 4. ECS Fargate Task Crash & Auto-Restart Recovery
* **Symptom**: CloudWatch alarm `ecs_cpu_high` or sudden drop in healthy task count on ALB target group.
* **Diagnosis**:
  ```bash
  # Inspect CloudWatch log streams for fatal panic or uncaught exception
  aws logs filter-log-events --log-group-name /ecs/floework-prod-api --limit 20
  ```
* **Recovery**:
  1. ECS automatically restarts crashed containers up to `desired_count`.
  2. If tasks enter a crash loop due to bad environment configuration, temporarily scale service to previous task definition revision:
     ```bash
     aws ecs update-service --cluster floework-prod-cluster --service floework-prod-api --task-definition floework-prod-api:PREVIOUS_REVISION
     ```

### 5. RDS PostgreSQL Multi-AZ Failover & Reconnection
* **Symptom**: CloudWatch alarm `rds_high_connections` or transient database query timeouts.
* **Behavior**: In a Multi-AZ deployment, AWS automatically promotes the synchronous standby in the second AZ (< 120 seconds). CNAME switches automatically.
* **Application Recovery**: The `pg-pool` client in `api/_lib/db.ts` utilizes exponential backoff retry wrappers (`executeWithRetry`), catching `ECONNRESET` and re-establishing connections automatically once DNS updates.
* **Manual Failover Drill (GameDay)**:
  ```bash
  aws rds reboot-db-instance --db-instance-identifier floework-prod-postgres --force-failover
  ```

### 6. SQS FIFO Queue Backlog & DLQ Redrive
* **Symptom**: CloudWatch alarm `sqs_focus_dlq` or `sqs_audit_dlq` triggers (messages visible > 0).
* **Procedure**:
  1. Inspect dead-letter queue message payload:
     ```bash
     aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/floework-prod-focus-completion-dlq.fifo --max-number-of-messages 5
     ```
  2. Identify root cause (e.g. malformed JSON, downstream timeout).
  3. Deploy fix to worker container.
  4. Redrive dead-letter messages back to primary FIFO queue using AWS SQS Dead-Letter Queue Redrive API.

### 7. ElastiCache Redis Failover & Fallback
* **Symptom**: Redis node failover or network partition.
* **Graceful Degradation**:
  - Rate limiting automatically falls back to local container in-memory LRU cache (`api/_lib/rateLimit.ts`) with zero dropped requests.
  - WebSocket presence continues routing local container socket events.
* **Recovery**: Once Redis recovers, the background client automatically reconnects and resumes cross-task synchronization without restarting API containers.

### 8. High HTTP 5xx Error Surge Containment
* **Symptom**: CloudWatch alarm `alb_5xx_errors` triggers (> 1% error rate over 5 minutes).
* **Procedure**:
  1. Check AWS WAF v2 metrics in CloudWatch to determine if traffic is an unmitigated Layer-7 DDoS.
  2. If an abusive IP prefix is identified, update WAF rate-limiting rule or add explicit IP block statement.
  3. If traffic is legitimate, increase ECS service capacity manually:
     ```bash
     aws ecs update-service --cluster floework-prod-cluster --service floework-prod-api --desired-count 6
     ```

### 9. AWS Cost Spike & Anomaly Containment
* **Symptom**: SNS alert received from `aws_ce_anomaly_subscription` (> $20 impact).
* **Procedure**:
  1. Open AWS Cost Anomaly Detection console to identify the anomalous service.
  2. Run the automated FinOps audit engine:
     ```bash
     npm run finops:audit -- --env production
     ```
  3. Verify whether an unexpected NAT Gateway or oversized compute task was created.
  4. If testing in staging, trigger off-hours hibernation to contain spend.

### 10. SSM Parameter & Secret Rotation
* **Frequency**: Rotate database passwords and third-party API keys every 90 days.
* **Procedure**:
  1. Update secret in SSM Parameter Store / Secrets Manager:
     ```bash
     aws ssm put-parameter --name "/floework/production/app/JWT_SECRET" --value "NEW_SECRET_32_CHARS" --type SecureString --overwrite
     ```
  2. Trigger graceful rolling replacement of ECS tasks so new containers resolve the updated secret at startup:
     ```bash
     aws ecs update-service --cluster floework-prod-cluster --service floework-prod-api --force-new-deployment
     ```

### 11. Disaster Recovery Point-in-Time Restoration
* **Trigger**: Catastrophic database corruption or regional failure.
* **Execution**:
  ```bash
  # Execute automated Point-in-Time Recovery engine
  node scripts/dr_backup_restore.mjs --restore-pitr "2026-09-08T02:00:00Z"
  ```
* **Verification**: Run data integrity checksums and verify RTO (< 15m) and RPO (< 5m) thresholds.
