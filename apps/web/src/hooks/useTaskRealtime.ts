import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppDispatch } from '../store/hooks';
import { api } from '../store/api';

/**
 * useTaskRealtime hook
 * Synchronizes task state across clients using Supabase Realtime.
 * Automatically invalidates RTK Query tags when changes are detected.
 */
export function useTaskRealtime(projectId?: string) {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const channelRef = useRef<any>(null);
  const lastSeenVersionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!projectId) return;

    // 8.1 Prevent leaks by cleaning up existing channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`public:tasks:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // 7.1 Version-aware manual cache patching
          const incoming = payload.new as any;
          if (!incoming || !incoming.id) return;

          // 8.1 Lightweight Realtime Dedupe
          if (incoming.version <= (lastSeenVersionsRef.current[incoming.id] || 0)) {
            return;
          }
          lastSeenVersionsRef.current[incoming.id] = incoming.version;

          // Dispatch patching to all active queries
          const state = dispatch((_, getState) => getState()) as any;
          const patches = api.util.selectInvalidatedBy(state, [{ type: 'Task' as const }]);

          patches.forEach((p: any) => {
            if (p.endpointName !== 'getTasks') return;
            dispatch(
              api.util.updateQueryData('getTasks', p.originalArgs as any, (draft) => {
                const task = draft.data.find((t: any) => t.id === incoming.id);
                if (task) {
                  // Idempotency & Version Guard
                  if (incoming.version < (task.version || 0)) return;
                  
                  // 2.0 Equal-Version Reconciliation (Server-Authoritative Replace)
                  Object.assign(task, {
                    title: incoming.title,
                    description: incoming.description,
                    status: incoming.status,
                    version: incoming.version,
                    updatedAt: incoming.updated_at
                  });
                  delete (task as any).__isOptimistic;
                }
              })
            );
          });
        }
      )
      .on('system', {}, (ev: any) => {
        if (ev.event === 'SUBSCRIBED') {
          setStatus('connected');
          // 7.2 & 10.0: Mandatory re-fetch on connect/reconnect to bridge any gaps
          dispatch(api.util.invalidateTags(['Task']));
        }
        if (ev.event === 'CHANNEL_ERROR' || ev.event === 'TIMED_OUT') setStatus('disconnected');
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [projectId, dispatch]);

  return { status };
}
