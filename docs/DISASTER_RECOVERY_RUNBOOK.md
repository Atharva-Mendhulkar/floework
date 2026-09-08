# Floework Production Disaster Recovery (DR) & Business Continuity Runbook

This runbook establishes the authoritative operational protocols, recovery objectives, and automated procedures for restoring the **Floework Production SaaS Execution Platform** in the event of hardware failure, availability zone loss, data corruption, or catastrophic regional outage.

---

## 1. Disaster Recovery Objectives & SLAs

| Metric | Target SLA | Mechanism |
| :--- | :--- | :--- |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** | Automated Multi-AZ failover (< 2 min) or PITR instance provision (< 25 min) |
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Continuous PostgreSQL Write-Ahead Log (WAL) streaming and S3 object versioning |
| **Data Durability Guarantee** | **99.999999999% (11 9s)** | AWS KMS-encrypted Amazon S3 versioned storage and Multi-AZ EBS snapshots |

---

## 2. Infrastructure Resilience Architecture

```
                                  [AWS WAF v2]
                            (Layer 7 Perimeter Defense)
                                        │
                                        ▼
                           [Application Load Balancer]
                               (Cross-Zone Active)
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
           [us-east-1a (Zone 1)]                   [us-east-1b (Zone 2)]
  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
  │ ECS Fargate Task 1 (Modular API)    │ │ ECS Fargate Task 2 (Modular API)    │
  │ NAT Gateway 1 (Dedicated Public IP) │ │ NAT Gateway 2 (Dedicated Public IP) │
  │ RDS Primary (PostgreSQL 16 Multi-AZ)│ │ RDS Synchronous Standby Replica     │
  │ Redis Primary (ElastiCache HA)      │ │ Redis Replica (Automatic Failover)  │
  └─────────────────────────────────────┘ └─────────────────────────────────────┘
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                        [Continuous WAL Streaming & Snapshots]
                        (30-Day Retention Window in Secrets/KMS)
```

---

## 3. Disaster Scenarios & Recovery Playbooks

### Scenario A: Single Availability Zone Outage (e.g. us-east-1a Failure)
- **Severity**: HIGH
- **Expected Downtime**: < 2 Minutes
- **Automated Behavior**:
  1. **ALB**: Automatically routes traffic away from unhealthy targets in us-east-1a to healthy Fargate tasks in us-east-1b.
  2. **RDS Multi-AZ**: Amazon RDS detects primary host degradation, promotes the us-east-1b standby to primary, and updates the canonical DNS record (`module.database.db_instance_address`). Total failover duration design target: 60–120 seconds.
  3. **ElastiCache Redis**: Automatic failover promotes replica node in us-east-1b to primary cluster master.
  4. **ECS Auto-Scaler**: Detects task capacity deficit and spawns replacement tasks in remaining healthy private app subnets.
- **Engineer Action Required**:
  - Verify CloudWatch alarm alerts in `#floework-prod-alarms`.
  - Confirm RDS failover via AWS CLI:
    ```bash
    aws rds describe-db-instances --db-instance-identifier floework-production-db --query "DBInstances[0].Status"
    ```
  - Run synthetic smoke test:
    ```bash
    npm run smoke -- --api-url "https://api.floework.com"
    ```

---

### Scenario B: Accidental Table Deletion or Logical Data Corruption
- **Severity**: CRITICAL
- **Expected Recovery Time (RTO)**: 15–25 Minutes
- **Data Loss Tolerance (RPO)**: < 5 Minutes
- **Procedure: RDS Point-In-Time Recovery (PITR)**:
  1. **Identify Corruption Timestamp**:
     - Check audit log records or SQS event timestamps to pinpoint the exact UTC minute ($T_{corrupt}$) preceding the incident.
  2. **Execute PITR Snapshot Restoration**:
     - Use AWS CLI or Management Console to restore RDS to $T_{corrupt} - 1\text{m}$:
       ```bash
       aws rds restore-db-instance-to-point-in-time \
         --source-db-instance-identifier floework-production-db \
         --target-db-instance-identifier floework-production-db-restored \
         --restore-time "2026-09-08T12:30:00Z" \
         --db-subnet-group-name floework-production-db-subnet-group \
         --vpc-security-group-ids "sg-xxxxxxx" \
         --multi-az
       ```
  3. **Validate Restored Schema & Topologies**:
     - Run the automated schema inspection:
       ```bash
       node scripts/run_migrations.mjs --status
       ```
  4. **Delta Catch-Up & Cutover**:
     - Replay any uncorrupted transactions using:
       ```bash
       node scripts/cutover_delta_sync.mjs --since "2026-09-08T12:30:00Z"
       ```
  5. **DNS/Endpoint Swap**:
     - Update SSM Parameter `/floework/production/app/database_host` or rename the restored RDS instance.

---

### Scenario C: Catastrophic Regional Outage (us-east-1 Outage)
- **Severity**: DISASTER
- **Expected Recovery Time (RTO)**: < 45 Minutes
- **Procedure: Standby Regional Deployment (us-west-2)**:
  1. **Initialize Terraform in Alternate Region**:
     ```bash
     terraform -chdir=terraform/environments/production init
     ```
  2. **Deploy Standby Infrastructure**:
     ```bash
     terraform -chdir=terraform/environments/production apply \
       -var="aws_region=us-west-2" \
       -var="availability_zones=[\"us-west-2a\", \"us-west-2b\"]"
     ```
  3. **Restore Database from Cross-Region Snapshot**:
     - Restore RDS PostgreSQL instance in `us-west-2` from the latest replicated automated snapshot.
  4. **Update Route 53 Public DNS Records**:
     - Re-point `api.floework.com` alias record to the new `us-west-2` Application Load Balancer.
  5. **Execute Post-Recovery Certification**:
     ```bash
     npm run smoke -- --url "https://api.floework.com"
     ```

---

### Scenario D: Malicious S3 Asset Deletion or Ransomware Attack
- **Severity**: HIGH
- **Recovery Time**: < 10 Minutes
- **Procedure**:
  1. S3 bucket versioning (`versioning { enabled = true }`) guarantees that `DELETE` requests only insert a *DeleteMarker*.
  2. To recover deleted or corrupted assets, run the S3 version restoration script:
     ```bash
     aws s3api list-object-versions --bucket floework-production-storage-us-east-1
     ```
  3. Revert objects to the previous version ID using AWS S3 Batch Operations or AWS CLI.

---

## 4. Quarterly DR Testing & Validation Protocol

Engineering conducts scheduled quarterly disaster recovery drills:

1. **Automated Audit Verification**:
   ```bash
   npm run dr:dry-run
   ```
2. **Simulated PITR Walkthrough**:
   ```bash
   node scripts/dr_backup_restore.mjs --simulate-pitr --dry-run
   ```
3. **Audit Log Retention**:
   - The generated `dr_audit_report.json` must be signed off by the Platform Reliability Lead and archived in the compliance vault.
