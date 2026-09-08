// test/api/cutover_phase17.test.ts
// ==============================================================================
// Phase 17: Production Cutover, Live Environment Verification & DNS Automation
// Validates synthetic smoke test multi-surface probing, cutover orchestration,
// Route 53 DNS / ACM certificate validation, and automated rollback runbook.
// ==============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from 'http'
import fs from 'fs'
import path from 'path'
import {
  probeEndpoint,
  runSmokeTests,
  runFrontendSmokeTests,
  runFullProductionVerification
} from '../../scripts/smoke_test_e2e.mjs'
import {
  CUTOVER_STAGES,
  ROLLBACK_STAGES,
  runPreflightCheck,
  executeDnsSwitchover,
  executeDnsRollback,
  executeCutover,
  executeRollback
} from '../../scripts/production_cutover.mjs'
import { createServer } from '../../api/server'

describe('Phase 17: Multi-Surface Synthetic Smoke Testing Harness (scripts/smoke_test_e2e.mjs)', () => {
  let apiServer: http.Server
  let apiPort: number
  let cdnServer: http.Server
  let cdnPort: number

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/floework'
    process.env.AWS_REGION = 'us-east-1'

    // 1. Launch Fastify API server
    apiServer = createServer()
    await new Promise<void>((resolve) => {
      apiServer.listen(0, '127.0.0.1', () => {
        const addr = apiServer.address()
        if (typeof addr === 'object' && addr) {
          apiPort = addr.port
        }
        resolve()
      })
    })

    // 2. Launch Mock CloudFront CDN Origin Server
    cdnServer = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/workspace/settings' || req.url === '/index.html') {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        })
        res.end('<!DOCTYPE html><html><head><title>Floework</title></head><body><div id="root"></div></body></html>')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })

    await new Promise<void>((resolve) => {
      cdnServer.listen(0, '127.0.0.1', () => {
        const addr = cdnServer.address()
        if (typeof addr === 'object' && addr) {
          cdnPort = addr.port
        }
        resolve()
      })
    })
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => apiServer.close(() => resolve()))
    await new Promise<void>((resolve) => cdnServer.close(() => resolve()))
  })

  it('probes individual endpoints with custom validators and extracts response headers', async () => {
    const result = await probeEndpoint(
      'Custom HTML Probe',
      `http://127.0.0.1:${cdnPort}/`,
      {},
      (res, headers) => {
        return {
          customVerified: headers['x-frame-options'] === 'DENY'
        }
      }
    )

    expect(result.status).toBe('PASSED')
    expect(result.statusCode).toBe(200)
    expect(result.headers['x-content-type-options']).toBe('nosniff')
    expect((result as any).customVerified).toBe(true)
  })

  it('runs extended API smoke tests including CORS preflight and focus boundary', async () => {
    const summary = await runSmokeTests(`http://127.0.0.1:${apiPort}`, { extended: true })

    expect(summary.total).toBe(7)
    expect(summary.passed).toBe(7)
    expect(summary.allPassed).toBe(true)

    const probeNames = summary.results.map((r) => r.name)
    expect(probeNames).toContain('Liveness Probe (/health/live)')
    expect(probeNames).toContain('Readiness Probe (/health/ready)')
    expect(probeNames).toContain('Focus Completion SQS Boundary')
    expect(probeNames).toContain('CORS Preflight Probe')
  })

  it('runs frontend CDN smoke tests validating SPA route fallback and cache headers', async () => {
    const cdnSummary = await runFrontendSmokeTests(`http://127.0.0.1:${cdnPort}`)

    expect(cdnSummary.total).toBe(4)
    expect(cdnSummary.passed).toBe(4)
    expect(cdnSummary.allPassed).toBe(true)

    const names = cdnSummary.results.map((r) => r.name)
    expect(names).toContain('CDN Root HTML Probe (/)')
    expect(names).toContain('CloudFront SPA Fallback Route (/workspace/settings)')
    expect(names).toContain('Frontend Cache-Control Policy Audit')
    expect(names).toContain('CloudFront Security Headers Policy Audit')
  })

  it('executes unified multi-surface verification across both API and CDN origins', async () => {
    const fullSummary = await runFullProductionVerification({
      apiUrl: `http://127.0.0.1:${apiPort}`,
      cdnUrl: `http://127.0.0.1:${cdnPort}`,
      extended: true
    })

    expect(fullSummary.allPassed).toBe(true)
    expect(fullSummary.totalChecks).toBe(11) // 7 API + 4 CDN
    expect(fullSummary.totalPassed).toBe(11)
    expect(fullSummary.totalFailed).toBe(0)
    expect(fullSummary.apiSummary).toBeDefined()
    expect(fullSummary.cdnSummary).toBeDefined()
  })

  it('flags latency SLA warnings if probe durations exceed configured threshold', async () => {
    const summary = await runSmokeTests(`http://127.0.0.1:${apiPort}`, {
      maxLatencyMs: 0 // forces latency warning on any probe > 0ms
    })

    expect(summary.allPassed).toBe(true)
    const warnedProbes = summary.results.filter((r) => Boolean((r as any).latencyWarning))
    expect(warnedProbes.length).toBeGreaterThan(0)
    expect((warnedProbes[0] as any).latencyWarning).toContain('exceeded SLA threshold')
  })
})

