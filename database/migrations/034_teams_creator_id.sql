-- database/migrations/034_teams_creator_id.sql

-- 1. Add creator_id to teams to allow RLS visibility before team_members join is populated
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) DEFAULT auth.uid();

-- 2. Backfill creator_id from existing team_members (find the first admin)
UPDATE public.teams t
SET creator_id = (
  SELECT user_id 
  FROM public.team_members 
  WHERE team_id = t.id AND role = 'admin' 
  LIMIT 1
)
WHERE creator_id IS NULL;

-- 3. Refine Teams RLS Policies
DROP POLICY IF EXISTS "teams_insert_creator" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_authenticated" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_final" ON public.teams;

-- Allow any authenticated user to create a team, binding them as the creator
CREATE POLICY "teams_insert_v3" ON public.teams 
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
  AND (creator_id IS NULL OR creator_id = auth.uid())
);

DROP POLICY IF EXISTS "teams_select_member" ON public.teams;
DROP POLICY IF EXISTS "teams_select_member_v2" ON public.teams;

-- Allow users to see teams they created OR teams they are members of
CREATE POLICY "teams_select_v3" ON public.teams 
FOR SELECT USING (
  creator_id = auth.uid()
  OR
  id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- 4. Ensure team_members insert is also hardened
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_insert_v2" ON public.team_members 
FOR INSERT WITH CHECK (
  -- Allow team creator to add themselves
  (team_id IN (SELECT id FROM public.teams WHERE creator_id = auth.uid()))
  OR
  -- Allow admins to add others
  (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'admin'))
);
