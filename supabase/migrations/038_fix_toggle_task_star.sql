-- supabase/migrations/038_fix_toggle_task_star.sql
`
-- Drop the broken function (which incorrectly expected is_starred on tasks table)
DROP FUNCTION IF EXISTS public.toggle_task_star(UUID);

-- Recreate it to correctly insert/delete from starred_tasks per user
CREATE OR REPLACE FUNCTION public.toggle_task_star(p_task_id UUID)
RETURNS boolean AS $$
DECLARE
  v_user_id UUID;
  v_is_starred boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already starred by this user
  IF EXISTS (
    SELECT 1 FROM public.starred_tasks 
    WHERE user_id = v_user_id AND task_id = p_task_id
  ) THEN
    -- If it is, delete the star
    DELETE FROM public.starred_tasks 
    WHERE user_id = v_user_id AND task_id = p_task_id;
    v_is_starred := false;
  ELSE
    -- If it is not, insert a new star
    INSERT INTO public.starred_tasks (user_id, task_id) 
    VALUES (v_user_id, p_task_id);
    v_is_starred := true;
  END IF;

  RETURN v_is_starred;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply security and search path settings
ALTER FUNCTION public.toggle_task_star(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.toggle_task_star(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_task_star(uuid) TO authenticated;
