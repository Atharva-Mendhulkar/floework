import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Redis to prevent external network calls during unit tests
vi.mock('../../api/_lib/redis', () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
  },
}))

import {
  registerConnection,
  unregisterConnection,
  getLocalWorkspaceConnections,
  broadcastPresence,
  broadcastTaskMutation
} from '../../api/_lib/realtime'

describe('Phase 6: Realtime Communication & Redis PubSub Engine', () => {
  beforeEach(async () => {
    // Reset connection state
    await unregisterConnection('conn-test-1')
    await unregisterConnection('conn-test-2')
  })

  describe('1. Active Connection Registry', () => {
    it('registers client connection and indexes by workspace ID', async () => {
      const conn = await registerConnection('conn-test-1', 'usr-alice', 'ws-alpha')
      expect(conn.connectionId).toBe('conn-test-1')
      expect(conn.userId).toBe('usr-alice')
      expect(conn.workspaceId).toBe('ws-alpha')
      expect(conn.connectedAt).toBeDefined()

      const wsConnections = getLocalWorkspaceConnections('ws-alpha')
      expect(wsConnections).toContain('conn-test-1')
    })

    it('indexes multiple connections belonging to the same workspace', async () => {
      await registerConnection('conn-test-1', 'usr-alice', 'ws-alpha')
      await registerConnection('conn-test-2', 'usr-bob', 'ws-alpha')

      const wsConnections = getLocalWorkspaceConnections('ws-alpha')
      expect(wsConnections).toHaveLength(2)
      expect(wsConnections).toContain('conn-test-1')
      expect(wsConnections).toContain('conn-test-2')
    })

    it('deregisters disconnected client and purges empty workspace indices', async () => {
      await registerConnection('conn-test-1', 'usr-alice', 'ws-beta')
      expect(getLocalWorkspaceConnections('ws-beta')).toContain('conn-test-1')

      await unregisterConnection('conn-test-1')
      expect(getLocalWorkspaceConnections('ws-beta')).not.toContain('conn-test-1')
      expect(getLocalWorkspaceConnections('ws-beta')).toHaveLength(0)
    })
  })

  describe('2. Presence Pulse & Deep Work Broadcasts', () => {
    it('broadcasts In Focus presence pulse to dedicated workspace PubSub channel', async () => {
      const workspaceId = 'ws-eng-team-1'
      const { channel, event } = await broadcastPresence(workspaceId, {
        userId: 'usr-charlie',
        status: 'in_focus',
        taskId: 'task-auth-hardening-101'
      })

      expect(channel).toBe(`presence:workspace:${workspaceId}`)
      expect(event.type).toBe('presence')
      expect(event.workspaceId).toBe(workspaceId)
      expect(event.data.status).toBe('in_focus')
      expect(event.data.userId).toBe('usr-charlie')
      expect(event.data.taskId).toBe('task-auth-hardening-101')
      expect(event.data.updatedAt).toBeDefined()
    })

    it('broadcasts Available status when focus session completes', async () => {
      const workspaceId = 'ws-eng-team-1'
      const { channel, event } = await broadcastPresence(workspaceId, {
        userId: 'usr-charlie',
        status: 'available'
      })

      expect(channel).toBe(`presence:workspace:${workspaceId}`)
      expect(event.data.status).toBe('available')
      expect(event.data.taskId).toBeUndefined()
    })
  })

  describe('3. Task Mutation Realtime Broadcasts', () => {
    it('formats and publishes live task mutations to project channel', async () => {
      const projectId = 'proj-floework-core'
      const taskData = {
        id: 'task-card-55',
        title: 'Deploy API Gateway WebSocket',
        status: 'in_progress',
        version: 4
      }

      const { channel, event } = await broadcastTaskMutation(projectId, {
        eventType: 'UPDATE',
        projectId,
        task: taskData,
        version: 4
      })

      expect(channel).toBe(`tasks:project:${projectId}`)
      expect(event.type).toBe('task_mutation')
      expect(event.projectId).toBe(projectId)
      expect(event.data.eventType).toBe('UPDATE')
      expect(event.data.task.id).toBe('task-card-55')
      expect(event.data.version).toBe(4)
      expect(event.data.timestamp).toBeDefined()
    })
  })
})