describe('Phase 17: Production Cutover Orchestrator (scripts/production_cutover.mjs)', () => {
  it('defines all standard cutover and rollback stages in strict sequential order', () => {
    expect(CUTOVER_STAGES).toEqual([
      'STAGE_1_PREFLIGHT',
      'STAGE_2_MAINTENANCE_LOCK',
      'STAGE_3_DELTA_SYNC',
      'STAGE_4_PRE_DNS_ORIGIN_VERIFICATION',
      'STAGE_5_DNS_SWITCHOVER',
      'STAGE_6_POST_DNS_LIVE_CERTIFICATION'
    ])

    expect(ROLLBACK_STAGES).toEqual([
      'STAGE_1_TRIGGER_ROLLBACK',
      'STAGE_2_DNS_REVERSION',
      'STAGE_3_REVERSE_DELTA_SYNC',
      'STAGE_4_LEGACY_VERIFICATION'
    ])
  })

  it('performs pre-flight readiness audit in dry-run mode', async () => {
    const preflight = await runPreflightCheck({
      domain: 'staging.floework.com',
      dryRun: true
    })

    expect(preflight.status).toBe('PASSED')
    expect(preflight.targetDomain).toBe('staging.floework.com')
    expect(preflight.deltaSyncReady).toBe(true)
    expect(preflight.details.tablesChecked).toBe(7)
  })

  it('configures Route 53 DNS alias records for ALB API and CloudFront Web ingress with 60s TTL', async () => {
    const dnsResult = await executeDnsSwitchover({
      domain: 'floework.com',
      albDnsName: 'floework-alb-123456789.us-east-1.elb.amazonaws.com',
      cloudfrontDomain: 'd111111abcdef8.cloudfront.net',
      dryRun: true
    })

    expect(dnsResult.status).toBe('APPLIED')
    expect(dnsResult.mode).toBe('SIMULATED')
    expect(dnsResult.recordsApplied).toHaveLength(2)

    const apiRecord = dnsResult.recordsApplied.find((r) => r.name === 'api.floework.com')
    expect(apiRecord).toBeDefined()
    expect(apiRecord?.type).toBe('A')
    expect(apiRecord?.target).toContain('floework-alb')
    expect(apiRecord?.evaluateTargetHealth).toBe(true)
    expect(apiRecord?.ttl).toBe(60)

    const webRecord = dnsResult.recordsApplied.find((r) => r.name === 'floework.com')
    expect(webRecord).toBeDefined()
    expect(webRecord?.type).toBe('A')
    expect(webRecord?.target).toBe('d111111abcdef8.cloudfront.net')
    expect(webRecord?.ttl).toBe(60)
  })

  it('executes full cutover orchestrator in dry-run mode and certifies go-live', async () => {
    const auditReport = await executeCutover({
      dryRun: true,
      domain: 'floework.internal',
      mockSmokeVerification: true,
      writeReport: false
    })

    expect(auditReport.action).toBe('PRODUCTION_CUTOVER')
    expect(auditReport.status).toBe('SUCCESS')
    expect(auditReport.dryRun).toBe(true)
    expect(auditReport.signOff.verdict).toBe('GO_LIVE_CERTIFIED')
    expect(auditReport.deltaDigest).toBeDefined()

    // Ensure all 6 stages passed
    for (const stage of CUTOVER_STAGES) {
      expect(auditReport.stages[stage]).toBeDefined()
      expect(auditReport.stages[stage].status).toBe('PASSED')
    }
  })

  it('halts and aborts cutover sequence if delta sync or preflight detects discrepancies', async () => {
    const mockFaultySourceClient = {
      query: vi.fn().mockRejectedValue(new Error('Connection terminated by database firewall'))
    }

    const auditReport = await executeCutover({
      dryRun: true,
      domain: 'floework.internal',
      sourceClient: mockFaultySourceClient,
      writeReport: false
    })

    expect(auditReport.status).toBe('ABORTED')
    expect(auditReport.signOff.verdict).toBe('ABORTED')
    expect(auditReport.abortReason).toContain('Preflight audit failed')

    // Verify subsequent stages were never reached
    expect(auditReport.stages['STAGE_5_DNS_SWITCHOVER']).toBeUndefined()
    expect(auditReport.stages['STAGE_6_POST_DNS_LIVE_CERTIFICATION']).toBeUndefined()
  })

  it('executes automated rollback sequence with reverse delta sync and DNS reversion', async () => {
    const rollbackReport = await executeRollback({
      dryRun: true,
      domain: 'floework.com',
      reason: 'Synthetic smoke probe latency degradation post-switchover',
      writeReport: false
    })

    expect(rollbackReport.action).toBe('PRODUCTION_ROLLBACK')
    expect(rollbackReport.status).toBe('ROLLED_BACK')
    expect(rollbackReport.signOff.verdict).toBe('ROLLBACK_COMPLETED')
    expect(rollbackReport.reverseSyncDigest).toBeDefined()

    for (const stage of ROLLBACK_STAGES) {
      expect(rollbackReport.stages[stage]).toBeDefined()
      expect(rollbackReport.stages[stage].status).toBe('PASSED')
    }
  })

  it('writes structured cutover audit report to custom report path when requested', async () => {
    const customPath = path.resolve(__dirname, '../../test_cutover_audit.json')
    try {
      const auditReport = await executeCutover({
        dryRun: true,
        domain: 'floework.internal',
        mockSmokeVerification: true,
        writeReport: true,
        reportPath: customPath
      })

      expect(fs.existsSync(customPath)).toBe(true)
      const saved = JSON.parse(fs.readFileSync(customPath, 'utf-8'))
      expect(saved.action).toBe('PRODUCTION_CUTOVER')
      expect(saved.signOff.verdict).toBe('GO_LIVE_CERTIFIED')
    } finally {
      if (fs.existsSync(customPath)) {
        fs.unlinkSync(customPath)
      }
    }
  })
})

