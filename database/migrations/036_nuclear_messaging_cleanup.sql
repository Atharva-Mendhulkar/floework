-- supabase/migrations/036_nuclear_messaging_cleanup.sql

-- 1. Total Policy Wipe: Detect and destroy ALL existing policies on the messages table
-- This removes any "phantom" policies referencing old columns like author_id
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'messages' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    END LOOP;
END $$;

-- 2. Schema Integrity: Ensure user_id is the unified column
-- Standardize to user_id (renaming if author_id exists, adding if not)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'author_id') THEN
    ALTER TABLE public.messages RENAME COLUMN author_id TO user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'user_id') THEN
    ALTER TABLE public.messages ADD COLUMN user_id uuid REFERENCES public.profiles(id) DEFAULT auth.uid();
  END IF;
END $$;

-- 3. Standardize Foreign Keys
-- Clear any ambiguous FKs to profiles
DO $$ 
DECLARE 
    fk_name text;
BEGIN
    FOR fk_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.messages'::regclass 
        AND confrelid = 'public.profiles'::regclass
    LOOP
        EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', fk_name);
    END LOOP;
END $$;

-- Re-create a single, clean foreign key
ALTER TABLE public.messages 
ADD CONSTRAINT fk_messages_user_profile 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Re-deploy Final Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_insert_v5" ON public.messages 
FOR INSERT WITH CHECK (
  can_post_to_project(project_id) 
  AND 
  user_id = auth.uid()
);

CREATE POLICY "messages_select_v5" ON public.messages 
FOR SELECT USING (
  can_post_to_project(project_id)
);

-- 5. Standardize the Workspace Activity Trigger
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

    -- Handle New Messages (Standardized to user_id)
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
