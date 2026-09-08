// test/api/production_phase18.test.ts
// ==============================================================================
// Phase 18: Production Infrastructure Hardening, AWS WAF v2 & Disaster Recovery
// Validates Layer 7 perimeter defense, multi-AZ high availability topology,
// production environment module orchestration, and automated DR validation.
// ==============================================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  runDrReadinessAudit,
  simulatePitrRestore,
  DR_DISASTER_SCENARIOS,
  DR_RECOVERY_SLAS
} from '../../scripts/dr_backup_restore.mjs'

describe('Phase 18: AWS WAF v2 Perimeter Defense Module (terraform/modules/waf)', () => {
  const wafMainPath = path.resolve(__dirname, '../../terraform/modules/waf/main.tf')
  const wafVarsPath = path.resolve(__dirname, '../../terraform/modules/waf/variables.tf')
  const wafOutputsPath = path.resolve(__dirname, '../../terraform/modules/waf/outputs.tf')

  it('declares a Regional AWS WAF v2 Web ACL with default allow action', () => {
    const mainTf = fs.readFileSync(wafMainPath, 'utf-8')

    expect(mainTf).toContain('resource "aws_wafv2_web_acl" "main"')
    expect(mainTf).toContain('scope       = "REGIONAL"')
    expect(mainTf).toContain('default_action {')
    expect(mainTf).toContain('allow {}')
  })

  it('configures AWS Managed Rules for OWASP Top 10 common vulnerabilities', () => {
    const mainTf = fs.readFileSync(wafMainPath, 'utf-8')

    expect(mainTf).toContain('name     = "AWSManagedRulesCommonRuleSet"')
    expect(mainTf).toContain('priority = 10')
    expect(mainTf).toContain('vendor_name = "AWS"')
    expect(mainTf).toContain('cloudwatch_metrics_enabled = true')
  })

  it('configures AWS Managed Rules for Known Bad Inputs and Amazon IP Reputation', () => {
    const mainTf = fs.readFileSync(wafMainPath, 'utf-8')

    expect(mainTf).toContain('name     = "AWSManagedRulesKnownBadInputsRuleSet"')
    expect(mainTf).toContain('priority = 20')

    expect(mainTf).toContain('name     = "AWSManagedRulesAmazonIpReputationList"')
    expect(mainTf).toContain('priority = 30')
  })

  it('enforces custom IP rate limiting with block action for Layer 7 DDoS mitigation', () => {
    const mainTf = fs.readFileSync(wafMainPath, 'utf-8')

    expect(mainTf).toContain('name     = "RateLimitPerIP"')
    expect(mainTf).toContain('priority = 40')
    expect(mainTf).toContain('action {')
    expect(mainTf).toContain('block {}')
    expect(mainTf).toContain('rate_based_statement {')
    expect(mainTf).toContain('aggregate_key_type = "IP"')
    expect(mainTf).toContain('limit              = var.rate_limit_requests_per_5m')
  })

  it('associates Web ACL with the Application Load Balancer ARN', () => {
    const mainTf = fs.readFileSync(wafMainPath, 'utf-8')

    expect(mainTf).toContain('resource "aws_wafv2_web_acl_association" "alb"')
    expect(mainTf).toContain('resource_arn = var.alb_arn')
    expect(mainTf).toContain('web_acl_arn  = aws_wafv2_web_acl.main.arn')
  })

  it('exports complete WAF Web ACL outputs', () => {
    const outputsTf = fs.readFileSync(wafOutputsPath, 'utf-8')

    expect(outputsTf).toContain('output "web_acl_arn"')
    expect(outputsTf).toContain('output "web_acl_id"')
    expect(outputsTf).toContain('output "web_acl_name"')
    expect(outputsTf).toContain('output "web_acl_capacity"')
  })
})

