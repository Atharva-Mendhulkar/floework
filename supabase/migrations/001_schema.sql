-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Users (mirrors Supabase Auth, extended with profile data)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Teams
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now()
);

-- Team membership + roles
create table public.team_members (
  team_id   uuid references public.teams(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  role      text not null check (role in ('admin','member')),
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

-- Projects
create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid references public.teams(id) on delete cascade,
  name        text not null,
  sprint_name text not null default 'Sprint 1',
  created_at  timestamptz default now()
);

-- Tasks
create table public.tasks (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid references public.projects(id) on delete cascade,
  assignee_id   uuid references public.profiles(id),
  title         text not null,
  description   text,
  status        text not null default 'backlog'
                  check (status in ('backlog','in_progress','review','done')),
  effort        text check (effort in ('S','M','L')),
  due_date      date,
  focus_count   int not null default 0,
  blocker_risk  numeric(3,2) default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Focus sessions
create table public.focus_sessions (
  id            uuid primary key default uuid_generate_v4(),
  task_id       uuid references public.tasks(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_secs int,
  interrupts    int not null default 0,
  note          text,
  is_after_hours boolean not null default false
);

-- Execution signals (pre-computed, refreshed by cron)
create table public.execution_signals (
  task_id       uuid primary key references public.tasks(id) on delete cascade,
  effort_density  numeric(5,2),
  resume_rate     numeric(5,2),
  blocker_risk    numeric(3,2),
  updated_at    timestamptz default now()
);

-- Focus stability slots (7×24 grid per user)
create table public.focus_stability_slots (
  user_id     uuid references public.profiles(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  hour_of_day int check (hour_of_day between 0 and 23),
  score       numeric(4,2) default 0,
  updated_at  timestamptz default now(),
  primary key (user_id, day_of_week, hour_of_day)
);

-- Subscriptions (stubbed for showcase — no Stripe calls)
create table public.subscriptions (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  plan        text not null default 'free' check (plan in ('free','pro','team')),
  status      text not null default 'active',
  updated_at  timestamptz default now()
);

-- Trigger: keep tasks.focus_count in sync
create or replace function increment_focus_count()
returns trigger language plpgsql as $$
begin
  update public.tasks
  set focus_count = focus_count + 1,
      updated_at  = now()
  where id = new.task_id;
  return new;
end;
$$;

create trigger on_focus_session_insert
  after insert on public.focus_sessions
  for each row execute function increment_focus_count();

-- Trigger: auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
