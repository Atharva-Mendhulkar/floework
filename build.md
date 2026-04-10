# CLAUDE.md — floework showcase deployment

> Agent instructions for Claude Code. Read this file fully before touching any file.
> Goal: scaffold and deploy a free, showcase-grade floework instance on Vercel + Supabase.
> No Stripe. No BullMQ. No Redis. No AWS. Frontend + DB + Auth + Realtime only.

---

## 0. Orientation

You are building a **showcase (read: non-production) deployment** of floework — a human-aware productivity SaaS. The target audience is evaluators, recruiters, and hackathon judges. It must look and feel complete. It does not need billing or background jobs.

Free-tier constraints you must respect at all times:
- Supabase free: 500 MB DB, 1 GB storage, 50k MAU auth, 200 concurrent realtime connections
- Vercel free: 100 GB bandwidth, serverless function 10s timeout, no persistent Node process
- No paid add-ons under any circumstances

Stack for this deployment:
- **Frontend**: React + Vite → Vercel (static)
- **API**: Vercel serverless functions (TypeScript, no Express)
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth (email/password + GitHub OAuth)
- **Realtime**: Supabase Realtime (presence + CDC)
- **Background jobs**: Vercel Cron (weekly analytics refresh only)
- **Stripe**: fully stubbed — UI renders, no real payments
- **Redis / BullMQ**: removed entirely

---

## 1. Pre-flight checklist

Before writing a single line of code, verify the following. If any item is missing, stop and ask the user.

```
[ ] SUPABASE_URL          — from Supabase project Settings → API
[ ] SUPABASE_ANON_KEY     — same location
[ ] SUPABASE_SERVICE_ROLE_KEY — same location (keep server-side only)
[ ] GITHUB_CLIENT_ID      — GitHub OAuth app (optional, skip if not provided)
[ ] GITHUB_CLIENT_SECRET  — same
[ ] VERCEL_TOKEN          — from vercel.com/account/tokens (needed for CLI deploy)
[ ] Repo is initialized   — git init && git remote add origin <url>
```

Store all secrets in `.env.local` (never committed) and mirror them in Vercel project env vars via CLI:
```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## 2. Repository structure

Scaffold exactly this layout. Do not deviate — Vercel's build pipeline depends on it.

```
floework/
├── CLAUDE.md                    ← this file
├── .env.local                   ← gitignored, local secrets
├── .env.example                 ← committed, all keys with empty values
├── .gitignore
├── package.json                 ← root workspace (Bun workspaces)
├── bun.lockb
├── vercel.json                  ← routing + cron config
│
├── apps/
│   └── web/                     ← Vite React app
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       ├── public/
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── lib/
│           │   ├── supabase.ts  ← single shared client
│           │   └── store.ts     ← Redux store
│           ├── components/
│           ├── pages/
│           └── hooks/
│
├── api/                         ← Vercel serverless functions (flat, no Express)
│   ├── tasks/
│   │   ├── index.ts             ← GET /api/tasks, POST /api/tasks
│   │   └── [id].ts              ← GET/PATCH/DELETE /api/tasks/:id
│   ├── focus/
│   │   ├── index.ts             ← POST /api/focus (start session)
│   │   └── [id]/stop.ts         ← POST /api/focus/:id/stop
│   ├── analytics/
│   │   ├── narrative.ts
│   │   └── stability.ts
│   ├── projects/
│   │   └── index.ts
│   ├── teams/
│   │   └── index.ts
│   └── cron/
│       └── refresh-analytics.ts ← weekly cron, not a user-facing route
│
└── supabase/
    ├── migrations/
    │   ├── 001_schema.sql
    │   ├── 002_rls.sql
    │   └── 003_seed.sql
    └── config.toml
```

---

## 3. Supabase schema (`supabase/migrations/001_schema.sql`)

Generate and apply this schema in full before writing any application code.

```sql
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
returns trigger language plpgsql security definer as $$
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
```

---

## 4. Row Level Security (`supabase/migrations/002_rls.sql`)

Apply after schema. These policies replace ALL Express RBAC middleware for direct Supabase client calls.

```sql
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
```

---

## 5. Seed data (`supabase/migrations/003_seed.sql`)

Apply after RLS. Creates one demo team, project, and realistic task set for the showcase.
Run only in development / on the free showcase instance — never in a real tenant environment.

```sql
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
```

---

## 6. Supabase client singleton (`apps/web/src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types' // generate with: supabase gen types typescript

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
```

Generate TypeScript types after applying migrations:
```bash
bunx supabase gen types typescript \
  --project-id <your-project-ref> \
  > apps/web/src/lib/database.types.ts