describe('Phase 18: Production High-Availability Environment (terraform/environments/production)', () => {
  const prodMainPath = path.resolve(__dirname, '../../terraform/environments/production/main.tf')
  const prodVarsPath = path.resolve(__dirname, '../../terraform/environments/production/variables.tf')
  const prodOutputsPath = path.resolve(__dirname, '../../terraform/environments/production/outputs.tf')
  const prodTfvarsPath = path.resolve(__dirname, '../../terraform/environments/production/terraform.tfvars.example')

  it('wires all 17 infrastructure modules together in production main.tf', () => {
    const mainTf = fs.readFileSync(prodMainPath, 'utf-8')

    expect(mainTf).toContain('module "networking"')
    expect(mainTf).toContain('module "security"')
    expect(mainTf).toContain('module "auth"')
    expect(mainTf).toContain('module "database"')
    expect(mainTf).toContain('module "secrets"')
    expect(mainTf).toContain('module "alb"')
    expect(mainTf).toContain('module "waf"')
    expect(mainTf).toContain('module "cache"')
    expect(mainTf).toContain('module "compute"')
    expect(mainTf).toContain('module "realtime"')
    expect(mainTf).toContain('module "storage"')
    expect(mainTf).toContain('module "queue"')
    expect(mainTf).toContain('module "observability"')
    expect(mainTf).toContain('module "frontend"')
    expect(mainTf).toContain('module "dns"')
    expect(mainTf).toContain('module "email"')
    expect(mainTf).toContain('module "ci_cd"')
  })

  it('enforces production multi-AZ high availability invariants across networking, database, and cache', () => {
    const mainTf = fs.readFileSync(prodMainPath, 'utf-8')
    const varsTf = fs.readFileSync(prodVarsPath, 'utf-8')

    // Networking: Redundant NAT Gateways
    expect(mainTf).toContain('enable_multi_az_nat       = var.enable_multi_az_nat')
    expect(varsTf).toContain('variable "enable_multi_az_nat"')
    expect(varsTf).toMatch(/variable "enable_multi_az_nat"[\s\S]*?default\s*=\s*true/)

    // Database: RDS PostgreSQL 16 Multi-AZ, 30-day retention, Deletion Protection
    expect(mainTf).toContain('multi_az                = var.db_multi_az')
    expect(mainTf).toContain('deletion_protection     = var.db_deletion_protection')
    expect(mainTf).toContain('backup_retention_period = var.db_backup_retention_period')
    expect(varsTf).toMatch(/variable "db_multi_az"[\s\S]*?default\s*=\s*true/)
    expect(varsTf).toMatch(/variable "db_deletion_protection"[\s\S]*?default\s*=\s*true/)
    expect(varsTf).toMatch(/variable "db_backup_retention_period"[\s\S]*?default\s*=\s*30/)

    // Cache: ElastiCache Redis 2-cluster replication group
    expect(mainTf).toContain('num_cache_clusters      = var.redis_num_cache_clusters')
    expect(varsTf).toMatch(/variable "redis_num_cache_clusters"[\s\S]*?default\s*=\s*2/)

    // Ingress: WAF attached to ALB
    expect(mainTf).toContain('module "waf"')
    expect(mainTf).toContain('alb_arn                    = module.alb.alb_arn')

    // Domain & DNS: Enabled by default in production
    expect(varsTf).toMatch(/variable "enable_custom_domain"[\s\S]*?default\s*=\s*true/)
    expect(varsTf).toMatch(/variable "custom_domain_name"[\s\S]*?default\s*=\s*"floework.com"/)
  })

  it('exports complete production outputs including WAF, ALB, RDS, and DNS', () => {
    const outputsTf = fs.readFileSync(prodOutputsPath, 'utf-8')

    // WAF outputs
    expect(outputsTf).toContain('output "waf_web_acl_arn"')
    expect(outputsTf).toContain('output "waf_web_acl_id"')
    expect(outputsTf).toContain('output "waf_web_acl_name"')

    // Core infrastructure outputs
    expect(outputsTf).toContain('output "vpc_id"')
    expect(outputsTf).toContain('output "nat_gateway_ips"')
    expect(outputsTf).toContain('output "alb_arn"')
    expect(outputsTf).toContain('output "alb_dns_name"')
    expect(outputsTf).toContain('output "rds_endpoint"')
    expect(outputsTf).toContain('output "redis_endpoint"')
    expect(outputsTf).toContain('output "ecs_cluster_name"')
    expect(outputsTf).toContain('output "frontend_cloudfront_domain_name"')
    expect(outputsTf).toContain('output "dns_hosted_zone_id"')
    expect(outputsTf).toContain('output "dns_api_record"')
    expect(outputsTf).toContain('output "dns_web_record"')
    expect(outputsTf).toContain('output "dns_certificate_arn"')
  })

  it('provides a valid terraform.tfvars.example template for production operators', () => {
    expect(fs.existsSync(prodTfvarsPath)).toBe(true)
    const tfvars = fs.readFileSync(prodTfvarsPath, 'utf-8')

    expect(tfvars).toContain('environment  = "production"')
    expect(tfvars).toContain('enable_multi_az_nat = true')
    expect(tfvars).toContain('db_multi_az                = true')
    expect(tfvars).toContain('db_backup_retention_period = 30')
    expect(tfvars).toContain('redis_num_cache_clusters = 2')
    expect(tfvars).toContain('enable_custom_domain = true')
  })
})

