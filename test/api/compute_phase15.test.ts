// test/api/compute_phase15.test.ts
// ==============================================================================
// Phase 15: ECS Fargate Multi-Service Orchestration & Automated CD Behavioral Suite
// Validates Dockerfile packaging, ECS worker/migration definitions, CI/CD permissions,
// and background worker processing logic.
// ==============================================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { calculateFocusStability, processMessage } from '../../workers/sqs-worker'

const ROOT_DIR = path.resolve(__dirname, '../..')

describe('Phase 15: ECS Fargate Task Definitions, SQS Worker & Continuous Deployment', () => {

  describe('1. Dockerfile Multi-Stage Packaging & Production Runtime', () => {
    const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile')
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8')

    it('contains multi-stage build separating builder and runner', () => {
      expect(dockerfileContent).toContain('FROM node:20-alpine AS builder')
      expect(dockerfileContent).toContain('FROM node:20-alpine AS runner')
    })

    it('packages workers directory into the runner stage for SQS consumer execution', () => {
      expect(dockerfileContent).toMatch(
        /COPY --from=builder --chown=floework:nodejs \/app\/workers \.\/workers/
      )
    })

    it('packages database migrations and utility scripts into the runner stage', () => {
      expect(dockerfileContent).toMatch(
        /COPY --from=builder --chown=floework:nodejs \/app\/database \.\/database/
      )
      expect(dockerfileContent).toMatch(
        /COPY --from=builder --chown=floework:nodejs \/app\/scripts \.\/scripts/
      )
    })

    it('enforces non-root application user execution (floework:nodejs)', () => {
      expect(dockerfileContent).toContain('USER floework')
      expect(dockerfileContent).toContain('adduser --system --uid 1001 floework')
    })

    it('defines native HEALTHCHECK probe aligned with ALB target group', () => {
      expect(dockerfileContent).toContain('HEALTHCHECK')
      expect(dockerfileContent).toContain('CMD curl -f http://localhost:3000/health || exit 1')
    })
  })

  describe('2. Compute Module Infrastructure (terraform/modules/compute)', () => {
    const computeMainPath = path.join(ROOT_DIR, 'terraform/modules/compute/main.tf')
    const computeVarsPath = path.join(ROOT_DIR, 'terraform/modules/compute/variables.tf')
    const computeOutputsPath = path.join(ROOT_DIR, 'terraform/modules/compute/outputs.tf')

    const computeMain = fs.readFileSync(computeMainPath, 'utf-8')
    const computeVars = fs.readFileSync(computeVarsPath, 'utf-8')
    const computeOutputs = fs.readFileSync(computeOutputsPath, 'utf-8')

    it('declares SQS FIFO queue URLs and worker sizing variables', () => {
      expect(computeVars).toContain('variable "focus_completion_queue_url"')
      expect(computeVars).toContain('variable "audit_logs_queue_url"')
      expect(computeVars).toContain('variable "notifications_queue_url"')
      expect(computeVars).toContain('variable "worker_desired_count"')
      expect(computeVars).toContain('variable "worker_cpu"')
      expect(computeVars).toContain('variable "worker_memory"')
    })

    it('injects SQS FIFO queue URLs into the API container environment', () => {
      expect(computeMain).toContain('{ name = "FOCUS_COMPLETION_QUEUE_URL", value = var.focus_completion_queue_url }')
      expect(computeMain).toContain('{ name = "AUDIT_LOGS_QUEUE_URL", value = var.audit_logs_queue_url }')
      expect(computeMain).toContain('{ name = "NOTIFICATIONS_QUEUE_URL", value = var.notifications_queue_url }')
    })

    it('orchestrates dedicated ECS Fargate background worker service', () => {
      expect(computeMain).toContain('resource "aws_cloudwatch_log_group" "worker"')
      expect(computeMain).toContain('resource "aws_ecs_task_definition" "worker"')
      expect(computeMain).toContain('resource "aws_ecs_service" "worker"')
      expect(computeMain).toContain('"workers/sqs-worker.ts"')
    })

    it('configures worker service with deployment circuit breaker and private app subnets', () => {
      expect(computeMain).toContain('deployment_circuit_breaker {')
      expect(computeMain).toContain('enable   = true')
      expect(computeMain).toContain('rollback = true')
      expect(computeMain).toContain('subnets          = var.private_app_subnet_ids')
      expect(computeMain).toContain('assign_public_ip = false')
    })

    it('defines ephemeral database schema migration task definition', () => {
      expect(computeMain).toContain('resource "aws_cloudwatch_log_group" "migration"')
      expect(computeMain).toContain('resource "aws_ecs_task_definition" "migration"')
      expect(computeMain).toContain('"scripts/run_migrations.mjs"')
    })

    it('exports worker and migration task ARNs and service identifiers', () => {
      expect(computeOutputs).toContain('output "worker_service_name"')
      expect(computeOutputs).toContain('output "worker_task_definition_arn"')
      expect(computeOutputs).toContain('output "worker_log_group_name"')
      expect(computeOutputs).toContain('output "migration_task_definition_arn"')
      expect(computeOutputs).toContain('output "migration_log_group_name"')
    })
  })

  describe('3. CI/CD Module IAM & Deployment Permissions (terraform/modules/ci_cd)', () => {
    const ciCdMainPath = path.join(ROOT_DIR, 'terraform/modules/ci_cd/main.tf')
    const ciCdVarsPath = path.join(ROOT_DIR, 'terraform/modules/ci_cd/variables.tf')

    const ciCdMain = fs.readFileSync(ciCdMainPath, 'utf-8')
    const ciCdVars = fs.readFileSync(ciCdVarsPath, 'utf-8')

    it('declares ecs_execution_role_arn and ecs_task_role_arn for PassRole scoping', () => {
      expect(ciCdVars).toContain('variable "ecs_execution_role_arn"')
      expect(ciCdVars).toContain('variable "ecs_task_role_arn"')
    })

    it('provisions ecs_deploy IAM policy attached to GitHub Actions OIDC role', () => {
      expect(ciCdMain).toContain('resource "aws_iam_role_policy" "ecs_deploy"')
      expect(ciCdMain).toContain('"ecs:UpdateService"')
      expect(ciCdMain).toContain('"ecs:RegisterTaskDefinition"')
      expect(ciCdMain).toContain('"ecs:DescribeServices"')
      expect(ciCdMain).toContain('"ecs:DescribeTaskDefinition"')
    })

    it('restricts iam:PassRole strictly to ECS task execution and runtime roles', () => {
      expect(ciCdMain).toContain('Sid    = "IAMPassRoleToECS"')
      expect(ciCdMain).toContain('var.ecs_execution_role_arn')
      expect(ciCdMain).toContain('var.ecs_task_role_arn')
    })
  })

  describe('4. Staging Environment Integration Wiring (terraform/environments/staging)', () => {
    const stagingMainPath = path.join(ROOT_DIR, 'terraform/environments/staging/main.tf')
    const stagingOutputsPath = path.join(ROOT_DIR, 'terraform/environments/staging/outputs.tf')

    const stagingMain = fs.readFileSync(stagingMainPath, 'utf-8')
    const stagingOutputs = fs.readFileSync(stagingOutputsPath, 'utf-8')

    it('wires SQS FIFO queue outputs into compute module', () => {
      expect(stagingMain).toContain('focus_completion_queue_url = module.queue.focus_completion_queue_url')
      expect(stagingMain).toContain('audit_logs_queue_url       = module.queue.audit_logs_queue_url')
      expect(stagingMain).toContain('notifications_queue_url    = module.queue.notifications_queue_url')
    })

    it('wires ECS execution and task role ARNs into ci_cd module for deployment authorization', () => {
      expect(stagingMain).toContain('ecs_execution_role_arn = module.security.ecs_execution_role_arn')
      expect(stagingMain).toContain('ecs_task_role_arn      = module.security.ecs_task_role_arn')
    })

    it('exports staging worker service name and task definition ARNs', () => {
      expect(stagingOutputs).toContain('output "ecs_worker_service_name"')
      expect(stagingOutputs).toContain('output "ecs_worker_task_definition_arn"')
      expect(stagingOutputs).toContain('output "ecs_migration_task_definition_arn"')
    })
  })

  describe('5. Background SQS Worker Behavioral Logic', () => {
    it('calculates accurate stability scores across session durations', () => {
      // Short session (< 300s) -> fragmented
      expect(calculateFocusStability(120)).toBe(0.2)
      expect(calculateFocusStability(299)).toBe(0.2)

      // Sweet spot (1500s - 3600s / 25min - 60min) -> deep work peak
      expect(calculateFocusStability(1500)).toBe(0.95)
      expect(calculateFocusStability(2400)).toBe(0.95)
      expect(calculateFocusStability(3600)).toBe(0.95)

      // Extended session (> 3600s) -> diminishing returns
      expect(calculateFocusStability(3601)).toBe(0.85)
      expect(calculateFocusStability(7200)).toBe(0.85)

      // Medium session (300s - 1499s) -> standard
      expect(calculateFocusStability(600)).toBe(0.6)
    })

    it('throws error when message body is missing or malformed', async () => {
      await expect(processMessage({ MessageId: 'test-empty' })).rejects.toThrow('empty')
      await expect(processMessage({ MessageId: 'test-json', Body: 'not-valid-json' })).rejects.toThrow('Invalid JSON')
      await expect(processMessage({ MessageId: 'test-wrong-type', Body: JSON.stringify({ type: 'UNKNOWN' }) })).rejects.toThrow('Unexpected message type')
    })
  })

  describe('6. Continuous Deployment Workflow (.github/workflows/docker-ecr.yml)', () => {
    const workflowPath = path.join(ROOT_DIR, '.github/workflows/docker-ecr.yml')
    const workflow = fs.readFileSync(workflowPath, 'utf-8')

    it('triggers on push to main including workers path', () => {
      expect(workflow).toContain("paths:\n      - 'Dockerfile'\n      - '.dockerignore'\n      - 'api/**'\n      - 'workers/**'")
    })

    it('executes automated rolling update on API and Worker ECS services', () => {
      expect(workflow).toContain('Trigger Continuous Deployment to Amazon ECS Services')
      expect(workflow).toContain('CLUSTER_NAME="floework-staging-cluster"')
      expect(workflow).toContain('API_SERVICE="floework-staging-api-service"')
      expect(workflow).toContain('WORKER_SERVICE="floework-staging-worker-service"')
      expect(workflow).toContain('aws ecs update-service \\\n            --cluster "$CLUSTER_NAME" \\\n            --service "$API_SERVICE" \\\n            --force-new-deployment')
      expect(workflow).toContain('aws ecs update-service \\\n            --cluster "$CLUSTER_NAME" \\\n            --service "$WORKER_SERVICE" \\\n            --force-new-deployment')
    })

    it('publishes deployment strategy and cluster info to GitHub Step Summary', () => {
      expect(workflow).toContain('## 🚀 Container Delivery & Continuous Deployment Report')
      expect(workflow).toContain('floework-staging-api-service')
      expect(workflow).toContain('floework-staging-worker-service')
      expect(workflow).toContain('Zero-downtime rolling update with circuit breaker rollback')
    })
  })
})
