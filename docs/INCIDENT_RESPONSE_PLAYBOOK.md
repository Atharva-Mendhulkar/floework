# Floework Incident Response Playbook

This document defines the **Incident Management, Escalation, and Postmortem Framework** for the Floework production environment.

---

## 1. Incident Management Lifecycle

Floework enforces a disciplined, 6-stage incident response lifecycle to ensure structured containment and rapid restoration:

```text
  [Detect]  ────►  [Triage]  ────►  [Contain]  ────►  [Recover]  ────►  [Verify]  ────►  [Postmortem]
     │                 │                │                 │                │                 │
CloudWatch /      Determine         Isolate          Failover /       Synthetic         Blameless
SNS Alert Bus     Severity          Blast Radius     Rollback         Smoke Suite       5 Whys RCA
```

### Stage 1: Detect
- **Automated Alerts**: CloudWatch metric alarms trigger SNS operational alert bus (`alb_5xx_errors`, `ecs_cpu_high`, `sqs_focus_dlq`, `rds_high_connections`).
- **Cost Anomalies**: AWS Cost Anomaly Detection notifies on anomalous billing impact.
- **Synthetic Monitoring**: End-to-end multi-surface smoke tester (`npm run smoke`) detects API or CDN endpoint failures.

### Stage 2: Triage
- **Assess Severity Level** (SEV-1 through SEV-4).
- **Assign Incident Roles**:
  - **Incident Commander (IC)**: Leads triage, commands actions, makes Go/No-Go decisions.
  - **Operations Lead**: Executes infrastructure remediation and runbook SOPs.
  - **Communications Lead**: Updates internal stakeholders and external status page.
- **Open War Room**: `#incident-sev-[level]` on Slack and initialize bridge.

### Stage 3: Contain
- **Blast Radius Isolation**:
  - If Layer-7 attack: Apply WAF rate-limiting rules or explicit IP blocks.
  - If bad release: Trigger Route 53 rollback or deploy previous ECS task definition.
  - If poison pill messages: Messages automatically isolate to Dead-Letter Queue (DLQ).

### Stage 4: Recover
- Execute relevant runbook from [`docs/DAY_2_OPERATIONS_RUNBOOK.md`](DAY_2_OPERATIONS_RUNBOOK.md):
  - RDS failover to standby.
  - Redis in-memory rate-limiting fallback.
  - ECS service scale-out.
  - PITR database restoration.

### Stage 5: Verify
- Run end-to-end synthetic verification suite:
  ```bash
  npm run smoke -- --target production
  npm run test:api
  ```
- Confirm CloudWatch alarms return to `OK` state.
- Monitor error budgets and latency percentiles (p99 < 250ms target) for at least 30 minutes.

### Stage 6: Postmortem
- Conduct a blameless retrospective within 48 hours for any SEV-1 or SEV-2 incident.
- Produce postmortem artifact following the template in Section 4.

---

## 2. Incident Severity Classification Matrix

| Severity | Definition | Target Response SLA | Target Resolution SLA | Escalation Path |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Production API completely down, data loss risk, or full customer outage | **< 15 minutes** | **< 2 hours** | On-Call Lead, VP Engineering, CTO |
| **SEV-2 (High)** | Core features degraded (e.g. WebSocket presence offline, AI circuit breaker open) | **< 30 minutes** | **< 4 hours** | Senior DevOps Engineer, Tech Lead |
| **SEV-3 (Moderate)** | Background queue delay, non-critical worker processing latency | **< 2 hours** | **< 24 hours** | Primary Service Maintainer |
| **SEV-4 (Low)** | Minor cosmetic defect, non-blocking telemetry irregularity | **Next Business Day**| **Next Sprint Cycle** | Backlog Triage |

---

## 3. Stop-the-Line Protocols

To prevent compounding operational risk, deployments and infrastructure changes are immediately frozen under any of the following conditions:
1. **Active SEV-1 or SEV-2 Incident**: Zero production deployments permitted until postmortem and sign-off.
2. **Monthly Error Budget Consumption > 20%**: Feature releases freeze to prioritize platform stability.
3. **AWS Budget 100% Exhaustion Alert**: Infrastructure modifications freeze until FinOps triage.
4. **CI/CD Quality Gate Failure**: No manual overrides or forced merges permitted.

---

## 4. Blameless Postmortem Template

```markdown
# Incident Postmortem: [SEV-Level] - [Brief Summary]
**Date:** YYYY-MM-DD  
**Incident Commander:** [Name]  
**Status:** RESOLVED  
**Impact Duration:** XX minutes  

## 1. Executive Summary
A brief 2-3 sentence overview explaining what happened, customer impact, and how it was resolved.

## 2. Customer & Business Impact
- Total Downtime: XX minutes
- Requests Affected: XX% of total traffic
- Financial / SLO Impact: XX% error budget consumed

## 3. Incident Timeline (UTC)
- **14:00 UTC** - CloudWatch alarm `alb_5xx_errors` triggered.
- **14:05 UTC** - Incident Commander paged; SEV-1 declared.
- **14:12 UTC** - Bad migration identified as root cause.
- **14:20 UTC** - Rollback initiated via `production_cutover.mjs --rollback`.
- **14:28 UTC** - Traffic normalized; synthetic smoke tests passed.
- **14:50 UTC** - Incident closed; monitoring in place.

## 5. Root Cause Analysis (The 5 Whys)
1. *Why did the API return 500 errors?* Because a non-nullable column was added without a default value.
2. *Why was a non-nullable column added?* Because the migration script bypassed the expand/contract pattern.
3. *Why did the migration bypass the pattern?* Because the developer did not rehearse in staging with dry-run.
4. *Why did staging not catch it?* Because staging test data had no existing records in that table.
5. *Why was staging missing populated records?* Because seed data did not simulate existing production density.

## 6. Corrective and Preventative Actions (CAPA)
| Action Item | Type | Owner | Due Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| Add migration linter blocking non-nullable columns without defaults | Prevent | DevOps Lead | 2026-09-15 | OPEN |
| Expand staging database seed script with populated mock records | Mitigate | QA Lead | 2026-09-18 | OPEN |
| Update Day-2 runbook with expand/contract migration checklist | Process | Tech Lead | 2026-09-12 | DONE |
```
