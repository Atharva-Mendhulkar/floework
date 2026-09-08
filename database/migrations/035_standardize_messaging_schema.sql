-- database/migrations/035_standardize_messaging_schema.sql

-- 1. Standardize column naming: Rename author_id to user_id to match system-wide patterns
ALTER TABLE public.messages RENAME COLUMN author_id TO user_id;

-- 2. Update the default and constraints
ALTER TABLE public.messages ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Ensure the FK is named simply for PostgREST resolution
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS author;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_author_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Update the Notification Trigger Function to use user_id
CREATE OR REPLACE FUNCTION public.log_workspace_activity()
RETURNS TRIGGER AS $$
DECLARE
    team_member RECORD;
BEGIN
    -- Handle Task Completion
    IF (TG_TABLE_NAME = 'tasks' AND NEW.status = 'done' AND OLD.status != 'done') THEN
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

    -- Handle New Messages (Updated to use user_id)
    IF (TG_TABLE_NAME = 'messages') THEN
        FOR team_member IN 
            SELECT tm.user_id 
            FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE p.id = NEW.project_id
        LOOP
            IF team_member.user_id != NEW.user_id THEN
                INSERT INTO public.alerts (user_id, title, description, type, link)
                VALUES (team_member.user_id, 'New Message', 'You have a new message in project chat.', 'info', '/projects/' || NEW.project_id);
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Update RLS Policies to use user_id
DROP POLICY IF EXISTS "messages_insert_final" ON public.messages;
CREATE POLICY "messages_insert_v4" ON public.messages 
FOR INSERT WITH CHECK (
  can_post_to_project(project_id) 
  AND 
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "messages_select_final" ON public.messages;
CREATE POLICY "messages_select_v4" ON public.messages 
FOR SELECT USING (
  can_post_to_project(project_id)
);
