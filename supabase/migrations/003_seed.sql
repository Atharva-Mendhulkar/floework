-- Demo is seeded via auth.users insert which triggers handle_new_user()
-- Use Supabase Dashboard → Auth → Add user to create:
--   demo@floework.dev / Demo1234!
-- Then note the UUID and substitute below.

-- After creating the demo user in the dashboard, run:
do $$
declare
  demo_uid uuid := (select id from auth.users where email = 'demo@floework.dev');
  team_id  uuid := uuid_generate_v4();
  proj_id  uuid := uuid_generate_v4();
begin

  insert into public.teams (id, name, slug) values (team_id, 'floework demo', 'floework-demo');
  insert into public.team_members (team_id, user_id, role) values (team_id, demo_uid, 'admin');

  insert into public.projects (id, team_id, name, sprint_name)
  values (proj_id, team_id, 'Core Platform', 'Sprint 14');

  -- Realistic task set across all statuses
  insert into public.tasks (project_id, assignee_id, title, status, effort, focus_count) values
    (proj_id, demo_uid, 'Setup Supabase Realtime channels',      'done',        'M', 4),
    (proj_id, demo_uid, 'FlowBoard drag-and-drop (Kanban)',       'done',        'L', 7),
    (proj_id, demo_uid, 'Focus session post-confirm screen',      'done',        'S', 2),
    (proj_id, demo_uid, 'Burnout risk trend chart (4-week)',       'in_progress', 'L', 3),
    (proj_id, demo_uid, 'Execution signal computation (backend)', 'in_progress', 'L', 5),
    (proj_id, demo_uid, 'Focus Stability Heatmap (7×24)',         'review',      'M', 2),
    (proj_id, demo_uid, 'Stripe billing stubs',                   'backlog',     'S', 0),
    (proj_id, demo_uid, 'Deep Work Window .ics export',           'backlog',     'M', 0),
    (proj_id, demo_uid, 'Estimation Memory Engine',               'backlog',     'L', 0);

  -- Seed some historical focus sessions (last 7 days)
  insert into public.focus_sessions (task_id, user_id, started_at, ended_at, duration_secs, interrupts)
  select
    t.id,
    demo_uid,
    now() - (random() * interval '7 days'),
    now() - (random() * interval '7 days') + (interval '1 minute' * (20 + floor(random() * 60))),
    (20 + floor(random() * 60)::int) * 60,
    floor(random() * 4)::int
  from public.tasks t
  cross join generate_series(1, 3)
  where t.project_id = proj_id and t.focus_count > 0;

end $$;
