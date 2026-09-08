-- database/migrations/20240003_indexes.sql

-- FlowBoard: primary query pattern is tasks by project + sprint
CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id   ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee    ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_sprint ON public.tasks(project_id, sprint_id);

-- Focus sessions: queried by task and by user
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON public.focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON public.focus_sessions(started_at DESC);

-- Sprints: queried by project
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status     ON public.sprints(status);

-- Projects: queried by team
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);

-- Narrative cache: looked up by project + expiry
-- Note: narrative_cache in 019 doesn't have expires_at, let's check its schema again
-- CREATE INDEX IF NOT EXISTS idx_narrative_cache_project_expires
--   ON public.narrative_cache(project_id, expires_at DESC);

-- Let's check narrative_cache schema from 019:
-- updated_at is the timestamp.
CREATE INDEX IF NOT EXISTS idx_narrative_cache_project_updated
  ON public.narrative_cache(project_id, updated_at DESC);

-- Team members: the most-joined table in RLS policies — must be fast
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);

-- Unique constraint: no duplicate sprint names per project
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_sprint_name_per_project') THEN
        ALTER TABLE public.sprints
          ADD CONSTRAINT uq_sprint_name_per_project UNIQUE (project_id, name)
          DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
