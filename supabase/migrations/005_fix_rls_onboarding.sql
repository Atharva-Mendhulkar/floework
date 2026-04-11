-- Allow authenticated users to create teams
create policy "anyone authenticated can create teams" on public.teams
  for insert with check (auth.role() = 'authenticated');

-- Allow users to add themselves to teams (needed for onboarding)
create policy "users can add themselves to teams" on public.team_members
  for insert with check (auth.uid() = user_id);

-- Allow admins to manage their team members
create policy "admins can manage team members" on public.team_members
  for all using (
    exists (
      select 1 from public.team_members
      where team_id = public.team_members.team_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Ensure projects can be created by team members
create policy "team members can create projects" on public.projects
  for insert with check (
    exists (
      select 1 from public.team_members
      where team_id = public.projects.team_id
      and user_id = auth.uid()
    )
  );
