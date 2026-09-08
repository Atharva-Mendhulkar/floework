// api/_lib/dag.ts
// ==============================================================================
// Directed Acyclic Graph (DAG) Execution Intelligence Engine
// Backs Floework's Execution Intelligence Graph (@xyflow/react).
// Enforces strict graph acyclicity, blocker cascade tracking, and critical path analysis.
// ==============================================================================

export interface DependencyEdge {
  source: string // Prerequisite / Blocking task ID
  target: string // Dependent / Blocked task ID
  type?: 'BLOCKS' | 'RELATES_TO'
}

export interface CycleCheckResult {
  hasCycle: boolean
  cyclePath?: string[]
  error?: string
}

export interface CriticalPathTask {
  id: string
  durationMinutes: number
}

export interface CriticalPathResult {
  criticalPath: string[]
  totalDurationMinutes: number
  longestSlack: number
}

/**
 * Validates if adding a proposed dependency edge introduces a circular dependency
 */
export function detectCycle(
  existingEdges: DependencyEdge[],
  newEdge: DependencyEdge
): CycleCheckResult {
  // 1. Direct Self-Loop Prevention
  if (newEdge.source === newEdge.target) {
    return {
      hasCycle: true,
      cyclePath: [newEdge.source, newEdge.target],
      error: `Self-referential dependency: Task ${newEdge.source} cannot depend on itself`
    }
  }

  // 2. Build Adjacency Graph including the proposed edge
  const adj = new Map<string, string[]>()
  const allNodes = new Set<string>()

  const addEdge = (src: string, tgt: string) => {
    allNodes.add(src)
    allNodes.add(tgt)
    if (!adj.has(src)) adj.set(src, [])
    adj.get(src)!.push(tgt)
  }

  for (const edge of existingEdges) {
    // Only blocking relationships create execution dependencies
    if (!edge.type || edge.type === 'BLOCKS') {
      addEdge(edge.source, edge.target)
    }
  }

  // Add the candidate edge
  addEdge(newEdge.source, newEdge.target)

  // 3. Three-Color DFS Cycle Detection (0: White/Unvisited, 1: Gray/Visiting, 2: Black/Visited)
  const state = new Map<string, number>()
  const parent = new Map<string, string>()
  let detectedCycle: string[] | null = null

  function dfs(node: string, currentPath: string[]): boolean {
    state.set(node, 1) // Mark as VISITING
    currentPath.push(node)

    const neighbors = adj.get(node) || []
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor) || 0

      if (neighborState === 1) {
        // Found back-edge to a node currently in the recursion stack -> CYCLE!
        const cycleStartIndex = currentPath.indexOf(neighbor)
        detectedCycle = currentPath.slice(cycleStartIndex).concat(neighbor)
        return true
      }

      if (neighborState === 0) {
        parent.set(neighbor, node)
        if (dfs(neighbor, currentPath)) {
          return true
        }
      }
    }

    currentPath.pop()
    state.set(node, 2) // Mark as VISITED
    return false
  }

  // Check starting from the source of the new edge first (most likely path)
  if (dfs(newEdge.source, [])) {
    const cycle = (detectedCycle as string[] | null) || [newEdge.source, newEdge.target]
    return {
      hasCycle: true,
      cyclePath: cycle,
      error: `Circular dependency detected: ${cycle.join(' -> ')}`
    }
  }

  // Check any remaining unvisited nodes
  for (const node of allNodes) {
    if ((state.get(node) || 0) === 0) {
      if (dfs(node, [])) {
        const cycle = (detectedCycle as string[] | null) || []
        return {
          hasCycle: true,
          cyclePath: cycle,
          error: `Circular dependency detected: ${cycle.join(' -> ')}`
        }
      }
    }
  }

  return { hasCycle: false }
}

/**
 * Calculates all tasks transitively blocked by an upstream task (Blocker Cascade)
 */
export function calculateBlockerCascade(
  rootTaskId: string,
  edges: DependencyEdge[]
): string[] {
  const adj = new Map<string, string[]>()
  for (const edge of edges) {
    if (!edge.type || edge.type === 'BLOCKS') {
      if (!adj.has(edge.source)) adj.set(edge.source, [])
      adj.get(edge.source)!.push(edge.target)
    }
  }

  const visited = new Set<string>()
  const queue: string[] = [rootTaskId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = adj.get(current) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return Array.from(visited)
}

/**
 * Computes topological ordering and critical execution path duration
 */
export function calculateCriticalPath(
  tasks: CriticalPathTask[],
  edges: DependencyEdge[]
): CriticalPathResult {
  const taskMap = new Map<string, number>()
  for (const t of tasks) {
    taskMap.set(t.id, t.durationMinutes || 0)
  }

  // Build in-degree and outgoing edges
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const t of tasks) {
    inDegree.set(t.id, 0)
    adj.set(t.id, [])
  }

  for (const edge of edges) {
    if (!edge.type || edge.type === 'BLOCKS') {
      if (taskMap.has(edge.source) && taskMap.has(edge.target)) {
        adj.get(edge.source)!.push(edge.target)
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
      }
    }
  }

  // Earliest Finish Time (EFT) Dynamic Programming
  const eft = new Map<string, number>()
  const predecessor = new Map<string, string>()

  const queue: string[] = []
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id)
      eft.set(id, taskMap.get(id) || 0)
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!
    const uFinish = eft.get(u) || 0

    for (const v of adj.get(u) || []) {
      const vDuration = taskMap.get(v) || 0
      const currentVFinish = eft.get(v) || 0
      const candidateFinish = uFinish + vDuration

      if (candidateFinish > currentVFinish) {
        eft.set(v, candidateFinish)
        predecessor.set(v, u)
      }

      inDegree.set(v, inDegree.get(v)! - 1)
      if (inDegree.get(v) === 0) {
        queue.push(v)
      }
    }
  }

  // Find node with maximum EFT
  let maxNode: string | null = null
  let maxDuration = 0

  for (const [id, finish] of eft.entries()) {
    if (finish > maxDuration) {
      maxDuration = finish
      maxNode = id
    }
  }

  // Reconstruct path
  const path: string[] = []
  let curr = maxNode
  while (curr) {
    path.unshift(curr)
    curr = predecessor.get(curr) || null
  }

  return {
    criticalPath: path,
    totalDurationMinutes: maxDuration,
    longestSlack: 0
  }
}
