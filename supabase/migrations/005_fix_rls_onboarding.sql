-- Allow authenticated users to create teams
create policy "anyone authenticated can create teams" on public.teams
  for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to see teams (needed to read back after insert)
create policy "anyone authenticated can see teams" on public.teams
  for select using (auth.role() = 'authenticated');

-- Allow users to add themselves to teams
create policy "users can add themselves to teams" on public.team_members
  for insert with check (auth.uid() = user_id);

-- Allow users to see their own memberships and team roster
create policy "anyone authenticated can see memberships" on public.team_members
  for select using (auth.role() = 'authenticated');

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

-- Allow authenticated users to see projects they belong to
-- (Already covered by "team projects" policy in 002_rls.sql, but ensuring here)
create policy "members can see projects" on public.projects
  for select using (
    exists (
      select 1 from public.team_members
      where team_id = public.projects.team_id
      and user_id = auth.uid()
    )
  );
