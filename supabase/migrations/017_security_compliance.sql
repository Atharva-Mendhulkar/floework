-- ==========================================
-- SECURITY COMPLIANCE ENFORCEMENT (017)
-- ==========================================

-- 1. Resolve function_search_path_mutable warnings
ALTER FUNCTION public.is_team_admin(uuid) SET search_path = public;
ALTER FUNCTION public.log_workspace_activity() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Resolve rls_policy_always_true warning for public.projects
DROP POLICY IF EXISTS "team members can create projects" ON public.projects;
CREATE POLICY "team members can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE public.team_members.team_id = public.projects.team_id
      AND public.team_members.user_id = auth.uid()
    )
  );

-- 3. Resolve rls_enabled_no_policy warning for public.focus_stability_slots
DROP POLICY IF EXISTS "own stability" ON public.focus_stability_slots;
CREATE POLICY "own stability" ON public.focus_stability_slots
  FOR ALL USING (user_id = auth.uid());