```

---

## 7. Auth integration

Replace the existing JWT middleware pattern with Supabase Auth throughout.

**Frontend — auth state:**
```typescript
// apps/web/src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

**ProtectedRoute:**
```typescript
// apps/web/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
  </div>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
```

**Login page — replace custom form with Supabase:**
```typescript
// Sign in
const { error } = await supabase.auth.signInWithPassword({ email, password })

// Sign up
const { error } = await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: name } }
})

// GitHub OAuth (if configured)
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: `${window.location.origin}/dashboard` }
})

// Sign out
await supabase.auth.signOut()
```

---

## 8. Realtime integration

Replace all Socket.IO client and server code with Supabase Realtime.

**Task board sync:**
```typescript
// apps/web/src/hooks/useTasksRealtime.ts
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAppDispatch } from '../lib/store'
import { taskUpdated, taskCreated, taskDeleted } from '../lib/tasksSlice'

export function useTasksRealtime(projectId: string) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ new: task }) => dispatch(taskCreated(task)))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ new: task }) => dispatch(taskUpdated(task)))
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'tasks',
        filter: `project_id=eq.${projectId}`
      }, ({ old: task }) => dispatch(taskDeleted(task.id)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, dispatch])
}
```

**Team presence (In Focus indicators):**
```typescript
// apps/web/src/hooks/usePresence.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type PresenceState = Record<string, { userId: string; status: 'in_focus' | 'available'; taskId?: string }[]>

export function usePresence(teamId: string, currentUserId: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})

  useEffect(() => {
    const channel = supabase.channel(`presence:team:${teamId}`, {
      config: { presence: { key: currentUserId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        setPresenceState(channel.presenceState<{ status: 'in_focus' | 'available'; taskId?: string }>())
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId, status: 'available' })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [teamId, currentUserId])

  // Call this when a focus session starts
  const setInFocus = (taskId: string) =>
    channel.track({ userId: currentUserId, status: 'in_focus', taskId })

  const setAvailable = () =>
    channel.track({ userId: currentUserId, status: 'available' })

  return { presenceState, setInFocus, setAvailable }
}
```

---

## 9. Vercel API routes (serverless functions)

Each file under `/api/` is one serverless function. No Express, no app.listen. Pattern:

```typescript
// api/tasks/index.ts
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

function getSupabase(req: VercelRequest) {
  // Use service role for server-side mutations bypassing RLS where needed
  // Use anon key + user JWT for user-scoped queries (RLS enforces access)
  const authHeader = req.headers.authorization
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return supabase
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { projectId } = req.query
    const supabase = getSupabase(req)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles(full_name, avatar_url), focus_sessions(count)')
      .eq('project_id', projectId as string)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const supabase = getSupabase(req)
    const { data, error } = await supabase
      .from('tasks')
      .insert(req.body)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
```

Repeat this pattern for every route in the structure defined in Section 2. Functions that don't need a server-side secret should query Supabase directly from the frontend using the anon key — RLS handles the security.

---

## 10. Analytics (showcase-mode)

For the showcase, analytics are computed on-demand (no Redis, no BullMQ). Heavy aggregations use Postgres directly with materialized views refreshed by Vercel Cron.

**Materialized view for focus stability:**
```sql
-- Add to supabase/migrations/004_analytics_views.sql
create materialized view public.mv_focus_stability as
select
  user_id,
  extract(dow  from started_at at time zone 'Asia/Kolkata')::int as day_of_week,
  extract(hour from started_at at time zone 'Asia/Kolkata')::int as hour_of_day,
  round(avg(duration_secs) / 60.0, 2) as avg_minutes,
  count(*) as session_count,
  round(1.0 - (avg(interrupts)::numeric / nullif(avg(duration_secs / 900.0), 0)), 2) as score
from public.focus_sessions
where ended_at is not null
group by 1, 2, 3;

create unique index on public.mv_focus_stability (user_id, day_of_week, hour_of_day);
```

**Vercel Cron refresh (`api/cron/refresh-analytics.ts`):**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect from non-cron callers
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await supabase.rpc('refresh_materialized_view', { view_name: 'mv_focus_stability' })
  return res.status(200).json({ ok: true, refreshed_at: new Date().toISOString() })
}
```

**`vercel.json` — cron + routing config:**
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-analytics",
      "schedule": "0 3 * * 1"
    }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PATCH,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    }
  ]
}
```

