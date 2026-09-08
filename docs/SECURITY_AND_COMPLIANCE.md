# Floework Enterprise Security, Compliance & Governance Blueprint

## 1. Executive Summary & Security Philosophy

Floework is engineered according to the **AWS Well-Architected Framework (Security & Reliability Pillars)**, **SOC 2 Type II Trust Services Criteria**, and **CIS AWS Foundations Benchmark v3.0**.

The platform enforces a pure AWS-native, zero-trust architecture:
- **Zero Static Credentials**: All deployments authenticate via keyless AWS OIDC identity federation.
- **Defense-in-Depth**: Layer 7 inspection (AWS WAF v2), strict security group chaining, private isolated subnetting, and application-level tenant isolation.
- **Cryptographic Encryption**: Continuous AES-256 / KMS Customer Managed Key (CMK) encryption across database storage, distributed cache, queues, and object storage.
- **Immutable Audit Logging**: Multi-region AWS CloudTrail with cryptographic log file integrity validation streaming to dedicated 365-day retention S3 audit buckets.

---

## 2. SOC 2 Type II Trust Services Criteria Mapping

| SOC 2 Criteria | Floework Architectural Implementation | Primary AWS Services |
| :--- | :--- | :--- |
| **CC6.1 - Logical Access Controls** | Role-Based Access Control (RBAC), Amazon Cognito User Pools, local RS256/HS256 JWKS token validation, request context memoization (`req.user`). | Amazon Cognito, Fastify JWT Verifier |
| **CC6.2 - User Registration & Revocation** | Ephemeral workspace invitations with 256-bit cryptographic entropy (`crypto.randomBytes`), immediate token expiration upon revocation. | Node.js Crypto, PostgreSQL RLS |
| **CC6.6 - Perimeter & Network Boundary** | AWS WAF v2 Regional Web ACL (OWASP Top 10, IP reputation, rate limiting), private data subnets without internet routes, ALB SG isolation. | AWS WAF v2, Amazon VPC, Security Groups |
| **CC6.7 - Data Transmission Encryption** | Forced TLS 1.2/1.3 on all public endpoints, S3 bucket policies enforcing `aws:SecureTransport = true`, ALB HTTP-to-HTTPS redirect. | AWS ACM, Amazon S3, AWS ALB |
| **CC6.8 - Data At-Rest Encryption** | KMS Customer Managed Key with 365-day automated rotation encrypting RDS PostgreSQL storage, ElastiCache Redis, SQS FIFO, and S3. | AWS KMS, Amazon RDS, ElastiCache, SQS |
| **CC7.2 - Security Monitoring & Threat Detection** | Multi-region CloudTrail, CloudWatch Logs real-time security ingestion, AWS Config continuous compliance rule evaluation. | AWS CloudTrail, Amazon CloudWatch, AWS Config |
| **CC8.1 - Change Management & CI/CD** | Keyless GitHub Actions OIDC federation (`aws-actions/configure-aws-credentials`), Terraform modular IaC with automated validation, zero static access keys. | AWS IAM OIDC, Amazon ECR, Terraform |
| **CC9.1 - Business Continuity & Disaster Recovery** | RDS Multi-AZ synchronous standby replication, 30-day automated backup retention, point-in-time recovery (RPO <= 5m, RTO <= 30m). | Amazon RDS Multi-AZ, Amazon S3 Versioning |

---

## 3. CIS AWS Foundations Benchmark Control Matrix

Floework is continuously validated against the 5 primary CIS AWS Foundations Benchmark domains:

### Domain 1: Identity & Access Management (CIS 1.x)
- **CIS-1.1**: Zero hardcoded AWS root or IAM user access keys in application repositories or production configurations.
- **CIS-1.2**: GitHub Actions deployments use keyless IAM OpenID Connect (OIDC) identity provider federation.
- **CIS-1.3**: KMS Customer Managed Key (CMK) configured with automated 365-day key rotation (`enable_key_rotation = true`).
- **CIS-1.4**: Secrets and configuration stored in AWS SSM Parameter Store hierarchy using `SecureString` KMS encryption.

