# Floework Failure Simulation Report

This report documents findings from adversarial testing under simulated adverse conditions (network instability, concurrent updates, partial failures).

---

## Scenario: Task Status Update Conflict (A.1)
### Reproduction Steps
1. Open Board.
2. Observe `updateTask` optimistic update implementation in `apps/web/src/store/api.ts`.
3. Compare `updateQueryData` arguments with `getTasks` query arguments used in `FlowBoard.tsx`.
### Observed Behavior
- Optimistic updates fail silently. The UI waits for the network response before moving the task card.
- In multi-tab scenarios, the cards don't "flicker"—they just don't move until the re-fetch completes.
### Expected Behavior
- Task card should move immediately upon drop.
### Root Cause
- **Cache Key Mismatch**: `updateTask` attempts to patch the `getTasks` cache with `undefined` as the query argument. However, `FlowBoard.tsx` subscribes to `getTasks` with `{ projectId, sprintId }`. RTK Query treats these as different cache entries.
### Severity
- High (UX inconsistency / Broken Optimistic Updates)
### Suggested Fix
- Use `api.util.updateQueryData` with `activeProjectId` and `activeSprintId` if available, or iterate through all existing cache entries for `getTasks`.

---

## Scenario: Realtime Reconnect Gap (B.1)
### Reproduction Steps
1. Open Board.
2. Disconnect network (DevTools Offline).
3. Modify a task title in another tab (Tab B).
4. Reconnect network in Tab A.
### Observed Behavior
- Tab A remains stale. The title does not update until the user manually refreshes or another event happens.
### Expected Behavior
- Reconnect should trigger an automatic re-fetch/invalidation of the task list to ensure consistency.
### Root Cause
- **Missing Reconnect Handler**: `useTaskRealtime` transitions status to `connected` but does not dispatch `invalidateTags(['Task'])` upon `SUBSCRIBED` status (which happens after every reconnection).
### Severity
- Critical (Data desync / Missed events)
### Suggested Fix
- Add `dispatch(api.util.invalidateTags(['Task']))` inside the `SUBSCRIBED` event handler in `useTaskRealtime.ts`.

---

## Scenario: Silent Rollback on API Failure (C.1)
### Reproduction Steps
1. Open Board.
2. Inject 100% failure rate for `updateTask` (simulated).
3. Drag a task to a new column.
### Observed Behavior
- The card moves to the new column (optimistic update).
- A second later, it jumps back to the original column without any explanation.
- No error message or toast appears.
### Expected Behavior
- UI should show a toast notification explaining that the update failed and the state was reverted.
### Root Cause
- **Unchecked Mutation**: `PhaseColumn.tsx` calls `updateTask()` but does not `.unwrap()` the result or handle the error in a `try/catch` block.
### Severity
- Medium (UX frustration / Silent failure)
### Suggested Fix
- Wrap `updateTask` call in `try/catch` and use `toast.error()` to provide feedback.

---

## Scenario: Navigation Channel Leak (G.1)
### Reproduction Steps
1. Switch between different projects in the Sidebar 20+ times.
2. Observe active Supabase Realtime channels.
### Observed Behavior
- Each switch creates a new channel but the old one might not be fully removed if the effect cleanup is delayed or if there are race conditions in the hook.
### Expected Behavior
- Only one active task channel per project should exist.
### Root Cause
- **Potential Hook Desync**: If `projectId` changes rapidly, multiple `useEffect` instances might overlap if not handled carefully with `supabase.removeChannel`.
### Severity
- Low (Resource leak)
### Suggested Fix
- Ensure `useTaskRealtime` uses a ref to track the active channel and removes it explicitly before creating a new one, or rely on the cleanup function returning a Promise to ensure sequentiality.
