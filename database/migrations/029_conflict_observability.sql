-- database/migrations/029_conflict_observability.sql

-- Create a view for aggregated conflict signals
CREATE OR REPLACE VIEW public.conflict_stats AS
SELECT 
  entity_type,
  entity_id,
  COUNT(*) as total_conflicts,
  MAX(created_at) as last_conflict_at,
  AVG(server_version - client_version) as avg_staleness_gap
FROM public.concurrency_conflicts
GROUP BY entity_type, entity_id;

-- Create a view for hotspot users
CREATE OR REPLACE VIEW public.conflict_hotspots AS
SELECT 
  user_id,
  COUNT(*) as conflict_count,
  COUNT(DISTINCT entity_id) as affected_entities
FROM public.concurrency_conflicts
GROUP BY user_id
ORDER BY conflict_count DESC;

-- Grant access to admins
GRANT SELECT ON public.conflict_stats TO authenticated;
GRANT SELECT ON public.conflict_hotspots TO authenticated;
