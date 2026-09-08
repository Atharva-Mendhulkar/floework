// test/api/compliance_phase19.test.ts
// ==============================================================================
// Phase 19: Enterprise Security Governance, AWS CloudTrail, AWS Config
// Continuous Compliance & Automated CIS Benchmark Auditing Tests
// ==============================================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  CIS_BENCHMARK_DOMAINS,
  auditIamGovernance,
  auditStorageAndDataSecurity,
  auditNetworkAndPerimeterDefense,
  auditLoggingAndMonitoring,
  auditResiliencyAndDisasterRecovery,
  runSecurityComplianceAudit
} from '../../scripts/security_compliance_audit.mjs'

describe('Phase 19: Enterprise Security Governance & Compliance', () => {
  const repoRoot = path.resolve(__dirname, '../..')

  // ----------------------------------------------------------------------------
  // 1. Compliance Terraform Module (terraform/modules/compliance)
  // ----------------------------------------------------------------------------
  describe('Compliance Terraform Module (terraform/modules/compliance/)', () => {
    const complianceDir = path.join(repoRoot, 'terraform/modules/compliance')

    it('declares dedicated S3 audit bucket with SSE, versioning, and public block', () => {
      const mainTf = fs.readFileSync(path.join(complianceDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_s3_bucket" "audit_logs"')
      expect(mainTf).toContain('resource "aws_s3_bucket_public_access_block" "audit_logs"')
      expect(mainTf).toContain('block_public_acls       = true')
      expect(mainTf).toContain('block_public_policy     = true')
      expect(mainTf).toContain('resource "aws_s3_bucket_versioning" "audit_logs"')
      expect(mainTf).toContain('status = "Enabled"')
      expect(mainTf).toContain('resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs"')
    })

    it('enforces 365-day compliance lifecycle retention and secure transport in bucket policy', () => {
      const mainTf = fs.readFileSync(path.join(complianceDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_s3_bucket_lifecycle_configuration" "audit_logs"')
      expect(mainTf).toContain('days = 365')
      expect(mainTf).toContain('resource "aws_s3_bucket_policy" "audit_logs"')
      expect(mainTf).toContain('aws:SecureTransport')
      expect(mainTf).toContain('"cloudtrail.amazonaws.com"')
      expect(mainTf).toContain('"config.amazonaws.com"')
    })

    it('declares multi-region AWS CloudTrail with log validation and CloudWatch streaming', () => {
      const mainTf = fs.readFileSync(path.join(complianceDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_cloudtrail" "main"')
      expect(mainTf).toContain('is_multi_region_trail         = true')
      expect(mainTf).toContain('include_global_service_events = true')
      expect(mainTf).toContain('enable_log_file_validation    = true')
      expect(mainTf).toContain('enable_logging                = true')
      expect(mainTf).toContain('resource "aws_cloudwatch_log_group" "cloudtrail"')
      expect(mainTf).toContain('resource "aws_iam_role" "cloudtrail_cloudwatch"')
    })

    it('declares AWS Config continuous compliance recorder and managed rules', () => {
      const mainTf = fs.readFileSync(path.join(complianceDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_config_configuration_recorder" "main"')
      expect(mainTf).toContain('resource "aws_config_delivery_channel" "main"')
      expect(mainTf).toContain('resource "aws_config_config_rule" "s3_bucket_public_read_prohibited"')
      expect(mainTf).toContain('S3_BUCKET_PUBLIC_READ_PROHIBITED')
      expect(mainTf).toContain('resource "aws_config_config_rule" "rds_storage_encrypted"')
      expect(mainTf).toContain('RDS_STORAGE_ENCRYPTED')
      expect(mainTf).toContain('resource "aws_config_config_rule" "encrypted_volumes"')
      expect(mainTf).toContain('ENCRYPTED_VOLUMES')
      expect(mainTf).toContain('resource "aws_config_config_rule" "restricted_ssh"')
      expect(mainTf).toContain('INCOMING_SSH_DISABLED')
      expect(mainTf).toContain('resource "aws_config_config_rule" "iam_root_access_key_check"')
      expect(mainTf).toContain('IAM_ROOT_ACCESS_KEY_CHECK')
    })

    it('exports all critical compliance outputs', () => {
      const outputsTf = fs.readFileSync(path.join(complianceDir, 'outputs.tf'), 'utf8')

      expect(outputsTf).toContain('output "audit_bucket_id"')
      expect(outputsTf).toContain('output "audit_bucket_arn"')
      expect(outputsTf).toContain('output "cloudtrail_id"')
      expect(outputsTf).toContain('output "cloudtrail_arn"')
      expect(outputsTf).toContain('output "cloudwatch_log_group_arn"')
      expect(outputsTf).toContain('output "config_recorder_id"')
      expect(outputsTf).toContain('output "config_rules"')
    })
  })

  // ----------------------------------------------------------------------------
  // 2. Production Composition Wiring (terraform/environments/production)
  // ----------------------------------------------------------------------------
  describe('Production Environment Wiring (terraform/environments/production/)', () => {
    const prodDir = path.join(repoRoot, 'terraform/environments/production')

    it('instantiates module "compliance" in production main.tf', () => {
      const mainTf = fs.readFileSync(path.join(prodDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('module "compliance"')
      expect(mainTf).toContain('source = "../../modules/compliance"')
      expect(mainTf).toContain('kms_key_arn       = module.security.kms_key_arn')
      expect(mainTf).toContain('enable_cloudtrail = var.enable_compliance_logging')
      expect(mainTf).toContain('enable_config     = var.enable_config_evaluation')
    })

    it('exports compliance audit outputs in production outputs.tf', () => {
      const outputsTf = fs.readFileSync(path.join(prodDir, 'outputs.tf'), 'utf8')

      expect(outputsTf).toContain('output "compliance_audit_bucket_id"')
      expect(outputsTf).toContain('output "compliance_cloudtrail_arn"')
      expect(outputsTf).toContain('output "compliance_config_recorder_id"')
      expect(outputsTf).toContain('output "compliance_config_rules"')
    })

    it('declares compliance configuration variables in production variables.tf', () => {
      const varsTf = fs.readFileSync(path.join(prodDir, 'variables.tf'), 'utf8')

      expect(varsTf).toContain('variable "enable_compliance_logging"')
      expect(varsTf).toContain('variable "enable_config_evaluation"')
    })
  })

  // ----------------------------------------------------------------------------
  // 3. Automated CIS Benchmark & Compliance Audit Engine (scripts/security_compliance_audit.mjs)
  // ----------------------------------------------------------------------------
  describe('Automated CIS Benchmark Audit Engine (scripts/security_compliance_audit.mjs)', () => {
    it('defines all 5 CIS AWS Foundations Benchmark domains', () => {
      expect(CIS_BENCHMARK_DOMAINS.DOMAIN_1_IAM.id).toBe('CIS_1_IAM')
      expect(CIS_BENCHMARK_DOMAINS.DOMAIN_2_STORAGE.id).toBe('CIS_2_STORAGE')
      expect(CIS_BENCHMARK_DOMAINS.DOMAIN_3_NETWORK.id).toBe('CIS_3_NETWORK')
      expect(CIS_BENCHMARK_DOMAINS.DOMAIN_4_LOGGING.id).toBe('CIS_4_LOGGING')
      expect(CIS_BENCHMARK_DOMAINS.DOMAIN_5_RESILIENCY.id).toBe('CIS_5_RESILIENCY')
    })

    it('evaluates Domain 1: Identity & Access Management (CIS 1.x)', () => {
      const checks = auditIamGovernance({ repoRoot })

      expect(checks.length).toBe(4)
      expect(checks.every(c => c.status === 'PASSED')).toBe(true)

      const check1 = checks.find(c => c.id === 'CIS-1.1')
      expect(check1?.severity).toBe('CRITICAL')
      expect(check1?.name).toContain('No Hardcoded AWS Root/IAM Access Keys')

      const check2 = checks.find(c => c.id === 'CIS-1.2')
      expect(check2?.severity).toBe('HIGH')
      expect(check2?.name).toContain('Keyless GitHub Actions OIDC')
    })

    it('evaluates Domain 2: Storage & Data Encryption (CIS 2.x)', () => {
      const checks = auditStorageAndDataSecurity()

      expect(checks.length).toBe(5)
      expect(checks.every(c => c.status === 'PASSED')).toBe(true)

      const s3Check = checks.find(c => c.id === 'CIS-2.1')
      expect(s3Check?.name).toContain('S3 Buckets Block Public Access')

      const rdsCheck = checks.find(c => c.id === 'CIS-2.3')
      expect(rdsCheck?.name).toContain('RDS PostgreSQL Storage Encrypted')
    })

    it('evaluates Domain 3: Perimeter Defense & Network Isolation (CIS 3.x)', () => {
      const checks = auditNetworkAndPerimeterDefense()

      expect(checks.length).toBe(4)
      expect(checks.every(c => c.status === 'PASSED')).toBe(true)

      const subnetCheck = checks.find(c => c.id === 'CIS-3.1')
      expect(subnetCheck?.name).toContain('Database Tier Isolated in Private Subnets')

      const wafCheck = checks.find(c => c.id === 'CIS-3.3')
      expect(wafCheck?.name).toContain('AWS WAF v2 Layer 7 Perimeter Defense')
    })

    it('evaluates Domain 4: Audit Logging & Continuous Monitoring (CIS 4.x)', () => {
      const checks = auditLoggingAndMonitoring()

      expect(checks.length).toBe(5)
      expect(checks.every(c => c.status === 'PASSED')).toBe(true)

      const trailCheck = checks.find(c => c.id === 'CIS-4.1')
      expect(trailCheck?.name).toContain('AWS CloudTrail Multi-Region Logging')

      const configCheck = checks.find(c => c.id === 'CIS-4.4')
      expect(configCheck?.name).toContain('AWS Config Continuous Compliance')
    })

    it('evaluates Domain 5: Resiliency & High Availability (CIS 5.x)', () => {
      const checks = auditResiliencyAndDisasterRecovery({ backupRetentionDays: 30 })

      expect(checks.length).toBe(3)
      expect(checks.every(c => c.status === 'PASSED')).toBe(true)

      const multiAzCheck = checks.find(c => c.id === 'CIS-5.1')
      expect(multiAzCheck?.name).toContain('Production RDS Multi-AZ Standby')
    })

    it('executes full audit and certifies 100% compliance in dry-run mode', async () => {
      const report = await runSecurityComplianceAudit({ dryRun: true })

      expect(report.complianceScore).toBe(100)
      expect(report.totalChecks).toBe(21)
      expect(report.passedChecks).toBe(21)
      expect(report.failedChecks).toBe(0)
      expect(report.isCompliant).toBe(true)
      expect(report.domainSummaries.length).toBe(5)
      expect(report.domainSummaries.every(d => d.score === 100)).toBe(true)
    })
  })

  // ----------------------------------------------------------------------------
  // 4. Security & Compliance Documentation Invariants (docs/SECURITY_AND_COMPLIANCE.md)
  // ----------------------------------------------------------------------------
  describe('Security & Compliance Documentation (docs/SECURITY_AND_COMPLIANCE.md)', () => {
    const docPath = path.join(repoRoot, 'docs/SECURITY_AND_COMPLIANCE.md')

    it('exists and documents SOC 2 Trust Services Criteria mapping', () => {
      expect(fs.existsSync(docPath)).toBe(true)
      const content = fs.readFileSync(docPath, 'utf8')

      expect(content).toContain('SOC 2 Type II Trust Services Criteria Mapping')
      expect(content).toContain('CC6.1 - Logical Access Controls')
      expect(content).toContain('CC6.6 - Perimeter & Network Boundary')
      expect(content).toContain('CC6.7 - Data Transmission Encryption')
      expect(content).toContain('CC7.2 - Security Monitoring & Threat Detection')
      expect(content).toContain('CC9.1 - Business Continuity & Disaster Recovery')
    })

    it('documents all 5 CIS AWS Foundations Benchmark domains and Secret Safety', () => {
      const content = fs.readFileSync(docPath, 'utf8')

      expect(content).toContain('Domain 1: Identity & Access Management (CIS 1.x)')
      expect(content).toContain('Domain 2: Storage & Data Encryption (CIS 2.x)')
      expect(content).toContain('Domain 3: Perimeter Defense & Network Isolation (CIS 3.x)')
      expect(content).toContain('Domain 4: Audit Logging & Continuous Monitoring (CIS 4.x)')
      expect(content).toContain('Domain 5: Resiliency & High Availability (CIS 5.x)')
      expect(content).toContain('Secret Safety Protocol')
      expect(content).toContain('{{resolve:secretsmanager:')
      expect(content).toContain('asm-exec')
    })
  })
})
