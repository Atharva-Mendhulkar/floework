// apps/web/src/hooks/useTaskRealtime.ts
// ==============================================================================
// AWS Native Realtime Task Synchronization Hook
// Connects to Amazon API Gateway WebSockets + Redis PubSub with 500ms backpressure
// batching, optimistic deduplication, and automated RTK Query cache synchronization.
// ==============================================================================

import { useEffect, useState, useRef } from 'react'
import { useAppDispatch } from '../store/hooks'
import { api } from '../store/api'
import { AwsWebSocketClient } from '../services/AwsWebSocketClient'
import { CognitoAuthService } from '../services/CognitoAuthService'

export function useTaskRealtime(projectId?: string) {
  const dispatch = useAppDispatch()
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')
  const clientRef = useRef<AwsWebSocketClient | null>(null)
  const lastSeenVersionsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!projectId) return

    lastSeenVersionsRef.current = {}

    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://realtime.floework.dev'
    const token = CognitoAuthService.getToken() || ''

    const onBatchReceived = (messages: any[]) => {
      messages.forEach((payload) => {
        const incoming = payload.data || payload.new
        if (!incoming || !incoming.id) return

        if (incoming.version <= (lastSeenVersionsRef.current[incoming.id] || 0)) {
          return
        }
        lastSeenVersionsRef.current[incoming.id] = incoming.version

        const state = dispatch((_, getState) => getState()) as any
        const patches = api.util.selectInvalidatedBy(state, [{ type: 'Task' as const }])

        patches.forEach((p: any) => {
          if (p.endpointName !== 'getTasks') return
          dispatch(
            api.util.updateQueryData('getTasks', p.originalArgs as any, (draft) => {
              const task = draft.data.find((t: any) => t.id === incoming.id)
              if (task) {
                if (incoming.version < (task.version || 0)) return
                Object.assign(task, {
                  title: incoming.title,
                  description: incoming.description,
                  status: incoming.status,
                  version: incoming.version,
                  updatedAt: incoming.updated_at
                })
              }
            })
          )
        })
      })
    }

    const client = new AwsWebSocketClient(wsUrl, token, onBatchReceived)
    client.connect()
    clientRef.current = client

    setStatus('connected')
    dispatch(api.util.invalidateTags(['Task']))

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
    }
  }, [projectId, dispatch])

  return { status }
}
