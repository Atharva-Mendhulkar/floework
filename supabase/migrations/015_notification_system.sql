-- ==========================================
-- NOTIFICATION SYSTEM (015)
-- ==========================================

-- 1. Create Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    type        text DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    link        text,
    is_read     boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Users can only see their own alerts
CREATE POLICY "Users can see own alerts" ON public.alerts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own alerts" ON public.alerts
    FOR UPDATE USING (user_id = auth.uid());

-- 4. Trigger Function: log_workspace_activity
CREATE OR REPLACE FUNCTION public.log_workspace_activity()
RETURNS TRIGGER AS $$
DECLARE
    team_member RECORD;
BEGIN
    -- Handle Task Completion
    IF (TG_TABLE_NAME = 'tasks' AND NEW.status = 'done' AND OLD.status != 'done') THEN
        -- Notify the reporter or project owner (for now, let's notify the workspace)
        -- In a real app, we'd loop through team members or notify the assignee's manager.
        -- For Floework, we'll notify all team members in the project's team.
        FOR team_member IN 
            SELECT tm.user_id 
            FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id = NEW.project_id
        LOOP
            IF team_member.user_id != auth.uid() THEN
                INSERT INTO public.alerts (user_id, title, description, type, link)
                VALUES (team_member.user_id, 'Task Completed', 'Task "' || NEW.title || '" has been completed.', 'success', '/projects/' || NEW.project_id);
            END IF;
        END LOOP;
    END IF;

    -- Handle New Messages
    IF (TG_TABLE_NAME = 'messages') THEN
        FOR team_member IN 
            SELECT tm.user_id 
            FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id = NEW.project_id
        LOOP
            IF team_member.user_id != NEW.author_id THEN
                INSERT INTO public.alerts (user_id, title, description, type, link)
                VALUES (team_member.user_id, 'New Message', 'You have a new message in project chat.', 'info', '/projects/' || NEW.project_id);
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Triggers
DROP TRIGGER IF EXISTS tr_task_completion_alert ON public.tasks;
CREATE TRIGGER tr_task_completion_alert
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_workspace_activity();

DROP TRIGGER IF EXISTS tr_new_message_alert ON public.messages;
CREATE TRIGGER tr_new_message_alert
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.log_workspace_activity();

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
