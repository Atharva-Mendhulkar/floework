-- ==========================================
-- SECURITY HARDENING & RLS ENFORCEMENT (014)
-- ==========================================

-- This migration explicitly enables RLS on all core tables.
-- Without these commands, the policies created in previous migrations (like 013) are NOT enforced.

-- 1. Ensure focus_stability_slots exists (powers the dashboard HEX-grid)
CREATE TABLE IF NOT EXISTS public.focus_stability_slots (
    user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
    hour_of_day int CHECK (hour_of_day BETWEEN 0 AND 23),
    score       numeric(4,2) DEFAULT 0,
    updated_at  timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, day_of_week, hour_of_day)
);

-- 2. Secure Workspace Tables safely
DO $$ 
BEGIN 
  -- Primary core tables
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'tasks') THEN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'projects') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'teams') THEN
    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'team_members') THEN
    ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Focus & Analytics
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'focus_sessions') THEN
    ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'focus_stability_slots') THEN
    ALTER TABLE public.focus_stability_slots ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Communication (Only enable if they exist)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- removed 'chats' as it is legacy/unused
END $$;

-- Note: Policies for these tables were already defined in migration 002, 007, 009, and 013.
-- This command simply "activates" them for PostgREST.
