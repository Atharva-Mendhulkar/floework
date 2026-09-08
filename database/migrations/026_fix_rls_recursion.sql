-- database/migrations/026_fix_rls_recursion.sql

-- Fix infinite recursion in team_members policy
-- We use a security definer function to check membership without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_id = p_team_id 
    AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT
  USING (is_team_member(team_id));

-- Update other policies to use this helper for performance and safety
DROP POLICY IF EXISTS "teams_select_member" ON public.teams;
CREATE POLICY "teams_select_member" ON public.teams FOR SELECT
  USING (is_team_member(id));

DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
CREATE POLICY "projects_select_member" ON public.projects FOR SELECT
  USING (is_team_member(team_id));

DROP POLICY IF EXISTS "tasks_select_member" ON public.tasks;
CREATE POLICY "tasks_select_member" ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id 
    AND is_team_member(p.team_id)
  ));
