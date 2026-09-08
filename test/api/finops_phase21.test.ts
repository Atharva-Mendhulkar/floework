// test/api/finops_phase21.test.ts
// ==============================================================================
// Phase 21: FinOps, AWS Budgets & Continuous Cost Optimization Governance Tests
// ==============================================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  FINOPS_PRIORITIES,
  AWS_COST_BASELINES,
  auditEnvironmentResources,
  runFinOpsCostAudit
} from '../../scripts/finops_cost_audit.mjs'

describe('Phase 21: FinOps, AWS Budgets & Continuous Cost Optimization Governance', () => {
  const repoRoot = path.resolve(__dirname, '../..')

  // ----------------------------------------------------------------------------
  // 1. FinOps Terraform Module (terraform/modules/finops/)
  // ----------------------------------------------------------------------------
  describe('FinOps Terraform Module (terraform/modules/finops/)', () => {
    const finopsDir = path.join(repoRoot, 'terraform/modules/finops')

    it('declares aws_budgets_budget with monthly cost type and multi-tier alert triggers', () => {
      const mainTf = fs.readFileSync(path.join(finopsDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_budgets_budget" "monthly_cost"')
      expect(mainTf).toContain('budget_type  = "COST"')
      expect(mainTf).toContain('time_unit    = "MONTHLY"')
      expect(mainTf).toContain('threshold                  = 50')
      expect(mainTf).toContain('threshold                  = 80')
      expect(mainTf).toContain('threshold                  = 100')
      expect(mainTf).toContain('notification_type          = "FORECASTED"')
      expect(mainTf).toContain('subscriber_sns_topic_arns  = [var.sns_alert_topic_arn]')
    })

    it('declares aws_ce_anomaly_monitor for service-level dimensional cost tracking', () => {
      const mainTf = fs.readFileSync(path.join(finopsDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_ce_anomaly_monitor" "service_monitor"')
      expect(mainTf).toContain('monitor_type      = "DIMENSIONAL"')
      expect(mainTf).toContain('monitor_dimension = "SERVICE"')
    })

    it('declares aws_ce_anomaly_subscription dispatching alerts to SNS topic', () => {
      const mainTf = fs.readFileSync(path.join(finopsDir, 'main.tf'), 'utf8')

      expect(mainTf).toContain('resource "aws_ce_anomaly_subscription" "sns_subscription"')
      expect(mainTf).toContain('type    = "SNS"')
      expect(mainTf).toContain('address = var.sns_alert_topic_arn')
      expect(mainTf).toContain('ANOMALY_TOTAL_IMPACT_ABSOLUTE')
    })

    it('declares complete input variables and outputs', () => {
      const varsTf = fs.readFileSync(path.join(finopsDir, 'variables.tf'), 'utf8')
      const outputsTf = fs.readFileSync(path.join(finopsDir, 'outputs.tf'), 'utf8')

      expect(varsTf).toContain('variable "monthly_budget_amount"')
      expect(varsTf).toContain('variable "sns_alert_topic_arn"')
      expect(varsTf).toContain('variable "enable_cost_anomaly_detection"')
      expect(varsTf).toContain('variable "anomaly_threshold_amount"')

      expect(outputsTf).toContain('output "budget_id"')
      expect(outputsTf).toContain('output "budget_name"')
      expect(outputsTf).toContain('output "budget_limit_amount"')
      expect(outputsTf).toContain('output "anomaly_monitor_arn"')
      expect(outputsTf).toContain('output "anomaly_subscription_arn"')
    })
  })

  // ----------------------------------------------------------------------------
  // 2. Staging and Production Environment Integration
  // ----------------------------------------------------------------------------
  describe('Environment Compositions Integration (staging & production)', () => {
    it('instantiates module finops in staging with $50 budget and SNS alert topic', () => {
      const stagingMain = fs.readFileSync(path.join(repoRoot, 'terraform/environments/staging/main.tf'), 'utf8')
      const stagingOutputs = fs.readFileSync(path.join(repoRoot, 'terraform/environments/staging/outputs.tf'), 'utf8')

      expect(stagingMain).toContain('module "finops"')
      expect(stagingMain).toContain('monthly_budget_amount         = var.monthly_budget_amount')
      expect(stagingMain).toContain('sns_alert_topic_arn           = module.observability.sns_alerts_topic_arn')
      expect(stagingOutputs).toContain('output "finops_budget_id"')
      expect(stagingOutputs).toContain('output "finops_anomaly_monitor_arn"')
    })

    it('instantiates module finops in production with $200 budget and SNS alert topic', () => {
      const prodMain = fs.readFileSync(path.join(repoRoot, 'terraform/environments/production/main.tf'), 'utf8')
      const prodOutputs = fs.readFileSync(path.join(repoRoot, 'terraform/environments/production/outputs.tf'), 'utf8')

      expect(prodMain).toContain('module "finops"')
      expect(prodMain).toContain('monthly_budget_amount         = var.monthly_budget_amount')
      expect(prodMain).toContain('sns_alert_topic_arn           = module.observability.sns_alerts_topic_arn')
      expect(prodOutputs).toContain('output "finops_budget_id"')
      expect(prodOutputs).toContain('output "finops_anomaly_monitor_arn"')
    })
  })

  // ----------------------------------------------------------------------------
  // 3. S3 Storage Lifecycle & Cost Tiering Optimization
  // ----------------------------------------------------------------------------
  describe('S3 Storage Lifecycle Optimization (terraform/modules/storage/)', () => {
    it('configures Intelligent-Tiering and Glacier IR lifecycle transitions', () => {
      const storageMain = fs.readFileSync(path.join(repoRoot, 'terraform/modules/storage/main.tf'), 'utf8')

      expect(storageMain).toContain('storage_class = "INTELLIGENT_TIERING"')
      expect(storageMain).toContain('storage_class   = "GLACIER_IR"')
      expect(storageMain).toContain('noncurrent_version_expiration')
      expect(storageMain).toContain('abort_incomplete_multipart_upload')
    })
  })

  // ----------------------------------------------------------------------------
  // 4. FinOps Cost Audit Engine (scripts/finops_cost_audit.mjs)
  // ----------------------------------------------------------------------------
  describe('FinOps Cost Audit Engine (scripts/finops_cost_audit.mjs)', () => {
    it('accurately evaluates environment inventory and baseline cost drivers', () => {
      const audit = auditEnvironmentResources({ environment: 'staging', natGateways: 1 })

      expect(audit.environment).toBe('staging')
      expect(audit.inventory.natGateways).toBe(1)
      expect(audit.inventory.rdsInstances).toBe(1)
      expect(audit.inventory.ecsServices).toBe(2)
      expect(audit.inventory.elasticacheClusters).toBe(1)
      expect(audit.inventory.unattachedEbsVolumes).toBe(0)
      expect(audit.inventory.unassociatedEips).toBe(0)
      expect(audit.costEstimates.estimatedMonthlyTotal).toBeGreaterThan(50)
      expect(audit.budget.monthlyLimitUsd).toBe(50.0)
    })

    it('identifies NAT Gateway consolidation as HIGH priority when multi-AZ NAT is detected in non-prod', () => {
      const audit = auditEnvironmentResources({ environment: 'staging', natGateways: 2 })

      const natOpt = audit.potentialOptimizations.find(o => o.title.includes('NAT Gateway consolidation'))
      expect(natOpt).toBeDefined()
      expect(natOpt?.priority).toBe(FINOPS_PRIORITIES.HIGH)
      expect(natOpt?.monthlySavingsEst).toBeCloseTo(AWS_COST_BASELINES.NAT_GATEWAY_MONTHLY, 1)
    })

    it('identifies Redis idle utilization and RDS sizing as MEDIUM priority optimizations', () => {
      const audit = auditEnvironmentResources({ environment: 'staging', natGateways: 1 })

      const redisOpt = audit.potentialOptimizations.find(o => o.title.includes('Redis'))
      const rdsOpt = audit.potentialOptimizations.find(o => o.title.includes('RDS'))

      expect(redisOpt).toBeDefined()
      expect(redisOpt?.priority).toBe(FINOPS_PRIORITIES.MEDIUM)
      expect(rdsOpt).toBeDefined()
      expect(rdsOpt?.priority).toBe(FINOPS_PRIORITIES.MEDIUM)
    })

    it('exports runFinOpsCostAudit which generates a valid report file', async () => {
      const testReportPath = path.join(repoRoot, 'test_finops_report.json')
      const audit = await runFinOpsCostAudit({
        environment: 'staging',
        natGateways: 2,
        outputPath: testReportPath
      })

      expect(audit).toBeDefined()
      expect(audit.inventory.natGateways).toBe(2)
      expect(fs.existsSync(testReportPath)).toBe(true)

      const fileContent = JSON.parse(fs.readFileSync(testReportPath, 'utf8'))
      expect(fileContent.environment).toBe('staging')
      expect(fileContent.inventory.natGateways).toBe(2)

      // Cleanup test artifact
      fs.unlinkSync(testReportPath)
    })
  })

  // ----------------------------------------------------------------------------
  // 5. FinOps Playbook Documentation Verification
  // ----------------------------------------------------------------------------
  describe('Operational FinOps Playbook (docs/FINOPS_AND_COST_OPTIMIZATION.md)', () => {
    it('answers all 5 core operational and interview cost governance questions', () => {
      const playbook = fs.readFileSync(path.join(repoRoot, 'docs/FINOPS_AND_COST_OPTIMIZATION.md'), 'utf8')

      expect(playbook).toContain('What happens if I accidentally leave an expensive resource running?')
      expect(playbook).toContain('What happens if traffic unexpectedly increases?')
      expect(playbook).toContain('What happens when AWS credits expire?')
      expect(playbook).toContain('Which resources are costing money while Floework is idle?')
      expect(playbook).toContain('Which resources can be removed without affecting functionality?')
      expect(playbook).toContain('NAT Gateways')
      expect(playbook).toContain('Cost Allocation Tagging Schema')
      expect(playbook).toContain('Cost Optimization Hibernation Runbook')
    })
  })
})
