-- ==========================================
-- NUCLEAR CHAT STABILIZATION FIX (008)
-- ==========================================

-- 1. Reset RLS State
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Clean Up Old Policies
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "anyone authenticated can see profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can see messages in their projects" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their projects" ON public.messages;

-- 3. PROFILES: Visibility Fix
-- Allows all logged-in users to see names and avatars (Fixes 403 Forbidden)
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can still only edit their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. MESSAGES: Fail-safe Permissions
-- More permissive rules for showcase/demo to ensure chat always works
CREATE POLICY "messages_select_authenticated" ON public.messages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "messages_insert_authenticated" ON public.messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. REFRESH REALTIME
-- Ensure messages table is active in the live publication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
