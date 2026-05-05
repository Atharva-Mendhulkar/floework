-- supabase/migrations/030_profiles_team_visibility.sql

-- Expand profile visibility so team members can see each other's basic info
-- Required for chat (author names) and task assignees.

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_team_members" ON public.profiles
FOR SELECT USING (
  id = auth.uid() -- still see self
  OR 
  id IN (
    -- see people who share at least one team with me
    SELECT user_id FROM public.team_members
    WHERE team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  )
);

-- Also ensure messages table has hardened policies consistent with other project entities
DROP POLICY IF EXISTS "Users can see messages in their projects" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their projects" ON public.messages;

CREATE POLICY "messages_select_member" ON public.messages FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_member" ON public.messages FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
  AND author_id = auth.uid()
);
