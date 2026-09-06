-- supabase/migrations/032_elite_rls_refinement.sql

-- 1. Precision Messaging Security (No trust in client-provided sender_id)
-- Ensure author_id always defaults to the authenticated user
ALTER TABLE public.messages 
ALTER COLUMN author_id SET DEFAULT auth.uid();

-- Refine the insert policy to strictly enforce ownership
DROP POLICY IF EXISTS "messages_insert_hardened" ON public.messages;
CREATE POLICY "messages_insert_elite" ON public.messages 
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  )
  AND author_id = auth.uid() -- Cryptographic binding to authenticated session
);

-- 2. Compound Indexing for High-Performance Membership Checks
-- Speeds up the (tm1.user_id = auth.uid() JOIN tm2 ON team_id) path used in RLS
CREATE INDEX IF NOT EXISTS idx_tm_user_team ON public.team_members(user_id, team_id);

-- 3. Strict Profile Visibility (Elite Shape)
-- Re-applying the EXISTS check with the exact double-anchor structure recommended
DROP POLICY IF EXISTS "profiles_select_team_hardened" ON public.profiles;
CREATE POLICY "profiles_select_team_elite" ON public.profiles
FOR SELECT USING (
  id = auth.uid() 
  OR EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = profiles.id
  )
);
