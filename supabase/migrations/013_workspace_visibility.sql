-- ==========================================
-- WORKSPACE VISIBILITY HARDENING (013)
-- ==========================================

-- 1. Focus Sessions RLS (Team-Wide)
-- We want to see focus status for ANYONE in our team, not just ourselves.
DROP POLICY IF EXISTS "focus_sessions_isolation" ON public.focus_sessions;

CREATE POLICY "focus_sessions_workspace_visibility" ON public.focus_sessions
    FOR SELECT USING (
        user_id IN (
            SELECT tm2.user_id 
            FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
            WHERE tm1.user_id = auth.uid()
        )
    );

-- Allow users to manage their own sessions (Insert/Update)
CREATE POLICY "focus_sessions_self_manage" ON public.focus_sessions
    FOR ALL USING (user_id = auth.uid());

-- 2. Ensure Tasks RLS matches workspace logic (Harden 009)
DROP POLICY IF EXISTS "workspace_isolation_tasks" ON public.tasks;
CREATE POLICY "workspace_isolation_tasks_v2" ON public.tasks
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- 3. Profiles Selection (Public View for Team)
-- Ensure team members can see each other's profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_team_select" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT tm2.user_id 
            FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
            WHERE tm1.user_id = auth.uid()
        )
        OR id = auth.uid()
    );
