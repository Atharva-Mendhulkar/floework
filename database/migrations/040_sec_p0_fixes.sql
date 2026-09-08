-- database/migrations/040_sec_p0_fixes.sql
-- Phase 1: P0 Security & Correctness Hardening
-- Fixes:
-- 1. SEC-04: Enforce strict tenant isolation on concurrency_conflicts and observability views
-- 2. SEC-08: Enforce project membership verification on toggle_task_star RPC

-- ============================================================================
-- 1. SEC-04: CONCURRENCY CONFLICTS TENANT ISOLATION
-- ============================================================================

-- Add team_id to concurrency_conflicts for direct tenant-scoping
ALTER TABLE public.concurrency_conflicts 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_concurrency_conflicts_team_id 
ON public.concurrency_conflicts(team_id);

-- Backfill existing task conflicts with team_id where available
UPDATE public.concurrency_conflicts cc
SET team_id = p.team_id
FROM public.tasks t
JOIN public.projects p ON p.id = t.project_id
WHERE cc.entity_type = 'task' 
  AND cc.entity_id = t.id 
  AND cc.team_id IS NULL;

-- Drop insecure cross-tenant policy (which allowed any admin across any tenant to view all records)
DROP POLICY IF EXISTS "Admins can view conflicts" ON public.concurrency_conflicts;
DROP POLICY IF EXISTS "Admins can view team conflicts" ON public.concurrency_conflicts;
DROP POLICY IF EXISTS "Users can view own conflicts" ON public.concurrency_conflicts;
DROP POLICY IF EXISTS "Allow authenticated insert of conflicts" ON public.concurrency_conflicts;

-- Create tenant-scoped SELECT policy for team admins
CREATE POLICY "Admins can view team conflicts" ON public.concurrency_conflicts
  FOR SELECT USING (
    -- Case A: Direct team_id match for admins of the owning team
    (team_id IS NOT NULL AND team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    ))
    OR
    -- Case B: Entity is a task, verify admin membership in task's team
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE t.id = concurrency_conflicts.entity_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    ))
  );

-- Allow users to view conflicts they personally generated
CREATE POLICY "Users can view own conflicts" ON public.concurrency_conflicts
  FOR SELECT USING (user_id = auth.uid());

-- Allow authenticated users to insert conflict records
CREATE POLICY "Allow authenticated insert of conflicts" ON public.concurrency_conflicts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Recreate observability views with security_invoker = true so RLS is enforced per caller
CREATE OR REPLACE VIEW public.conflict_stats WITH (security_invoker = true) AS
SELECT 
  entity_type,
  entity_id,
  COUNT(*) as total_conflicts,
  MAX(created_at) as last_conflict_at,
  AVG(server_version - client_version) as avg_staleness_gap
FROM public.concurrency_conflicts
GROUP BY entity_type, entity_id;

CREATE OR REPLACE VIEW public.conflict_hotspots WITH (security_invoker = true) AS
SELECT 
  user_id,
  COUNT(*) as conflict_count,
  COUNT(DISTINCT entity_id) as affected_entities
FROM public.concurrency_conflicts
GROUP BY user_id
ORDER BY conflict_count DESC;

GRANT SELECT ON public.conflict_stats TO authenticated;
GRANT SELECT ON public.conflict_hotspots TO authenticated;

-- ============================================================================
-- 2. SEC-08: PROJECT MEMBERSHIP VERIFICATION ON STARRED TASKS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_task_star(p_task_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
  v_is_starred boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SEC-08: Verify that user belongs to the project owning this task
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE t.id = p_task_id AND tm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: User is not a member of the project owning this task';
  END IF;

  -- Check if already starred by this user
  IF EXISTS (
    SELECT 1 FROM public.starred_tasks 
    WHERE user_id = v_user_id AND task_id = p_task_id
  ) THEN
    -- If already starred, unstar
    DELETE FROM public.starred_tasks 
    WHERE user_id = v_user_id AND task_id = p_task_id;
    v_is_starred := false;
  ELSE
    -- If not starred, insert new star
    INSERT INTO public.starred_tasks (user_id, task_id) 
    VALUES (v_user_id, p_task_id);
    v_is_starred := true;
  END IF;

  RETURN v_is_starred;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.toggle_task_star(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.toggle_task_star(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_task_star(uuid) TO authenticated;
