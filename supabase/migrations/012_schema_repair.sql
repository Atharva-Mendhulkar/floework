-- ==========================================
-- CONSOLIDATED SCHEMA REPAIR (012)
-- ==========================================

-- 1. Restore Focus Sessions Table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id       uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at    timestamptz NOT NULL DEFAULT now(),
    ended_at      timestamptz,
    duration_secs int,
    interrupts    int NOT NULL DEFAULT 0,
    note          text,
    is_after_hours boolean NOT NULL DEFAULT false
);

-- 2. Restore Starred Tasks Table
CREATE TABLE IF NOT EXISTS public.starred_tasks (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- 3. Sync RLS Policies
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starred_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "focus_sessions_isolation" ON public.focus_sessions;
CREATE POLICY "focus_sessions_isolation" ON public.focus_sessions 
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_stars" ON public.starred_tasks;
CREATE POLICY "users_manage_own_stars" ON public.starred_tasks 
    FOR ALL USING (user_id = auth.uid());
