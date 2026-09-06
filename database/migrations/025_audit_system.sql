-- 025_audit_system.sql
-- Lightweight audit logging for critical administrative actions

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid REFERENCES public.teams(id),
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Ensure team_id exists if table was created in a previous run
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);

-- Audit logs are strictly append-only and only visible to system admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Block all updates and deletes
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_no_update" ON public.audit_logs FOR UPDATE USING (false OR auth.uid() IS NULL);
CREATE POLICY "audit_logs_no_delete" ON public.audit_logs FOR DELETE USING (false OR auth.uid() IS NULL);

-- Only admins of the SPECIFIC team can see logs
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = audit_logs.team_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ));

-- Function to record logs from backend
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_team_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity text,
  p_entity_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (team_id, user_id, action, entity, entity_id, metadata)
  VALUES (p_team_id, p_user_id, p_action, p_entity, p_entity_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
