# Floework AWS FinOps & Cost Governance Playbook

This document defines the **Cost Governance, Cloud Financial Management (FinOps), and AWS Budget Control Architecture** for the Floework enterprise platform.

Rather than treating cloud infrastructure spend as a retrospective accounting exercise, Floework integrates **active, declarative cost control directly into Infrastructure as Code (Terraform), continuous monitoring, and automated auditing**.

---

## 1. Cost Governance Architecture

Floework splits its cloud surface into two mutually reinforcing planes: the **Application Tier** (delivering user value) and the **Governance Tier** (ensuring financial discipline):

```text
                    FLOWEWORK AWS
                         |
        +----------------+----------------+
        |                                 |
   Application                      Governance
        |                                 |
 ECS / RDS / ALB                    AWS Budgets (50/80/100%)
 SQS / S3 / Redis                   Cost Anomaly Detection
 Bedrock                            SNS Operational Alert Bus
        |                           FinOps Audit Engine
        |                           S3 Lifecycle Tiering
        +----------------+----------------+
                         |
                  CloudWatch / IAM
```

### Cost Governance Data Flow

```text
AWS Usage & Metering
    |
    +--> AWS Budgets (terraform/modules/finops/)
    |       ├── 50% Early Warning (Actual)
    |       ├── 80% Operational Threshold (Actual)
    |       ├── 100% Budget Exhaustion (Actual)
    |       └── 100% Projected Breach (Forecasted)
    |
    +--> AWS Cost Anomaly Detection (Dimensional: Service)
    |       └── Absolute Threshold: $10 (staging) / $20 (production)
    |
    +--> FinOps Audit Engine (scripts/finops_cost_audit.mjs)
    |       ├── Idle compute & task over-provisioning
    |       ├── Unattached EBS volumes ($0 leakage)
    |       ├── Unassociated Elastic IPs ($0.005/hr leak detection)
    |       ├── NAT Gateway utilization & single vs multi-AZ
    |       ├── RDS PostgreSQL instance sizing & storage caps
    |       ├── ElastiCache Redis idle utilization
    |       └── S3 Intelligent-Tiering & Glacier transitions
    |
    +--> Amazon SNS Alert Bus (`floework-prod-operational-alerts`)
            |
            +--> On-Call Team Notification (Email / ChatOps Webhook)
```

---

## 2. Critical Architectural & Operational Questions

### Q1: What happens if I accidentally leave an expensive resource running?
* **Automated Detection**: **AWS Cost Anomaly Detection** evaluates root-cause spending deviations per AWS service dimensionally. If an unexpected resource is launched or scaled up, a daily alert is dispatched to the SNS alert bus when impact exceeds the threshold ($10 for staging, $20 for production).
* **Threshold Alarms**: Multi-tier **AWS Budgets** trigger proactive SNS alerts at 50%, 80%, 100% of actual spend and 100% of forecasted spend.
* **Auto-Scaling Ceilings**: ECS Fargate services enforce strict hard task limits (`max_capacity = 3` in staging, `6` in production). Even under unbounded load, task counts cannot spiral.
* **Unattached Storage Guards**: The automated FinOps audit engine (`npm run finops:audit`) scans for unattached EBS volumes and unassociated Elastic IPs ($0.005/hr idle leak).

### Q2: What happens if traffic unexpectedly increases?
* **Application Auto-Scaling**: ECS Fargate tasks automatically scale out via Target Tracking Policies on CPU (70%) and Memory (80%), then automatically scale back in when traffic subsides.
* **Layer-7 Rate Limiting**: AWS WAF v2 intercepts traffic spikes, rate-limiting individual IP addresses at 1,000 requests per 5-minute window to block denial-of-wallet (DoW) attacks.
* **Database Disk Protection**: Amazon RDS PostgreSQL enables storage autoscaling with a strict ceiling (`max_allocated_storage = 100` GB) preventing runaway disk expansion.
* **Cost Alarms**: If traffic causes billing to surge, the 100% forecasted budget alarm fires *before* the monthly billing cycle closes, giving operations time to adjust capacity.

### Q3: What happens when AWS credits expire?
* **Non-Production Downsizing**: Staging defaults to zero idle spend optimizations: single-AZ NAT Gateway (`enable_multi_az_nat = false`), single-AZ RDS (`db.t4g.small`), micro Redis (`cache.t4g.micro`), and 2 minimum ECS tasks.
* **Non-Production Scale-Down Scenario**: When staging is not actively in use, running the off-hours scale-down procedure scales compute tasks to 0 and stops or snapshots non-production database instances (with explicit handling of RDS stop/start limitations), targeting an estimated scenario that drops monthly staging idle burn from ~$130–$160/mo to <$15/mo (retaining S3 storage, Route 53 DNS, and KMS keys only).
* **Graviton3 Efficiency**: Workloads utilize AWS Graviton ARM64 architecture (`t4g` instances), delivering 20% lower hourly costs than x86_64 counterparts.

