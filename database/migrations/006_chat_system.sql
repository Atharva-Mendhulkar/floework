-- ==========================================
-- CHAT SYSTEM MIGRATION
-- ==========================================

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    author_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content     text NOT NULL,
    created_at  timestamptz DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- SELECT: Users can read messages in projects they belong to
CREATE POLICY "Users can see messages in their projects" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id = messages.project_id AND tm.user_id = auth.uid()
        )
    );

-- INSERT: Users can send messages to projects they belong to
CREATE POLICY "Users can send messages to their projects" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id = project_id AND tm.user_id = auth.uid()
        )
    );

-- 4. Enable Realtime
-- Add messages to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- OPTIONAL: Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
