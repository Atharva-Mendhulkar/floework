-- supabase/migrations/031_rls_refinement.sql

-- 1. Refined Profile Visibility (Performance Optimized + Join-Based)
DROP POLICY IF EXISTS "profiles_select_team_members" ON public.profiles;

CREATE POLICY "profiles_select_team_hardened" ON public.profiles
FOR SELECT USING (
  id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = profiles.id
  )
);

-- 2. Hardened Message Access (Consistent with Project Security)
DROP POLICY IF EXISTS "messages_select_member" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_member" ON public.messages;

CREATE POLICY "messages_select_hardened" ON public.messages 
FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_hardened" ON public.messages 
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
  AND author_id = auth.uid()
);

-- 3. Performance Indexes for Membership Joins
CREATE INDEX IF NOT EXISTS idx_tm_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tm_team_id ON public.team_members(team_id);

-- 4. Narrative Cache (Audit/Verification)
-- Ensure narrative cache is also strictly project-scoped
DROP POLICY IF EXISTS "narrative_cache_select" ON public.narrative_cache;
DROP POLICY IF EXISTS "narrative_cache_insert" ON public.narrative_cache;

CREATE POLICY "narrative_cache_select_hardened" ON public.narrative_cache 
FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "narrative_cache_insert_hardened" ON public.narrative_cache 
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
);
