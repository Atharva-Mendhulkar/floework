import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppDispatch } from '../store/hooks';
import { api } from '../store/api';
import { ConnectionManager } from '../services/ConnectionManager';

/**
 * useTaskRealtime hook
 * Synchronizes task state across clients using Supabase Realtime with Backpressure batching.
 * Automatically invalidates RTK Query tags when changes are detected.
 */
export function useTaskRealtime(projectId?: string) {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const managerRef = useRef<ConnectionManager | null>(null);
  const lastSeenVersionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!projectId) return;

    // 3.0 Lifecycle Control: Reset dedupe map on project change
    lastSeenVersionsRef.current = {};

    // Prevent leaks by cleaning up existing manager before creating new one
    if (managerRef.current) {
      managerRef.current.disconnect();
    }

    const onBatchReceived = (messages: any[]) => {
      // Flow Control: Process batched events accumulated under heavy load
      let hasValidUpdates = false;

      messages.forEach((payload) => {
        const incoming = payload.new as any;
        if (!incoming || !incoming.id) return;

        // Lightweight Realtime Dedupe
        if (incoming.version <= (lastSeenVersionsRef.current[incoming.id] || 0)) {
          return;
        }
        lastSeenVersionsRef.current[incoming.id] = incoming.version;
        hasValidUpdates = true;

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
                
                // Equal-Version Reconciliation (Server-Authoritative Replace)
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
      });

      if (hasValidUpdates) {
        // We can do bulk operations here if needed
      }
    };

    const manager = new ConnectionManager(
      supabase,
      `public:tasks:project:${projectId}`,
      onBatchReceived
    );
    
    manager.connect();
    managerRef.current = manager;

    // We can't directly get SUBSCRIBED events from ConnectionManager yet, 
    // but we can assume connected for now or extend ConnectionManager.
    setStatus('connected');
    dispatch(api.util.invalidateTags(['Task']));

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
  }, [projectId, dispatch]);

  return { status };
}
