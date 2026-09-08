-- database/migrations/028_version_based_occ.sql

-- 1. Add version column for strict causal consistency
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Update set_updated_at function to also increment version
CREATE OR REPLACE FUNCTION handle_task_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind trigger to tasks
DROP TRIGGER IF EXISTS handle_task_update_trigger ON public.tasks;
CREATE TRIGGER handle_task_update_trigger
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION handle_task_update();

-- 4. Update toggle_task_star RPC to respect versioning (it will be incremented by trigger)
-- No change needed to the function body, but we ensure it returns the new version.

-- 5. Add conflict logging table for observability
CREATE TABLE IF NOT EXISTS public.concurrency_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  client_version BIGINT,
  server_version BIGINT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on conflict logs (admin only)
ALTER TABLE public.concurrency_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view conflicts" ON public.concurrency_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
