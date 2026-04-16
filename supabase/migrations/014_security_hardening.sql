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

-- 2. Enable RLS on primary workspace tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on focus & analytics tables
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_stability_slots ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on communication tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Note: Policies for these tables were already defined in migration 002, 007, 009, and 013.
-- This command simply "activates" them for PostgREST.
