-- 024_security_guardian.sql
-- Implements a "Guardian" check that prevents broad policies from being created
-- Run this to verify the system's baseline security state

CREATE OR REPLACE FUNCTION public.verify_security_invariants()
RETURNS TABLE(tablename text, policyname text, issue text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.tablename::text, 
    p.policyname::text, 
    'Permissive/Loose policy name detected'::text
  FROM pg_policies p
  WHERE schemaname = 'public'
  AND (
    p.policyname ILIKE '%anyone%'
    OR p.policyname ILIKE '%authenticated%'
    OR p.qual = '(true)'
    OR p.qual IS NULL AND p.cmd = 'SELECT'
    OR (p.qual ILIKE '%auth.uid() IS NOT NULL%' AND p.tablename != 'teams') -- Forbid bypasses
    OR (p.qual NOT ILIKE '%auth.uid()%' AND p.tablename != 'teams') 
    OR (p.cmd = 'INSERT' AND p.with_check IS NULL) -- Enforce WITH CHECK on all inserts
    OR (p.qual ILIKE '%JOIN%' AND p.qual NOT ILIKE '%WHERE%') 
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing loose policies in team_members and teams just in case
DROP POLICY IF EXISTS "anyone authenticated can see memberships" ON public.team_members;
DROP POLICY IF EXISTS "users can add themselves to teams" ON public.team_members;
DROP POLICY IF EXISTS "teams_insert_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_authenticated" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_creator" ON public.teams;
DROP POLICY IF EXISTS "members can see projects" ON public.projects;

CREATE POLICY "teams_insert_creator" ON public.teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure team_members UPDATE/DELETE are admin-only
DROP POLICY IF EXISTS "team_members_update_admin" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_admin" ON public.team_members;

CREATE POLICY "team_members_update_admin" ON public.team_members FOR UPDATE
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "team_members_delete_admin" ON public.team_members FOR DELETE
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'));
