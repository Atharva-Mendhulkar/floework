-- ==========================================
-- 1. ENSURE CORE TABLES EXIST
-- ==========================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
        CREATE TABLE public.teams (
            id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        text NOT NULL,
            slug        text UNIQUE NOT NULL,
            created_at  timestamptz DEFAULT now()
        );
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        CREATE TABLE public.team_members (
            team_id   uuid REFERENCES public.teams(id) ON DELETE CASCADE,
            user_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
            role      text NOT NULL CHECK (role IN ('admin','member')),
            joined_at timestamptz DEFAULT now(),
            PRIMARY KEY (team_id, user_id)
        );
    END IF;
END $$;

-- ==========================================
-- 2. HARDEN RLS POLICIES (DROP & RECREATE)
-- ==========================================

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "anyone authenticated can see profiles" ON public.profiles;

CREATE POLICY "anyone authenticated can see profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Teams
DROP POLICY IF EXISTS "anyone authenticated can see teams" ON public.teams;
DROP POLICY IF EXISTS "anyone authenticated can create teams" ON public.teams;

CREATE POLICY "anyone authenticated can see teams" ON public.teams
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "anyone authenticated can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Team Members
DROP POLICY IF EXISTS "anyone authenticated can see team_members" ON public.team_members;

CREATE POLICY "anyone authenticated can see team_members" ON public.team_members
    FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- 3. REFRESH SCHEMA CACHE HINT
-- ==========================================
NOTIFY pgrst, 'reload schema';
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth';
COMMENT ON TABLE public.teams IS 'Workspace teams';
