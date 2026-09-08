-- database/migrations/037_concurrency_conflicts_metadata.sql
-- Add metadata column to concurrency_conflicts to store rich context for audit logs

ALTER TABLE public.concurrency_conflicts 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Harden views by setting security_invoker = true to respect querying user's RLS policies
ALTER VIEW public.conflict_stats SET (security_invoker = true);
ALTER VIEW public.conflict_hotspots SET (security_invoker = true);

-- Fix mutable search path warnings by pinning search_path to public
ALTER FUNCTION public.verify_security_invariants() SET search_path = public;
ALTER FUNCTION public.log_audit_event(uuid, uuid, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.toggle_task_star(uuid) SET search_path = public;
ALTER FUNCTION public.handle_task_update() SET search_path = public;

-- Revoke PUBLIC execute permissions on SECURITY DEFINER functions to prevent unauthorized API execution
REVOKE EXECUTE ON FUNCTION public.can_post_to_project(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_workspace_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_security_invariants() FROM PUBLIC;

-- Revoke public execution of toggle_task_star but explicitly allow authenticated users to call it
REVOKE EXECUTE ON FUNCTION public.toggle_task_star(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_task_star(uuid) TO authenticated;

-- Remove broad SELECT policies on public avatars bucket to prevent listing objects via API
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
