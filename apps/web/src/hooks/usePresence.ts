import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type PresenceState = Record<string, { userId: string; status: 'in_focus' | 'available'; taskId?: string }[]>

export function usePresence(teamId: string, currentUserId: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const [channel, setChannel] = useState<any>(null)

  useEffect(() => {
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

    return () => { supabase.removeChannel(newChannel) }
  }, [teamId, currentUserId])

  // Call this when a focus session starts
  const setInFocus = (taskId: string) => {
    if (channel) channel.track({ userId: currentUserId, status: 'in_focus', taskId })
  }

  const setAvailable = () => {
    if (channel) channel.track({ userId: currentUserId, status: 'available' })
  }

  return { presenceState, setInFocus, setAvailable }
}
