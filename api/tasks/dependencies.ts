// api/tasks/dependencies.ts
// ==============================================================================
// Amazon RDS PostgreSQL Task Dependency & DAG Enforcement API
// Validates workspace project membership, enforces cycle-free DAG topology,
// and persists execution edges for ExecutionGraph.tsx.
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUser, requireProjectMember } from '../_lib/auth'
import { detectCycle, DependencyEdge } from '../_lib/dag'
import { query } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // 1. GET: Fetch Project Dependencies
  if (req.method === 'GET') {
    const projectId = req.query.projectId as string
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' })
    }

    if (!(await requireProjectMember(req, res, projectId))) {
      return
    }

    const dbRes = await query(
      'SELECT * FROM task_dependencies WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    )

    return res.status(200).json({ edges: dbRes.rows || [] })
  }

  // 2. POST: Add Dependency Edge with DAG Cycle Prevention
  if (req.method === 'POST') {
    const { projectId, sourceTaskId, targetTaskId, dependencyType = 'BLOCKS' } = req.body || {}

    if (!projectId || !sourceTaskId || !targetTaskId) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, sourceTaskId, targetTaskId'
      })
    }

    if (!(await requireProjectMember(req, res, projectId))) {
      return
    }

    // Direct self-loop rejection
    if (sourceTaskId === targetTaskId) {
      return res.status(400).json({
        error: 'Self-referential dependency: A task cannot block itself',
        cycle: [sourceTaskId, targetTaskId]
      })
    }

    // Fetch existing edges for cycle evaluation
    const dbEdges = await query(
      'SELECT source_task_id, target_task_id, dependency_type FROM task_dependencies WHERE project_id = $1',
      [projectId]
    )

    const formattedEdges: DependencyEdge[] = (dbEdges.rows || []).map((e: any) => ({
      source: e.source_task_id,
      target: e.target_task_id,
      type: e.dependency_type
    }))

    const newEdge: DependencyEdge = {
      source: sourceTaskId,
      target: targetTaskId,
      type: dependencyType
    }

    // Topological cycle evaluation
    const cycleCheck = detectCycle(formattedEdges, newEdge)
    if (cycleCheck.hasCycle) {
      return res.status(400).json({
        error: cycleCheck.error || 'Circular dependency detected in execution graph',
        cycle: cycleCheck.cyclePath
      })
    }

    // Insert valid edge
    const insertRes = await query(
      `INSERT INTO task_dependencies (project_id, source_task_id, target_task_id, dependency_type, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [projectId, sourceTaskId, targetTaskId, dependencyType]
    )

    return res.status(201).json({
      success: true,
      dependency: insertRes.rows?.[0]
    })
  }

  // 3. DELETE: Remove Dependency Edge
  if (req.method === 'DELETE') {
    const { id, projectId } = req.body || {}
    if (!id || !projectId) {
      return res.status(400).json({ error: 'Missing required fields: id, projectId' })
    }

    if (!(await requireProjectMember(req, res, projectId))) {
      return
    }

    const deleteRes = await query(
      'DELETE FROM task_dependencies WHERE id = $1 AND project_id = $2 RETURNING id',
      [id, projectId]
    )

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Dependency edge not found' })
    }

    return res.status(200).json({ success: true, deletedId: id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
