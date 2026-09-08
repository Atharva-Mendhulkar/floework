// test/api/readiness_phase22.test.ts
// ==============================================================================
// Phase 22: Production Launch Readiness & Day-2 Operations Certification Tests
// ==============================================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  READINESS_STATUS,
  READINESS_DOMAINS,
  evaluateProductionReadiness,
  runProductionReadinessAudit
} from '../../scripts/production_readiness_audit.mjs'

describe('Phase 22: Production Launch Readiness & Day-2 Operations Certification', () => {
  const repoRoot = path.resolve(__dirname, '../..')

  // ----------------------------------------------------------------------------
  // 1. Status Taxonomy & Domain Architecture
  // ----------------------------------------------------------------------------
  describe('Status Taxonomy & Domain Definitions', () => {
    it('defines a rigorous, defensible 5-level verification taxonomy', () => {
      expect(READINESS_STATUS.IMPLEMENTED).toBe('IMPLEMENTED')
      expect(READINESS_STATUS.VALIDATED).toBe('VALIDATED')
      expect(READINESS_STATUS.AWS_VALIDATED).toBe('AWS_VALIDATED')
      expect(READINESS_STATUS.FAILURE_TESTED).toBe('FAILURE_TESTED')
      expect(READINESS_STATUS.PROD_TESTED).toBe('PROD_TESTED')
    })

    it('covers all 11 core production launch readiness domains', () => {
      const domainKeys = Object.keys(READINESS_DOMAINS)
      expect(domainKeys.length).toBe(11)

      const expectedDomains = ['SEC', 'NET', 'DAT', 'COM', 'STO', 'MSG', 'RTM', 'OBS', 'CICD', 'RES', 'FIN']
      for (const expectedId of expectedDomains) {
        const found = Object.values(READINESS_DOMAINS).some(d => d.id === expectedId)
        expect(found).toBe(true)
      }
    })
  })

  // ----------------------------------------------------------------------------
  // 2. Automated Production Readiness Certification Engine
  // ----------------------------------------------------------------------------
  describe('Automated Readiness Audit Engine (scripts/production_readiness_audit.mjs)', () => {
    it('achieves a 100% readiness score across all 26 controls', () => {
      const audit = evaluateProductionReadiness({ repoRoot })

      expect(audit.isCertified).toBe(true)
      expect(audit.readinessScore).toBe(100)
      expect(audit.failedChecks).toBe(0)
      expect(audit.passedChecks).toBe(26)
      expect(audit.totalChecks).toBe(26)
      expect(audit.certificationTitle).toBe('Production Launch Readiness: CERTIFIED BY CONFIGURATION AND VALIDATION')
    })

    it('certifies 100% compliance across each of the 11 domains individually', () => {
      const audit = evaluateProductionReadiness({ repoRoot })

      for (const domain of audit.domainSummaries) {
        expect(domain.score).toBe(100)
        expect(domain.failed).toBe(0)
        expect(domain.passed).toBe(domain.total)
      }
    })

    it('exports runProductionReadinessAudit and generates valid JSON report file', async () => {
      const testReportPath = path.join(repoRoot, 'test_readiness_report.json')
      const audit = await runProductionReadinessAudit({
        repoRoot,
        dryRun: true,
        outputPath: testReportPath
      })

      expect(audit).toBeDefined()
      expect(fs.existsSync(testReportPath)).toBe(true)

      const fileContent = JSON.parse(fs.readFileSync(testReportPath, 'utf8'))
      expect(fileContent.isCertified).toBe(true)
      expect(fileContent.readinessScore).toBe(100)

      // Cleanup test artifact
      fs.unlinkSync(testReportPath)
    })
  })

  // ----------------------------------------------------------------------------
  // 3. Production Launch Readiness Report (docs/PRODUCTION_LAUNCH_READINESS_REPORT.md)
  // ----------------------------------------------------------------------------
  describe('Production Launch Readiness Report (docs/PRODUCTION_LAUNCH_READINESS_REPORT.md)', () => {
    const reportPath = path.join(repoRoot, 'docs/PRODUCTION_LAUNCH_READINESS_REPORT.md')

    it('declares certified status by configuration and validation', () => {
      const content = fs.readFileSync(reportPath, 'utf8')

      expect(content).toContain('Production Launch Readiness: CERTIFIED BY CONFIGURATION AND VALIDATION')
      expect(content).toContain('IMPLEMENTED')
      expect(content).toContain('VALIDATED')
      expect(content).toContain('AWS_VALIDATED')
      expect(content).toContain('FAILURE_TESTED')
    })

    it('contains backup & recovery SLA targets with RPO < 5m and RTO < 15m', () => {
      const content = fs.readFileSync(reportPath, 'utf8')

      expect(content).toContain('RPO Target')
      expect(content).toContain('RTO Target')
      expect(content).toContain('< 5 min')
      expect(content).toContain('< 15 min')
      expect(content).toContain('dr_backup_restore.mjs')
    })

    it('documents comprehensive architectural tradeoff rationale across all 5 key areas', () => {
      const content = fs.readFileSync(reportPath, 'utf8')

      expect(content).toContain('AWS ECS Fargate')
      expect(content).toContain('Kubernetes (Amazon EKS)')
      expect(content).toContain('Amazon SQS FIFO')
      expect(content).toContain('Apache Kafka / Amazon MSK')
      expect(content).toContain('Amazon RDS PostgreSQL 16 Multi-AZ')
      expect(content).toContain('Aurora Serverless v2')
      expect(content).toContain('Single NAT (Staging) / Dual NAT (Prod)')
      expect(content).toContain('Stateless Cognito RS256 JWKS')
    })
  })

  // ----------------------------------------------------------------------------
  // 4. Day-2 Operations Runbook (docs/DAY_2_OPERATIONS_RUNBOOK.md)
  // ----------------------------------------------------------------------------
  describe('Day-2 Operations Runbook (docs/DAY_2_OPERATIONS_RUNBOOK.md)', () => {
    const runbookPath = path.join(repoRoot, 'docs/DAY_2_OPERATIONS_RUNBOOK.md')

    it('covers all 11 required operational procedures', () => {
      const content = fs.readFileSync(runbookPath, 'utf8')

      expect(content).toContain('Application Deployment & Rolling Update')
      expect(content).toContain('Automated 48-Hour Rollback Procedure')
      expect(content).toContain('Zero-Downtime Database Schema Migration')
      expect(content).toContain('ECS Fargate Task Crash & Auto-Restart Recovery')
      expect(content).toContain('RDS PostgreSQL Multi-AZ Failover & Reconnection')
      expect(content).toContain('SQS FIFO Queue Backlog & DLQ Redrive')
      expect(content).toContain('ElastiCache Redis Failover & Fallback')
      expect(content).toContain('High HTTP 5xx Error Surge Containment')
      expect(content).toContain('AWS Cost Spike & Anomaly Containment')
      expect(content).toContain('SSM Parameter & Secret Rotation')
      expect(content).toContain('Disaster Recovery Point-in-Time Restoration')
    })
  })

  // ----------------------------------------------------------------------------
  // 5. Incident Response Playbook (docs/INCIDENT_RESPONSE_PLAYBOOK.md)
  // ----------------------------------------------------------------------------
  describe('Incident Response Playbook (docs/INCIDENT_RESPONSE_PLAYBOOK.md)', () => {
    const playbookPath = path.join(repoRoot, 'docs/INCIDENT_RESPONSE_PLAYBOOK.md')

    it('defines standard 6-stage lifecycle and severity levels SEV-1 through SEV-4', () => {
      const content = fs.readFileSync(playbookPath, 'utf8')

      expect(content).toContain('Detect')
      expect(content).toContain('Triage')
      expect(content).toContain('Contain')
      expect(content).toContain('Recover')
      expect(content).toContain('Verify')
      expect(content).toContain('Postmortem')
      expect(content).toContain('SEV-1 (Critical)')
      expect(content).toContain('SEV-2 (High)')
      expect(content).toContain('SEV-3 (Moderate)')
      expect(content).toContain('SEV-4 (Low)')
    })

    it('includes blameless postmortem template with Root Cause Analysis (5 Whys)', () => {
      const content = fs.readFileSync(playbookPath, 'utf8')

      expect(content).toContain('Blameless Postmortem Template')
      expect(content).toContain('Root Cause Analysis (The 5 Whys)')
      expect(content).toContain('Corrective and Preventative Actions (CAPA)')
      expect(content).toContain('Stop-the-Line Protocols')
    })
  })
})
