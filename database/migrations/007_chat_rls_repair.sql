-- ==========================================
-- CHAT RLS REPAIR SCRIPT
-- ==========================================

-- 1. Enable Global Profile Visibility (Required for names in chat)
DROP POLICY IF EXISTS "anyone authenticated can see profiles" ON public.profiles;
CREATE POLICY "anyone authenticated can see profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Harden Messages SELECT Policy
DROP POLICY IF EXISTS "Users can see messages in their projects" ON public.messages;
CREATE POLICY "Users can see messages in their projects" ON public.messages
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- 3. Harden Messages INSERT Policy
DROP POLICY IF EXISTS "Users can send messages to their projects" ON public.messages;
CREATE POLICY "Users can send messages to their projects" ON public.messages
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- 4. Safely refresh the Realtime Publication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
