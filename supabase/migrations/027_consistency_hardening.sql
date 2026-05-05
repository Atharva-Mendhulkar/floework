-- supabase/migrations/027_consistency_hardening.sql

-- 1. Introduce Versioned State
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Auto-update timestamp function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger for tasks
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.tasks;
CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 4. Create RPC for atomic toggling
CREATE OR REPLACE FUNCTION toggle_task_star(p_task_id UUID)
RETURNS public.tasks AS $$
DECLARE
  v_task public.tasks;
BEGIN
  UPDATE public.tasks
  SET
    is_starred = NOT is_starred,
    updated_at = now()
  WHERE id = p_task_id
  RETURNING * INTO v_task;
  
  RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
