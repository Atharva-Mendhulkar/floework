-- database/migrations/039_execution_graph.sql

-- 1. Task Dependencies (Graph Edges)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    target_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'depends_on',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_task_id, target_task_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies for their projects" ON public.task_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE t.id = public.task_dependencies.source_task_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create dependencies in their projects" ON public.task_dependencies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE t.id = source_task_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete dependencies in their projects" ON public.task_dependencies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE t.id = public.task_dependencies.source_task_id
            AND tm.user_id = auth.uid()
        )
    );

-- 2. Execution Signals (Node Intelligence)
CREATE TABLE IF NOT EXISTS public.execution_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    signal_score FLOAT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their projects" ON public.execution_signals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE t.id = public.execution_signals.task_id
            AND tm.user_id = auth.uid()
        )
    );

-- 3. Execution Edges (Edge Intelligence)
CREATE TABLE IF NOT EXISTS public.execution_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dependency_id UUID NOT NULL REFERENCES public.task_dependencies(id) ON DELETE CASCADE,
    health_score FLOAT,
    congestion_score FLOAT,
    risk_level TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view edge intelligence for their projects" ON public.execution_edges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.task_dependencies td
            JOIN public.tasks t ON td.source_task_id = t.id
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE td.id = public.execution_edges.dependency_id
            AND tm.user_id = auth.uid()
        )
    );

-- Realtime broadcast handled via AWS API Gateway WebSockets & Redis PubSub
