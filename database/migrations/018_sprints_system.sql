-- ==========================================
-- SPRINTS SYSTEM (018)
-- ==========================================

-- 1. Create Sprints Table
CREATE TABLE IF NOT EXISTS public.sprints (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name          text NOT NULL,
    status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PLANNED')),
    start_date    timestamptz NOT NULL DEFAULT now(),
    end_date      timestamptz,
    created_at    timestamptz DEFAULT now()
);

-- 2. Link Tasks to Sprints
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "sprints_workspace_visibility" ON public.sprints;
CREATE POLICY "sprints_workspace_visibility" ON public.sprints
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.team_members tm ON tm.team_id = p.team_id
            WHERE tm.user_id = auth.uid()
        )
    );