### Domain 2: Storage & Data Encryption (CIS 2.x)
- **CIS-2.1**: All Amazon S3 buckets enforce S3 Block Public Access (`block_public_acls`, `block_public_policy`, `ignore_public_acls`, `restrict_public_buckets`).
- **CIS-2.2**: Object versioning and lifecycle retention rules enabled across asset storage and compliance audit buckets.
- **CIS-2.3**: Amazon RDS PostgreSQL storage encrypted at rest using KMS Customer Managed Key (`storage_encrypted = true`).
- **CIS-2.4**: Amazon ElastiCache Redis replication groups enforce encryption at rest (`at_rest_encryption_enabled = true`).
- **CIS-2.5**: Amazon SQS FIFO queues enforce KMS encryption (`kms_master_key_id = var.kms_key_arn`).

### Domain 3: Perimeter Defense & Network Isolation (CIS 3.x)
- **CIS-3.1**: Database tier isolated in private subnets with route tables containing zero Internet Gateway or NAT Gateway egress routes.
- **CIS-3.2**: Database (port 5432) and Redis (port 6379) security groups strictly limit ingress to the ECS container security group (no `0.0.0.0/0` exposure).
- **CIS-3.3**: AWS WAF v2 Regional Web ACL associated with the Application Load Balancer enforcing OWASP Top 10 Core Rules, Known Bad Inputs, Amazon IP Reputation, and RateLimitPerIP.
- **CIS-3.4**: API server enforces strict origin-based CORS whitelist without wildcard credentials.

### Domain 4: Audit Logging & Continuous Monitoring (CIS 4.x)
- **CIS-4.1**: AWS CloudTrail enabled across all regions (`is_multi_region_trail = true`) capturing global IAM and management events.
- **CIS-4.2**: Cryptographic log file integrity validation enabled (`enable_log_file_validation = true`) ensuring tamper-evidence for all CloudTrail digests.
- **CIS-4.3**: Real-time log event streaming from CloudTrail to Amazon CloudWatch Logs (`/aws/cloudtrail/*`) for instant alerting.
- **CIS-4.4**: AWS Config continuous compliance recorder and managed rules (`S3_BUCKET_PUBLIC_READ_PROHIBITED`, `RDS_STORAGE_ENCRYPTED`, `ENCRYPTED_VOLUMES`, `INCOMING_SSH_DISABLED`, `IAM_ROOT_ACCESS_KEY_CHECK`).
- **CIS-4.5**: Dedicated S3 audit bucket with 365-day compliance retention policy and Standard-IA archival at 90 days.

### Domain 5: Resiliency & High Availability (CIS 5.x)
- **CIS-5.1**: Amazon RDS PostgreSQL Multi-AZ synchronous standby deployment with automatic failover target < 120 seconds.
- **CIS-5.2**: Automated database snapshot retention configured for 30 days with continuous write-ahead log (WAL) archiving.
- **CIS-5.3**: Production networking provisions redundant NAT Gateways per Availability Zone (`enable_multi_az_nat = true`) to prevent single-AZ egress failure.

---

## 4. Secret Safety Protocol

Floework strictly adheres to the AWS Secret Safety rules:
1. **Zero Secret Printing**: No secrets, tokens, database credentials, or API keys may ever appear in log files, console outputs, or error traces.
2. **Secrets Manager Runtime Resolution**: When resolving dynamic secrets, use `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with `asm-exec` so secrets resolve directly in the target container process without entering configuration files or agent context.
3. **Database Master Credentials**: Managed automatically via AWS Secrets Manager (`manage_master_user_password = true`) avoiding any plaintext database passwords in Terraform state.

---

## 5. Continuous Compliance Automation & Auditing

The Floework repository includes an automated security compliance audit CLI:

```bash
# Run security compliance audit in dry-run mode
npm run compliance:dry-run

# Run active compliance audit and generate report
npm run compliance:audit
```

The audit engine evaluates all 5 CIS domains, computes an aggregate compliance score, and outputs a structured compliance report (`compliance_audit_report.json`) detailing passing checks and remediation guidance.

---

## 6. Incident Response & Security Escalation

In the event of a suspected security incident or compliance alarm:
1. **Immediate Triage**: Review CloudWatch alarms in `/aws/cloudtrail/floework-production` and SNS security notifications.
2. **Perimeter Containment**: Update AWS WAF v2 IP sets to block suspect CIDR blocks or increase rate-limiting aggressiveness.
3. **Credential Invalidation**: Revoke active Cognito tokens and trigger KMS key re-encryption if credentials are suspected compromised.
4. **Forensic Audit**: Query CloudTrail audit logs in the dedicated S3 compliance bucket using Amazon Athena for detailed caller identity and API action reconstruction.
