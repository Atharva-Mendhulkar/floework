-- database/migrations/033_messaging_repair.sql

-- 1. Explicitly name the foreign key so PostgREST can resolve the 'author' alias
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_author_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT author -- Explicitly name the FK 'author' for PostgREST
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create a robust validation function to handle project membership
-- SECURITY DEFINER ensures this runs with elevated privileges to check joins accurately
CREATE OR REPLACE FUNCTION public.can_post_to_project(pid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.team_members tm ON tm.team_id = p.team_id
    WHERE p.id = pid AND tm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-apply the hardened INSERT policy using the validation function
-- This removes any column ambiguity (e.g., project_id vs p.id)
DROP POLICY IF EXISTS "messages_insert_elite" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_hardened" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their projects" ON public.messages;
DROP POLICY IF EXISTS "workspace_isolation_messages_insert" ON public.messages;

CREATE POLICY "messages_insert_final" ON public.messages 
FOR INSERT WITH CHECK (
  can_post_to_project(project_id) 
  AND 
  author_id = auth.uid()
);

-- 4. Re-apply the SELECT policy for consistency
DROP POLICY IF EXISTS "messages_select_elite" ON public.messages;
DROP POLICY IF EXISTS "messages_select_hardened" ON public.messages;
DROP POLICY IF EXISTS "Users can see messages in their projects" ON public.messages;
DROP POLICY IF EXISTS "workspace_isolation_messages_select" ON public.messages;

CREATE POLICY "messages_select_final" ON public.messages 
FOR SELECT USING (
  can_post_to_project(project_id)
);
