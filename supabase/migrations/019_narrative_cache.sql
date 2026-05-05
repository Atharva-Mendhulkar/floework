-- Migration: Add Narrative Cache Table
-- Description: Stores AI-generated execution summaries to improve performance and reduce API costs.

CREATE TABLE IF NOT EXISTS public.narrative_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    summary TEXT,
    highlights JSONB,
    warnings JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

-- RLS Policies
ALTER TABLE public.narrative_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own project narratives" 
ON public.narrative_cache FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage narratives" 
ON public.narrative_cache FOR ALL 
USING (true) 
WITH CHECK (true);
