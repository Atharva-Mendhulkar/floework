-- ==========================================
-- WORKSPACE VISIBILITY & SCHEMA HARDENING (013)
-- ==========================================

-- 1. Fix Foreign Key (Resolves the 400 error)
-- PostgREST cannot join focus_sessions to profiles unless the FK points to public.profiles.
-- In migration 012, it was incorrectly pointed to auth.users.
ALTER TABLE public.focus_sessions 
    DROP CONSTRAINT IF EXISTS focus_sessions_user_id_fkey;

ALTER TABLE public.focus_sessions 
    ADD CONSTRAINT focus_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Peer-to-Peer Visibility Policy
-- Allow ANYONE in a workspace to see the focus status of ANYONE ELSE in the same workspace.
DROP POLICY IF EXISTS "focus_sessions_workspace_visibility" ON public.focus_sessions;
DROP POLICY IF EXISTS "focus_sessions_isolation" ON public.focus_sessions;

CREATE POLICY "focus_sessions_peer_visibility" ON public.focus_sessions
    FOR SELECT USING (
        user_id IN (
            SELECT tm2.user_id 
            FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
            WHERE tm1.user_id = auth.uid()
        )
    );

-- Allow users to start/stop their OWN sessions
DROP POLICY IF EXISTS "focus_sessions_self_manage" ON public.focus_sessions;
CREATE POLICY "focus_sessions_self_manage" ON public.focus_sessions
    FOR ALL USING (user_id = auth.uid());

-- 3. Profiles Peer Visibility
-- Ensure team members can see each other's full names and avatars.
DROP POLICY IF EXISTS "profiles_team_select" ON public.profiles;
CREATE POLICY "profiles_peer_visibility" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT tm2.user_id 
            FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
            WHERE tm1.user_id = auth.uid()
        )
        OR id = auth.uid()
    );

-- 4. Tasks Workspace Visibility
-- Ensure tasks are visible to all team members (not just assignee)
DROP POLICY IF EXISTS "workspace_isolation_tasks_v2" ON public.tasks;
CREATE POLICY "tasks_workspace_visibility" ON public.tasks
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );
