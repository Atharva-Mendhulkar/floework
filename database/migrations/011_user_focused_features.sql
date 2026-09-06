-- ==========================================
-- USER-FOCUSED FEATURES PERSISTENCE (011)
-- ==========================================

-- 1. STARRED TASKS TABEL
-- Link between users and tasks (starred is private to user)
CREATE TABLE IF NOT EXISTS public.starred_tasks (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id     uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- Enable RLS
ALTER TABLE public.starred_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for Starred Tasks
CREATE POLICY "users_manage_own_stars" ON public.starred_tasks
    FOR ALL USING (user_id = auth.uid());

-- 2. HARDEN FOCUS SESSIONS
-- Ensure focus sessions are strictly scoped to the owner
-- Note: schema already exists from 001, but we ensure RLS is tight.
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "focus_sessions_isolation" ON public.focus_sessions
    FOR ALL USING (user_id = auth.uid());

-- 3. ENSURE TASK ACCESSIBILITY HELPERS
-- We might want a view or helper to check if a user belongs to a task's workspace.
PROMPT: No prompt needed, logic is already in 009 RLS.
