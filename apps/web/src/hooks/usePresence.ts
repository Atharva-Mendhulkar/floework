// apps/web/src/hooks/usePresence.ts
// ==============================================================================
// AWS Native Presence Tracking Hook
// Communicates via Amazon API Gateway WebSockets to broadcast user availability
// and focus session status with real-time peer aggregation.
// ==============================================================================

import { useEffect, useState, useRef } from 'react'
import { AwsWebSocketClient } from '../services/AwsWebSocketClient'
import { CognitoAuthService } from '../services/CognitoAuthService'

type PresenceState = Record<string, { userId: string; status: 'in_focus' | 'available'; taskId?: string }[]>

export function usePresence(teamId: string, currentUserId: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const awsClientRef = useRef<AwsWebSocketClient | null>(null)

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://realtime.floework.dev'
    const token = CognitoAuthService.getToken() || ''
    const client = new AwsWebSocketClient(wsUrl, token)

    client.connect()
    client.trackPresence(teamId, 'available')

    const unsubscribe = client.subscribe('presence', (data: any) => {
      if (data?.userId) {
        setPresenceState((prev) => ({
          ...prev,
          [data.userId]: [{ userId: data.userId, status: data.status, taskId: data.taskId }]
        }))
      }
    })

    awsClientRef.current = client

    return () => {
      unsubscribe()
      client.disconnect()
      awsClientRef.current = null
    }
  }, [teamId, currentUserId])

  const setInFocus = (taskId: string) => {
    if (awsClientRef.current) {
      awsClientRef.current.trackPresence(teamId, 'in_focus', taskId)
    }
  }

  const setAvailable = () => {
    if (awsClientRef.current) {
      awsClientRef.current.trackPresence(teamId, 'available')
    }
  }

  return { presenceState, setInFocus, setAvailable }
}