describe('Phase 18: Disaster Recovery (DR) Automation Engine (scripts/dr_backup_restore.mjs)', () => {
  it('defines all 3 disaster recovery scenarios with RTO and RPO targets', () => {
    expect(DR_DISASTER_SCENARIOS).toHaveLength(3)

    const azScenario = DR_DISASTER_SCENARIOS.find((s) => s.id === 'SCENARIO_AZ_OUTAGE')
    expect(azScenario).toBeDefined()
    expect(azScenario?.targetRtoMinutes).toBe(2)
    expect(azScenario?.targetRpoMinutes).toBe(0)

    const corruptScenario = DR_DISASTER_SCENARIOS.find((s) => s.id === 'SCENARIO_DATA_CORRUPTION')
    expect(corruptScenario).toBeDefined()
    expect(corruptScenario?.targetRtoMinutes).toBe(25)
    expect(corruptScenario?.targetRpoMinutes).toBe(5)

    const regionScenario = DR_DISASTER_SCENARIOS.find((s) => s.id === 'SCENARIO_REGION_OUTAGE')
    expect(regionScenario).toBeDefined()
    expect(regionScenario?.targetRtoMinutes).toBe(45)
  })

  it('declares maximum allowable RTO (30m) and RPO (5m) operational thresholds', () => {
    expect(DR_RECOVERY_SLAS.maxRtoMinutes).toBe(30)
    expect(DR_RECOVERY_SLAS.maxRpoMinutes).toBe(5)
  })

  it('executes DR readiness audit in dry-run mode and certifies production readiness', async () => {
    const report = await runDrReadinessAudit({
      dryRun: true,
      backupRetentionDays: 30,
      multiAz: true,
      s3Versioning: true
    })

    expect(report.allPassed).toBe(true)
    expect(report.totalChecks).toBe(6)
    expect(report.totalPassed).toBe(6)
    expect(report.totalFailed).toBe(0)
    expect(report.verdict).toBe('DR_READINESS_CERTIFIED')

    const checkNames = report.checks.map((c) => c.name)
    expect(checkNames).toContain('RDS Automated Backup Retention Window')
    expect(checkNames).toContain('RDS Multi-AZ Synchronous Standby Deployment')
    expect(checkNames).toContain('S3 Private Storage & Frontend Versioning Protection')
    expect(checkNames).toContain('Point-In-Time Recovery (PITR) RPO Tolerance')
    expect(checkNames).toContain('Automated Snapshot Restoration RTO Tolerance')
    expect(checkNames).toContain('Multi-Tenant Domain Schema Dependency Verification')
  })

  it('flags deficiencies when backup retention window is less than minimum SLA', async () => {
    const report = await runDrReadinessAudit({
      dryRun: true,
      backupRetentionDays: 3 // less than 7 days minimum
    })

    expect(report.allPassed).toBe(false)
    expect(report.totalFailed).toBeGreaterThan(0)
    expect(report.verdict).toBe('DEFICIENCIES_DETECTED')

    const backupCheck = report.checks.find((c) => c.category === 'DATABASE_BACKUP')
    expect(backupCheck?.status).toBe('FAILED')
  })

  it('simulates Point-In-Time Recovery restore sequence through all 5 operational stages', async () => {
    const pitrSimulation = await simulatePitrRestore({
      restoreTime: '2026-09-08T12:00:00Z',
      targetInstanceId: 'floework-prod-db-pitr-test'
    })

    expect(pitrSimulation.action).toBe('SIMULATED_PITR_RESTORE')
    expect(pitrSimulation.allPassed).toBe(true)
    expect(pitrSimulation.stages).toHaveLength(5)

    const stageNames = pitrSimulation.stages.map((s) => s.name)
    expect(stageNames).toContain('IDENTIFY_RECOVERY_POINT')
    expect(stageNames).toContain('PROVISION_RESTORED_INSTANCE')
    expect(stageNames).toContain('STREAM_WAL_LOGS')
    expect(stageNames).toContain('SCHEMA_INTEGRITY_CHECK')
    expect(stageNames).toContain('PROD_SWAP_READINESS')
  })
})

describe('Phase 18: Disaster Recovery Runbook Invariants (docs/DISASTER_RECOVERY_RUNBOOK.md)', () => {
  const runbookPath = path.resolve(__dirname, '../../docs/DISASTER_RECOVERY_RUNBOOK.md')

  it('documents RTO, RPO, and all 4 critical disaster recovery playbooks', () => {
    expect(fs.existsSync(runbookPath)).toBe(true)
    const runbook = fs.readFileSync(runbookPath, 'utf-8')

    expect(runbook).toContain('Recovery Time Objective (RTO)')
    expect(runbook).toContain('Recovery Point Objective (RPO)')
    expect(runbook).toContain('Scenario A: Single Availability Zone Outage')
    expect(runbook).toContain('Scenario B: Accidental Table Deletion or Logical Data Corruption')
    expect(runbook).toContain('Scenario C: Catastrophic Regional Outage')
    expect(runbook).toContain('Scenario D: Malicious S3 Asset Deletion or Ransomware Attack')
    expect(runbook).toContain('Quarterly DR Testing & Validation Protocol')
  })
})
