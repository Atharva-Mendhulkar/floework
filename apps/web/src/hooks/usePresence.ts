import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { AwsWebSocketClient } from '../services/AwsWebSocketClient'

type PresenceState = Record<string, { userId: string; status: 'in_focus' | 'available'; taskId?: string }[]>

export function usePresence(teamId: string, currentUserId: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const [channel, setChannel] = useState<any>(null)
  const awsClientRef = useRef<AwsWebSocketClient | null>(null)

  const isAwsEnabled = import.meta.env.VITE_ENABLE_AWS_WEBSOCKET === 'true' && !!import.meta.env.VITE_WS_URL

  useEffect(() => {
    // Mode A: AWS WebSocket Realtime
    if (isAwsEnabled) {
      const wsUrl = import.meta.env.VITE_WS_URL as string
      const token = localStorage.getItem('auth_token') || ''
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
    }

    // Mode B: Supabase Realtime Fallback
    const newChannel = supabase.channel(`presence:team:${teamId}`, {
      config: { presence: { key: currentUserId } }
    })

    newChannel
      .on('presence', { event: 'sync' }, () => {
        setPresenceState(newChannel.presenceState<{ status: 'in_focus' | 'available'; taskId?: string }>())
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({ userId: currentUserId, status: 'available' })
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [teamId, currentUserId, isAwsEnabled])

  // Call this when a focus session starts
  const setInFocus = (taskId: string) => {
    if (isAwsEnabled && awsClientRef.current) {
      awsClientRef.current.trackPresence(teamId, 'in_focus', taskId)
    } else if (channel) {
      channel.track({ userId: currentUserId, status: 'in_focus', taskId })
    }
  }

  const setAvailable = () => {
    if (isAwsEnabled && awsClientRef.current) {
      awsClientRef.current.trackPresence(teamId, 'available')
    } else if (channel) {
      channel.track({ userId: currentUserId, status: 'available' })
    }
  }

  return { presenceState, setInFocus, setAvailable }
}
