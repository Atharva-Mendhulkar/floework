-- supabase/migrations/20240001_rls_hardening.sql
-- Ensure RLS is enabled on every application table
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members     ENABLE ROW LEVEL SECURITY;

-- Cleanup loose policies from previous migrations (like 999_final_repair.sql)
DROP POLICY IF EXISTS "anyone authenticated can see profiles" ON public.profiles;
DROP POLICY IF EXISTS "anyone authenticated can see teams" ON public.teams;
DROP POLICY IF EXISTS "anyone authenticated can create teams" ON public.teams;
DROP POLICY IF EXISTS "anyone authenticated can see team_members" ON public.team_members;

-- profiles: users can only read/update their own profile
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
CREATE POLICY "profiles_select_own"  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- teams: member can see teams they belong to
DROP POLICY IF EXISTS "teams_select_member"  ON public.teams;
DROP POLICY IF EXISTS "teams_insert_authenticated" ON public.teams;
CREATE POLICY "teams_select_member" ON public.teams FOR SELECT
  USING (id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
-- Allows any authenticated user to create a workspace (SaaS model)
CREATE POLICY "teams_insert_authenticated" ON public.teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- team_members: only visible to members of the same team
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
-- Allows admins to add members, OR a user to add themselves as admin to a team with no members (initial creator)
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin')
    OR
    (user_id = auth.uid() AND role = 'admin' AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id))
  );

-- projects: only visible to team members
DROP POLICY IF EXISTS "projects_select_member" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_member" ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin"  ON public.projects;
DROP POLICY IF EXISTS "projects_delete_admin"  ON public.projects;
CREATE POLICY "projects_select_member" ON public.projects FOR SELECT
  USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "projects_insert_member" ON public.projects FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
CREATE POLICY "projects_update_admin" ON public.projects FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "projects_delete_admin" ON public.projects FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- tasks: scoped to project membership
DROP POLICY IF EXISTS "tasks_select_member" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_member" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_member" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_member" ON public.tasks;
CREATE POLICY "tasks_select_member" ON public.tasks FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_insert_member" ON public.tasks FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_update_member" ON public.tasks FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_delete_member" ON public.tasks FOR DELETE
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));

-- sprints: scoped to project membership
DROP POLICY IF EXISTS "sprints_select_member" ON public.sprints;
DROP POLICY IF EXISTS "sprints_insert_member" ON public.sprints;
DROP POLICY IF EXISTS "sprints_update_admin"  ON public.sprints;
CREATE POLICY "sprints_select_member" ON public.sprints FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "sprints_insert_member" ON public.sprints FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "sprints_update_admin" ON public.sprints FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
  ));

-- focus_sessions: users can only see/write their own sessions
DROP POLICY IF EXISTS "focus_sessions_own" ON public.focus_sessions;
CREATE POLICY "focus_sessions_own" ON public.focus_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- narrative_cache: scoped to project membership
DROP POLICY IF EXISTS "narrative_cache_select" ON public.narrative_cache;
DROP POLICY IF EXISTS "narrative_cache_insert" ON public.narrative_cache;
DROP POLICY IF EXISTS "Users can view their own project narratives" ON public.narrative_cache;
DROP POLICY IF EXISTS "System can manage narratives" ON public.narrative_cache;

CREATE POLICY "narrative_cache_select" ON public.narrative_cache FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "narrative_cache_insert" ON public.narrative_cache FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));

-- team_invitations: only the invitee (by email) and team admins can see
DROP POLICY IF EXISTS "invitations_select" ON public.team_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.team_invitations;
DROP POLICY IF EXISTS "invitations_delete" ON public.team_invitations;
DROP POLICY IF EXISTS "admins_manage_invites" ON public.team_invitations;
DROP POLICY IF EXISTS "invite_token_select" ON public.team_invitations;

CREATE POLICY "invitations_select" ON public.team_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "invitations_insert" ON public.team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "invitations_delete" ON public.team_invitations FOR DELETE
  USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