### Q4: Which resources are costing money while Floework is idle?
The following fixed costs accrue even with 0 incoming user traffic:

| Resource | Monthly Idle Cost (us-east-1) | Rationale |
| :--- | :--- | :--- |
| **NAT Gateways** | $32.85 per NAT ($65.70 for Multi-AZ) | Hourly AWS charge ($0.045/hr) for VPC egress |
| **RDS PostgreSQL 16** | $29.20 (Single-AZ) / $58.40 (Multi-AZ) | Reserved `db.t4g.small` compute + 20 GB gp3 storage |
| **Application Load Balancer** | $22.26 | Fixed ALB hourly charge ($0.0225/hr) |
| **ECS Fargate Tasks** | $28.56 (2 tasks @ 0.25 vCPU, 0.5 GB) | Baseline task instances running Fastify API & Worker |
| **ElastiCache Redis** | $12.41 | Fixed `cache.t4g.micro` node for rate limiting |
| **S3, CloudWatch & Route 53** | ~$6.00 | DNS hosted zones, active alarms, base log storage |
| **Total Baseline** | **~$131.28 (Staging)** / **~$193.33 (Prod)** | Fixed infrastructure baseline |

### Q5: Which resources can be removed without affecting functionality?
* **Consolidate Staging NAT Gateways (Saves $32.85/mo)**: Staging uses 1 NAT Gateway in AZ-a; all private subnets route outbound traffic through it. Functional availability is preserved while eliminating a second $32.85/mo charge.
* **ElastiCache Redis in Dev (Saves $12.41/mo)**: For local testing or pre-staging environments, the API seamlessly falls back to an in-memory LRU cache if Redis is unavailable.
* **CloudWatch Log Retention (Saves ~$5.00/mo)**: Container log groups enforce a 30-day retention policy instead of indefinite storage, preventing linear log storage accumulation.
* **S3 Noncurrent Version Expiration (Saves ~$4.50/mo)**: S3 automatically purges superseded object versions after 90 days and transitions active objects to Intelligent-Tiering after 30 days.

---

## 3. Mandatory Cost Allocation Tagging Schema

To ensure complete billing visibility in AWS Cost Explorer and AWS Budgets, all Terraform resources inherit standard tags via AWS provider `default_tags`:

| Tag Key | Example Values | Purpose |
| :--- | :--- | :--- |
| `Project` | `floework` | Cross-service aggregation for the entire SaaS stack |
| `Environment` | `staging`, `production` | Isolates pre-production vs production billing |
| `ManagedBy` | `terraform` | Distinguishes automated IaC from manual Console resources |
| `CostCenter` | `Infrastructure`, `Engineering` | Organizational billing attribution |
| `AutoStop` | `true`, `false` | Tag for automated off-hours resource scheduler |

---

## 4. FinOps Automated Audit Engine CLI

The platform includes an automated FinOps evaluation tool:

```bash
# Run FinOps audit against staging
npm run finops:audit

# Rehearse FinOps evaluation in simulated dry-run mode
npm run finops:dry-run

# Run FinOps audit against production with JSON output
node scripts/finops_cost_audit.mjs --env production --json
```

### Sample Audit Output

```text
Flowework AWS FinOps Audit
==========================

Environment: staging

NAT Gateways:              2
RDS instances:             1
ECS services:              2
ElastiCache clusters:      1
Unattached EBS volumes:    0
Unassociated EIPs:         0

Potential optimizations:
- NAT Gateway consolidation: HIGH
- Redis idle utilization:    MEDIUM
- RDS sizing review:         MEDIUM
- S3 storage lifecycle tiering: LOW

Budget:
Current monthly budget:     $50.00 USD
Alert thresholds:           50 / 80 / 100%
Estimated monthly run-rate: $166.13 (332% of budget)
Cost Anomaly Monitor:       ACTIVE ($10.00 threshold -> SNS)
```

---

## 5. Cost Optimization Hibernation Runbook (Off-Hours Teardown)

When operating Floework on development or demonstration credits, use the following sequence to hibernate active resources without losing data:

1. **Scale ECS Fargate Tasks to 0**:
   ```bash
   aws ecs update-service --cluster floework-staging-cluster --service floework-staging-api --desired-count 0
   aws ecs update-service --cluster floework-staging-cluster --service floework-staging-worker --desired-count 0
   ```
2. **Create Final RDS Snapshot & Stop Instance**:
   ```bash
   aws rds stop-db-instance --db-instance-identifier floework-staging-postgres
   ```
   *(AWS allows RDS instances to remain stopped for up to 7 consecutive days before auto-restarting).*
3. **Resume Operations**:
   ```bash
   aws rds start-db-instance --db-instance-identifier floework-staging-postgres
   aws ecs update-service --cluster floework-staging-cluster --service floework-staging-api --desired-count 1
   aws ecs update-service --cluster floework-staging-cluster --service floework-staging-worker --desired-count 1
   ```
