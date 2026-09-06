// api/_lib/realtime.ts
// ==============================================================================
// Amazon WebSocket & Redis PubSub Realtime Engine
// Manages real-time presence pulses, deep work focus broadcasts, and task mutations.
// Supports multi-container cross-instance fan-out using Redis PubSub.
// ==============================================================================

import { redis } from './redis'

export interface PresencePayload {
  userId: string
  status: 'in_focus' | 'available'
  taskId?: string
  updatedAt?: string
}

export interface TaskMutationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  projectId: string
  task: Record<string, any>
  version?: number
  timestamp?: string
}

export interface ActiveConnection {
  connectionId: string
  userId: string
  workspaceId: string
  connectedAt: number
}

// In-memory active connections lookup for the local container instance
const activeConnections = new Map<string, ActiveConnection>()
const workspaceIndex = new Map<string, Set<string>>()

/**
 * Registers an active WebSocket connection
 */
export async function registerConnection(
  connectionId: string,
  userId: string,
  workspaceId: string
): Promise<ActiveConnection> {
  const connection: ActiveConnection = {
    connectionId,
    userId,
    workspaceId,
    connectedAt: Date.now()
  }

  activeConnections.set(connectionId, connection)

  if (!workspaceIndex.has(workspaceId)) {
    workspaceIndex.set(workspaceId, new Set())
  }
  workspaceIndex.get(workspaceId)!.add(connectionId)

  // Persist to Redis connection set for cross-instance discovery
  try {
    await redis.sadd(`ws:workspace:${workspaceId}:connections`, connectionId)
    await redis.set(`ws:conn:${connectionId}`, JSON.stringify(connection))
  } catch (err) {
    console.warn('[Realtime] Redis connection registration error:', err)
  }

  return connection
}

/**
 * Deregisters a disconnected WebSocket client
 */
export async function unregisterConnection(connectionId: string): Promise<void> {
  const connection = activeConnections.get(connectionId)
  if (connection) {
    activeConnections.delete(connectionId)
    const wsSet = workspaceIndex.get(connection.workspaceId)
    if (wsSet) {
      wsSet.delete(connectionId)
      if (wsSet.size === 0) {
        workspaceIndex.delete(connection.workspaceId)
      }
    }
  }

  try {
    if (connection) {
      await redis.srem(`ws:workspace:${connection.workspaceId}:connections`, connectionId)
    }
    await redis.del(`ws:conn:${connectionId}`)
  } catch (err) {
    console.warn('[Realtime] Redis connection unregister error:', err)
  }
}

/**
 * Retrieves all active connection IDs in a given workspace
 */
export function getLocalWorkspaceConnections(workspaceId: string): string[] {
  const set = workspaceIndex.get(workspaceId)
  return set ? Array.from(set) : []
}

/**
 * Formats and broadcasts a presence state change (e.g. In Focus pulse)
 */
export async function broadcastPresence(
  workspaceId: string,
  payload: PresencePayload
): Promise<{ channel: string; event: any }> {
  const event = {
    type: 'presence',
    workspaceId,
    data: {
      ...payload,
      updatedAt: payload.updatedAt || new Date().toISOString()
    }
  }

  const channel = `presence:workspace:${workspaceId}`

  // Publish to Redis channel for multi-container fanout
  try {
    await redis.publish(channel, JSON.stringify(event))
  } catch (err) {
    // Non-blocking fallback if Redis publish is temporarily unavailable
    console.warn('[Realtime] Redis publish error for presence:', err)
  }

  return { channel, event }
}

/**
 * Formats and broadcasts a task mutation event (e.g. Kanban move, OCC version bump)
 */
export async function broadcastTaskMutation(
  projectId: string,
  payload: TaskMutationPayload
): Promise<{ channel: string; event: any }> {
  const event = {
    type: 'task_mutation',
    projectId,
    data: {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    }
  }

  const channel = `tasks:project:${projectId}`

  try {
    await redis.publish(channel, JSON.stringify(event))
  } catch (err) {
    console.warn('[Realtime] Redis publish error for task mutation:', err)
  }

  return { channel, event }
}
