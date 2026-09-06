// api/tasks/dependencies.ts
// ==============================================================================
// Task Dependency API & DAG Enforcement Endpoint
// Validates project membership, runs server-side cycle detection, and persists
// graph edges backing ExecutionGraph.tsx
// ==============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getUser, requireProjectMember } from '../_lib/auth'
import { detectCycle, DependencyEdge } from '../_lib/dag'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

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

    if (!await requireProjectMember(req, res, projectId)) {
      return
    }

    const { data: edges, error } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ edges: edges || [] })
  }

  // 2. POST: Add Dependency Edge with Server-Side DAG Cycle Prevention
  if (req.method === 'POST') {
    const { projectId, sourceTaskId, targetTaskId, dependencyType = 'BLOCKS' } = req.body || {}

    if (!projectId || !sourceTaskId || !targetTaskId) {
      return res.status(400).json({ error: 'Missing required fields: projectId, sourceTaskId, targetTaskId' })
    }

    if (!await requireProjectMember(req, res, projectId)) {
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
    const { data: existingEdges, error: fetchErr } = await supabase
      .from('task_dependencies')
      .select('source_task_id, target_task_id, dependency_type')
      .eq('project_id', projectId)

    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message })
    }

    const formattedEdges: DependencyEdge[] = (existingEdges || []).map((e: any) => ({
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
    const { data: inserted, error: insertErr } = await supabase
      .from('task_dependencies')
      .insert({
        project_id: projectId,
        source_task_id: sourceTaskId,
        target_task_id: targetTaskId,
        dependency_type: dependencyType
      })
      .select()
      .single()

    if (insertErr) {
      return res.status(400).json({ error: insertErr.message })
    }

    return res.status(201).json({
      success: true,
      dependency: inserted
    })
  }

  // 3. DELETE: Remove Dependency Edge
  if (req.method === 'DELETE') {
    const { id, projectId } = req.body || {}
    if (!id || !projectId) {
      return res.status(400).json({ error: 'Missing required fields: id, projectId' })
    }

    if (!await requireProjectMember(req, res, projectId)) {
      return
    }

    const { error: deleteErr } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)

    if (deleteErr) {
      return res.status(400).json({ error: deleteErr.message })
    }

    return res.status(200).json({ success: true, deletedId: id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