---

## 11. Stripe stubs (showcase)

Do not implement real Stripe calls. Stub the billing UI to look real without making any API calls.

```typescript
// apps/web/src/pages/BillingPage.tsx (stub)
const PLANS = [
  { id: 'free',  name: 'Free',  price: '₹0',    features: ['1 project', '3 members', 'Core analytics'] },
  { id: 'pro',   name: 'Pro',   price: '₹699',  features: ['Unlimited projects', 'All analytics', 'Deep Work ICS'] },
  { id: 'team',  name: 'Team',  price: '₹1,999', features: ['Everything in Pro', 'Team burnout alerts', 'SSO'] },
]

// On upgrade click, show a toast instead of redirecting:
const handleUpgrade = (planId: string) => {
  toast.info('Billing is disabled in the showcase build. Full Stripe integration available in production.')
}
```

---

## 12. Environment variables reference

```bash
# apps/web/.env.local  (Vite — must be prefixed VITE_)
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Root .env.local  (Vercel serverless — no VITE_ prefix)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=<random 32-char string, generate with: openssl rand -hex 16>

# Optional
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

`.env.example` (commit this):
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

---

## 13. Deployment sequence

Run these steps in order. Do not skip steps. Do not parallelize.

```bash
# 1. Install dependencies
bun install

# 2. Apply Supabase migrations (requires Supabase CLI)
bunx supabase db push --project-ref <your-ref>

# 3. Generate TypeScript types
bunx supabase gen types typescript \
  --project-ref <your-ref> \
  > apps/web/src/lib/database.types.ts

# 4. Create demo user in Supabase Dashboard:
#    Auth → Users → Add user → demo@floework.dev / Demo1234!
#    Then run the seed SQL from migration 003 in the SQL editor.

# 5. Build frontend locally to catch errors before deploy
cd apps/web && bun run build

# 6. Deploy to Vercel
cd ../..
vercel --prod

# 7. Set env vars in Vercel (if not already set via Dashboard)
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CRON_SECRET production

# 8. Trigger a redeploy to pick up env vars
vercel --prod --force

# 9. Verify
curl https://<your-deployment>.vercel.app/api/tasks?projectId=<demo-project-id>
```

---

## 14. What to skip for the showcase

The following items from the full spec are **explicitly out of scope**. Do not implement them. If the user asks, note they are production-only features.

- Real Stripe checkout or subscription webhooks
- BullMQ / Inngest background job queues
- Redis or any in-memory cache
- AWS S3 (use Supabase Storage for any file uploads)
- GitHub commit-to-task sync
- Google Calendar `.ics` integration
- Multi-AZ Postgres / read replicas
- Rate limiting middleware (Supabase's built-in is sufficient for showcase traffic)
- Email notification service

---

## 15. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 on all API routes | `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel env | `vercel env add` + redeploy |
| RLS blocking reads | Policy missing for that table | Check `002_rls.sql` was applied |
| Realtime not firing | Channel name mismatch between hook and DB filter | Log `channel.subscribe()` status |
| `undefined` Supabase client | `VITE_` prefix missing on frontend env vars | Rename in `.env.local` |
| Cron not running | `CRON_SECRET` env var not set | Add to Vercel project env |
| Type errors after schema change | Stale `database.types.ts` | Re-run `supabase gen types` |
| Vite build fails on Vercel | Output dir mismatch | Set `apps/web/dist` as Vercel output dir in project settings |

---

## 16. Definition of done

The showcase deployment is complete when all of the following are true:

- [ ] `/` — Landing page loads, hero section visible, no console errors
- [ ] `/login` — Email login works, redirects to `/dashboard`
- [ ] `/dashboard` — Shows demo user's name, recent activity table populated from seed
- [ ] `/boards` — FlowBoard renders with all 4 columns, seed tasks visible
- [ ] Drag a task from `backlog` to `in_progress` — change persists after page refresh
- [ ] `/focus` — Timer starts and stops, session logged to DB, task `focus_count` increments
- [ ] `/analytics` — Stability heatmap renders (even if sparse), burnout chart visible
- [ ] `/billing` — Plan cards visible, upgrade click shows toast (not a real checkout)
- [ ] Open two browser tabs — task move in tab A reflects in tab B within 2 seconds (Realtime)
- [ ] Team presence avatars show at least one "available" dot
- [ ] Vercel deployment URL is publicly accessible without login for `/` and `/philosophy`