describe('Phase 17: Route 53 DNS & ACM Infrastructure Module (terraform/modules/dns)', () => {
  const dnsMainPath = path.resolve(__dirname, '../../terraform/modules/dns/main.tf')
  const dnsOutputsPath = path.resolve(__dirname, '../../terraform/modules/dns/outputs.tf')
  const stagingOutputsPath = path.resolve(__dirname, '../../terraform/environments/staging/outputs.tf')

  it('declares Route 53 hosted zone and managed ACM wildcard SSL certificate', () => {
    const mainTf = fs.readFileSync(dnsMainPath, 'utf-8')

    expect(mainTf).toContain('resource "aws_route53_zone" "main"')
    expect(mainTf).toContain('resource "aws_acm_certificate" "cert"')
    expect(mainTf).toContain('validation_method         = "DNS"')
    expect(mainTf).toContain('subject_alternative_names = ["*.${var.domain_name}"]')
  })

  it('configures automated ACM certificate DNS validation records', () => {
    const mainTf = fs.readFileSync(dnsMainPath, 'utf-8')

    expect(mainTf).toContain('resource "aws_route53_record" "cert_validation"')
    expect(mainTf).toContain('for_each = var.enable_custom_domain ?')
    expect(mainTf).toContain('resource "aws_acm_certificate_validation" "cert"')
    expect(mainTf).toContain('validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]')
  })

  it('configures Route 53 alias records to ALB and CloudFront with canonical hosted zone ID', () => {
    const mainTf = fs.readFileSync(dnsMainPath, 'utf-8')

    expect(mainTf).toContain('resource "aws_route53_record" "api"')
    expect(mainTf).toContain('name    = "api.${var.domain_name}"')
    expect(mainTf).toContain('evaluate_target_health = true')

    expect(mainTf).toContain('resource "aws_route53_record" "web"')
    expect(mainTf).toContain('zone_id                = "Z2FDTNDATAQYW2"') // Canonical CloudFront hosted zone
  })

  it('exports complete DNS and ACM outputs in both module and staging environment', () => {
    const modOutputs = fs.readFileSync(dnsOutputsPath, 'utf-8')
    const stagingOutputs = fs.readFileSync(stagingOutputsPath, 'utf-8')

    // Module outputs
    expect(modOutputs).toContain('output "hosted_zone_id"')
    expect(modOutputs).toContain('output "name_servers"')
    expect(modOutputs).toContain('output "certificate_arn"')
    expect(modOutputs).toContain('output "api_dns_record"')
    expect(modOutputs).toContain('output "web_dns_record"')

    // Staging composition exports
    expect(stagingOutputs).toContain('output "dns_hosted_zone_id"')
    expect(stagingOutputs).toContain('output "dns_api_record"')
    expect(stagingOutputs).toContain('output "dns_web_record"')
    expect(stagingOutputs).toContain('output "dns_certificate_arn"')
    expect(stagingOutputs).toContain('output "dns_name_servers"')
  })
})

