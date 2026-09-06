alter table public.profiles         enable row level security;
alter table public.teams            enable row level security;
alter table public.team_members     enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.focus_sessions   enable row level security;
alter table public.execution_signals enable row level security;
alter table public.focus_stability_slots enable row level security;
alter table public.subscriptions    enable row level security;

-- Profiles: users see/edit only their own
create policy "own profile" on public.profiles
  for all using (id = auth.uid());

-- Teams: members see their teams
create policy "team members see team" on public.teams
  for select using (
    id in (select team_id from public.team_members where user_id = auth.uid())
  );

-- Team members: members see their team roster
create policy "see team roster" on public.team_members
  for select using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

-- Projects: team members see team projects
create policy "team projects" on public.projects
  for all using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

-- Tasks: team members see/edit tasks in their projects
create policy "team tasks" on public.tasks
  for all using (
    project_id in (
      select id from public.projects where team_id in (
        select team_id from public.team_members where user_id = auth.uid()
      )
    )
  );

-- Focus sessions: users see own sessions
create policy "own sessions" on public.focus_sessions
  for all using (user_id = auth.uid());

-- Execution signals: readable by task's team members
create policy "read signals" on public.execution_signals
  for select using (
    task_id in (
      select id from public.tasks where project_id in (
        select id from public.projects where team_id in (
          select team_id from public.team_members where user_id = auth.uid()
        )
      )
    )
  );

-- Focus stability: own only
create policy "own stability" on public.focus_stability_slots
  for all using (user_id = auth.uid());

-- Subscriptions: own only
create policy "own subscription" on public.subscriptions
  for select using (user_id = auth.uid());
