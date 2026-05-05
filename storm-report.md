# Floework Mutation Storm Report

This report documents findings from extreme concurrency testing (mutation storms) combined with variable network latency and out-of-order event arrival.

---

## Scenario: Status Change Drag Storm (A.1)
### Reproduction Steps
1. Rapidly move a task across multiple columns (e.g., Backlog -> Focus -> Review).
2. Simulate non-uniform network latency where the "Focus" update (Mutation 1) arrives at the server *after* the "Review" update (Mutation 2).
### Observed Behavior
- **Causality Break**: The task ends in the "Focus" column even though the user's last action was moving it to "Review".
- **UI Flicker**: The UI shows "Review" optimistically, then briefly updates to "Focus" when the delayed response/realtime event arrives.
### Expected Behavior
- The final state should strictly reflect the *last* user interaction, regardless of network ordering.
### Root Cause
- **Lack of Versioning**: The backend `PATCH /api/tasks` handler (and direct Supabase updates) performs a blind update. It does not check if the incoming change is "newer" than the current state in the DB.
- **Last-Write-Wins (LWW) Vulnerability**: In a distributed system with variable latency, LWW without timestamps leads to state regression.
### Severity
- Critical (Data corruption / Final state mismatch)
### Fix Strategy
- Implement an `updated_at` or `version` check in the database (optimistic concurrency control).
- Ensure the frontend sends a timestamp with every mutation and the backend rejects "stale" updates.


---

## Scenario: Star Toggle Flood (B.1)
### Reproduction Steps
1. Rapidly click the star toggle on a task (e.g., 6 times).
2. Simulate a delayed response for the 5th click that arrives at the server *after* the 6th click.
### Observed Behavior
- **State Divergence**: The task remains "Starred" (6th click was `false`, 5th click was `true` but arrived last).
- The user expects the task to be unstarred after an even number of clicks.
### Expected Behavior
- The final state should be consistent with the *sequence* of user clicks.
### Root Cause
- **Non-Atomic Toggles**: The frontend sends the *new absolute state* (e.g., `isStarred: true`) instead of an atomic toggle operation or a sequence number.
- **Race Condition**: Out-of-order delivery results in a stale "true" overwriting a fresh "false".
### Severity
- High (State divergence / Unexpected behavior)
### Fix Strategy
- Use sequence numbers (increments) or a "checked update" where the mutation includes the `updated_at` timestamp it's based on.
- Or, use a database RPC for atomic toggling (e.g., `update tasks set is_starred = NOT is_starred where id = ...`).


---

## Scenario: Stale Undo Overwrites Fresh Realtime (D.1)
### Reproduction Steps
1. Tab A: Move task from "Backlog" to "Focus" (Mutation 1).
2. Inject a 2s delay and a 100% failure rate for Mutation 1.
3. Simultaneously, Tab B: Move same task to "Review" (Mutation 2). Mutation 2 succeeds immediately.
4. Tab A receives the Realtime event for Mutation 2 and re-fetches (UI is now "Review").
5. Mutation 1 finally fails on Tab A.
### Observed Behavior
- **State Regression**: Tab A reverts the task to "Backlog" (the original state before Mutation 1) when the patchResult.undo() is triggered.
- The "Review" state from the successful Mutation 2 is lost on Tab A, even though it's the current truth in the DB.
### Expected Behavior
- The undo logic should be aware of whether the state has been updated by a *newer* event (realtime or otherwise) before reverting.
### Root Cause
- **Naive Rollback**: RTK Query's patchResult.undo() simply reverts the cache to the exact state it was in before the mutation started. It has no knowledge of interleaved updates that occurred while the mutation was pending.
### Severity
- High (State regression / Divergence)
### Fix Strategy
- Implement "Conditional Rollback": Before calling undo(), check if the current cache value still matches the "optimistic" value. If it was changed by another event, skip the undo or perform a partial reconciliation.
- Or, rely on invalidateTags to always pull the latest state after a failure, rather than manual undo.