describe('Phase 17: Production Cutover Runbook & CI/CD Workflow Invariants', () => {
  const runbookPath = path.resolve(__dirname, '../../docs/PRODUCTION_CUTOVER_RUNBOOK.md')
  const workflowPath = path.resolve(__dirname, '../../.github/workflows/production-cutover.yml')

  it('contains comprehensive pre-flight, T-0 sequence, and 48-hour rollback runbooks', () => {
    expect(fs.existsSync(runbookPath)).toBe(true)
    const runbook = fs.readFileSync(runbookPath, 'utf-8')

    expect(runbook).toContain('Pre-Flight Checklist')
    expect(runbook).toContain('T-0 Cutover Sequence (15-Minute Maintenance Window)')
    expect(runbook).toContain('Go / No-Go Decision Gate Matrix')
    expect(runbook).toContain('Automated 48-Hour Rollback Runbook')
    expect(runbook).toContain('Reverse Delta Synchronization')
    expect(runbook).toContain('CloudWatch alarms configured in `terraform/modules/observability`')
  })

  it('configures GitHub Actions production-cutover workflow with keyless AWS OIDC', () => {
    expect(fs.existsSync(workflowPath)).toBe(true)
    const workflow = fs.readFileSync(workflowPath, 'utf-8')

    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('id-token: write')
    expect(workflow).toContain('aws-actions/configure-aws-credentials@v4')
    expect(workflow).toContain('actions/upload-artifact@v4')
    expect(workflow).toContain('node scripts/production_cutover.mjs')
  })
})
