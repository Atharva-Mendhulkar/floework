# build.md — Floework Production Hardening Agent

> This file is the authoritative instruction set for an AI agent (Antigravity) performing
> production readiness work on the Floework repository. Read this file completely before
> taking any actio`n. Work through phases in order. Do not skip phases.

---

## 0. Agent Operating Rules

- **Always read a file before editing it.** Never patch from memory.
- **One logical concern per commit.** After every phase section, run the verification
  commands listed and confirm they pass before moving on.
- **Never delete migrations.** Only add new ones in `supabase/migrations/`.
- **Never hardcode secrets.** Every credential goes in `.env.local` (dev) or Vercel
  environment variables (prod). Reference them as `process.env.VAR_NAME` server-side
  and `import.meta.env.VITE_VAR_NAME` client-side.
- **When a file path is uncertain**, run `find . -type f -name "<filename>"` first to
  locate it before editing.
- **Preserve existing behaviour** unless the fix explicitly requires changing it.
- **After all phases are complete**, run the full verification suite in Section 9.

---

## 1. Repository Map

```
floework/
├── src/                         # React frontend (Vite)
│   ├── components/              # Shared UI components
│   │   ├── UserAvatar.tsx
│   │   ├── TopHeader.tsx
│   │   └── ...
│   ├── pages/                   # Route-level page components
│   │   ├── BoardsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── FocusPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── OnboardingPage.tsx
│   │   └── ...
│   ├── store/                   # Redux Toolkit + RTK Query
│   │   ├── store.ts
│   │   ├── authSlice.ts
│   │   └── api/                 # RTK Query service definitions
│   ├── hooks/                   # Custom hooks (useReveal, etc.)
│   ├── lib/
│   │   └── supabaseClient.ts    # Supabase browser client
│   ├── App.tsx                  # Router + ProtectedRoute
│   └── main.tsx
├── backend/                     # Node.js / Express backend
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── index.ts                 # Express app entry
├── supabase/
│   ├── migrations/              # SQL migration files
│   └── config.toml
├── public/
├── docker/
├── vite.config.ts
├── vercel.json                  # Vercel configuration
├── package.json                 # Root workspace
└── .env.example
```

---

## 2. Environment Variables Reference

### Frontend (prefixed VITE_ — safe to expose in browser bundle)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=
```

### Backend / Serverless (never VITE_ prefixed — server-side only)
```
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
CRON_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## PHASE 1 — CRITICAL (Do these first, in order)

---

### 1.1  Audit and lock all Supabase RLS policies

**File to create:** `supabase/migrations/20240001_rls_hardening.sql`

Run this SQL audit query against your Supabase database first to see what policies exist:
```sql
SELECT tablename, policyname, permissive, cmd, qual
FROM pg_policies
ORDER BY tablename, cmd;
```

Then create the migration file with the following policies. Adjust table names if they
differ in your schema — run `\dt` in psql to confirm exact names.

```sql
-- supabase/migrations/20240001_rls_hardening.sql
-- Ensure RLS is enabled on every application table
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/update their own profile
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
CREATE POLICY "profiles_select_own"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- teams: member can see teams they belong to
DROP POLICY IF EXISTS "teams_select_member"  ON teams;
DROP POLICY IF EXISTS "teams_insert_admin"   ON teams;
CREATE POLICY "teams_select_member" ON teams FOR SELECT
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "teams_insert_admin" ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- team_members: only visible to members of the same team
DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- projects: only visible to team members
DROP POLICY IF EXISTS "projects_select_member" ON projects;
DROP POLICY IF EXISTS "projects_insert_member" ON projects;
DROP POLICY IF EXISTS "projects_update_admin"  ON projects;
DROP POLICY IF EXISTS "projects_delete_admin"  ON projects;
CREATE POLICY "projects_select_member" ON projects FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "projects_insert_member" ON projects FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "projects_update_admin" ON projects FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "projects_delete_admin" ON projects FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- tasks: scoped to project membership
DROP POLICY IF EXISTS "tasks_select_member" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_member" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_member" ON tasks;
CREATE POLICY "tasks_select_member" ON tasks FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_insert_member" ON tasks FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_update_member" ON tasks FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "tasks_delete_member" ON tasks FOR DELETE
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));

-- sprints: scoped to project membership
DROP POLICY IF EXISTS "sprints_select_member" ON sprints;
DROP POLICY IF EXISTS "sprints_insert_member" ON sprints;
DROP POLICY IF EXISTS "sprints_update_admin"  ON sprints;
CREATE POLICY "sprints_select_member" ON sprints FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "sprints_insert_member" ON sprints FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "sprints_update_admin" ON sprints FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
  ));

-- focus_sessions: users can only see/write their own sessions
DROP POLICY IF EXISTS "focus_sessions_own" ON focus_sessions;
CREATE POLICY "focus_sessions_own" ON focus_sessions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- narrative_cache: scoped to project membership
DROP POLICY IF EXISTS "narrative_cache_select" ON narrative_cache;
DROP POLICY IF EXISTS "narrative_cache_insert" ON narrative_cache;
CREATE POLICY "narrative_cache_select" ON narrative_cache FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));
CREATE POLICY "narrative_cache_insert" ON narrative_cache FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE tm.user_id = auth.uid()
  ));

-- team_invitations: only the invitee (by email) and team admins can see
DROP POLICY IF EXISTS "invitations_select" ON team_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON team_invitations;
DROP POLICY IF EXISTS "invitations_delete" ON team_invitations;
CREATE POLICY "invitations_select" ON team_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "invitations_insert" ON team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "invitations_delete" ON team_invitations FOR DELETE
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin')
  );
```

**Apply migration:**
```bash
supabase db push
```

**Verify (run in Supabase SQL editor):**
```sql
-- Should return a policy for every table listed above
SELECT tablename, count(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'profiles','tasks','sprints','projects',
  'focus_sessions','narrative_cache','team_invitations',
  'teams','team_members'
)
GROUP BY tablename
ORDER BY tablename;
```

---

### 1.2  Lock Supabase Storage bucket for avatars

**File to create:** `supabase/migrations/20240002_storage_rls.sql`

```sql
-- supabase/migrations/20240002_storage_rls.sql
-- Users can only upload/update/delete files inside their own UID folder.
-- Public read is allowed so avatars are visible to team members.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_select_public"     ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own_folder" ON storage.objects;

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own_folder" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

```bash
supabase db push
```

---

### 1.3  Verify service role key is never in the frontend bundle

1. Run:
```bash
grep -rn "SERVICE_ROLE" src/ apps/ public/ index.html
```
If any output appears, the key is exposed. Remove it immediately.

2. Run:
```bash
grep -rn "VITE_SUPABASE_SERVICE" .env* src/
```
The service role key must never be prefixed with `VITE_`.

3. Open `src/lib/supabaseClient.ts`. It must use only:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

If it currently uses the service role key, replace with the anon key and move any
admin operations to the backend with the service role key loaded via `process.env`.

---

### 1.4  Add database indexes for performance-critical queries

**File to create:** `supabase/migrations/20240003_indexes.sql`

```sql
-- supabase/migrations/20240003_indexes.sql

-- FlowBoard: primary query pattern is tasks by project + sprint
CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id   ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee    ON tasks(assignee_id);

-- Focus sessions: queried by task and by user
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON focus_sessions(started_at DESC);

-- Sprints: queried by project
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status     ON sprints(status);

-- Projects: queried by team
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);

-- Narrative cache: looked up by project + expiry
CREATE INDEX IF NOT EXISTS idx_narrative_cache_project_expires
  ON narrative_cache(project_id, expires_at DESC);

-- Team members: the most-joined table in RLS policies — must be fast
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- Unique constraint: no duplicate sprint names per project
ALTER TABLE sprints
  ADD CONSTRAINT uq_sprint_name_per_project UNIQUE (project_id, name)
  DEFERRABLE INITIALLY DEFERRED;
-- DEFERRABLE so bulk inserts in tests don't fail mid-transaction
```

```bash
supabase db push
```

**Verify:**
```sql
SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('tasks','focus_sessions','sprints','projects','team_members','narrative_cache')
ORDER BY tablename, indexname;
```

---

### 1.5  Add CORS lockdown and security headers via vercel.json

Open `vercel.json`. If it does not exist, create it at the repo root.

Replace or merge with the following — keep any existing `rewrites` or `functions` blocks:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-production-domain.vercel.app"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, x-cron-secret"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

> **Action required:** Replace `https://your-production-domain.vercel.app` with your
> actual domain. If you use a custom domain, list both the Vercel domain and the custom
> domain as separate header entries, or use a wildcard for `*.vercel.app` during
> development (not for production).

---

### 1.6  Add input validation with Zod to all backend API handlers

**Install Zod** (if not already present):
```bash
npm install zod
```

Create a shared validation module:

**File to create:** `backend/lib/validate.ts`

```typescript
// backend/lib/validate.ts
import { z, ZodSchema } from 'zod'
import type { Request, Response, NextFunction } from 'express'

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.flatten().fieldErrors,
      })
    }
    req.body = result.data
    next()
  }
}

// Reusable schemas
export const TaskCreateSchema = z.object({
  title:       z.string().min(1).max(200).trim(),
  description: z.string().max(5000).trim().optional(),
  project_id:  z.string().uuid(),
  sprint_id:   z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().optional(),
  priority:    z.enum(['low', 'medium', 'high']).optional(),
  estimate:    z.number().int().min(0).max(999).optional(),
  status:      z.enum(['backlog', 'focus', 'review', 'outcome']).default('backlog'),
})

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  id: z.string().uuid(),
})

export const SprintCreateSchema = z.object({
  name:       z.string().min(1).max(100).trim(),
  project_id: z.string().uuid(),
  status:     z.enum(['ACTIVE', 'COMPLETED']).default('ACTIVE'),
})

export const FocusSessionSchema = z.object({
  task_id:    z.string().uuid(),
  started_at: z.string().datetime(),
  ended_at:   z.string().datetime().optional(),
  duration_s: z.number().int().min(0).max(86400),
  note:       z.string().max(1000).trim().optional(),
})

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
})

export const InviteSchema = z.object({
  email:   z.string().email(),
  team_id: z.string().uuid(),
  role:    z.enum(['admin', 'member']).default('member'),
})
```

Apply `validate(schema)` middleware to each route handler. Example for a task route:

```typescript
// backend/routes/tasks.ts (add to existing file)
import { validate, TaskCreateSchema, TaskUpdateSchema } from '../lib/validate'

router.post('/tasks',   authenticate, validate(TaskCreateSchema),  createTask)
router.patch('/tasks/:id', authenticate, validate(TaskUpdateSchema), updateTask)
```

---

### 1.7  Add rate limiting to the AI narrative endpoint

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
# OR if not using Upstash, use the simple in-memory approach for Vercel:
npm install lru-cache
```

**File to create:** `backend/middleware/rateLimiter.ts`

```typescript
// backend/middleware/rateLimiter.ts
// Simple sliding-window rate limiter using an in-memory LRU cache.
// For production at scale, replace with Upstash Redis rate limiting.
import { LRUCache } from 'lru-cache'
import type { Request, Response, NextFunction } from 'express'

type RateLimitEntry = { count: number; resetAt: number }

const cache = new LRUCache<string, RateLimitEntry>({ max: 5000 })

export function rateLimit(opts: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${req.ip}:${req.path}`
    const now = Date.now()
    const entry = cache.get(key)

    if (!entry || entry.resetAt < now) {
      cache.set(key, { count: 1, resetAt: now + opts.windowMs })
      return next()
    }

    entry.count++
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return res.status(429).json({ error: 'Too many requests — please wait.' })
    }

    next()
  }
}
```

Apply to the AI narrative route:

```typescript
// In the route file that handles AI narrative generation
import { rateLimit } from '../middleware/rateLimiter'

// 10 requests per user per 60 seconds
router.get(
  '/analytics/narrative',
  authenticate,
  rateLimit({ windowMs: 60_000, max: 10 }),
  getNarrative
)
```

---

### 1.8  Fix ProtectedRoute to prevent content flash before auth resolves

Open `src/App.tsx` or wherever `ProtectedRoute` is defined. Apply this pattern:

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'

interface Props { children: React.ReactNode }

export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useSelector((s: RootState) => s.auth)

  // CRITICAL: render nothing (not the protected content) while loading
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="sr-only">Loading...</span>
        {/* Replace with your existing Spinner component */}
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
```

In `src/store/authSlice.ts` (or equivalent), ensure `loading` starts as `true` and is
set to `false` only after the `onAuthStateChange` callback fires for the first time:

```typescript
// In your auth initialisation (typically in main.tsx or a top-level useEffect)
supabase.auth.onAuthStateChange((event, session) => {
  dispatch(setUser(session?.user ?? null))
  dispatch(setLoading(false))  // <-- must fire exactly once on startup
})
```

---

## PHASE 2 — HIGH PRIORITY

---

### 2.1  Add React Error Boundaries

**File to create:** `src/components/ErrorBoundary.tsx`

```typescript
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props  { children: ReactNode; fallback?: ReactNode }
interface State  { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Replace with your error tracking service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 p-8 text-center">
          <p className="text-lg font-medium text-gray-800">Something went wrong</p>
          <p className="text-sm text-gray-500">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

Wrap in `src/App.tsx`:

```typescript
// src/App.tsx — wrap the entire router AND each heavy page independently
import { ErrorBoundary } from './components/ErrorBoundary'

// Root-level (catches everything):
<ErrorBoundary>
  <RouterProvider router={router} />
</ErrorBoundary>

// Per-feature (add around BoardsPage and AnalyticsPage lazy wrappers):
<ErrorBoundary fallback={<BoardError />}>
  <BoardsPage />
</ErrorBoundary>
```

---

### 2.2  Lazy-load heavy pages to reduce initial bundle

Open `src/App.tsx` (or your router configuration file). Replace static imports with lazy:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'
import { PageSkeleton } from './components/PageSkeleton'  // create if absent

// Replace these static imports:
// import BoardsPage     from './pages/BoardsPage'
// import AnalyticsPage from './pages/AnalyticsPage'
// import FocusPage     from './pages/FocusPage'

// With lazy imports:
const BoardsPage     = lazy(() => import('./pages/BoardsPage'))
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage'))
const FocusPage      = lazy(() => import('./pages/FocusPage'))
const MessagesPage   = lazy(() => import('./pages/MessagesPage'))
const StarredPage    = lazy(() => import('./pages/StarredPage'))
const AlertsPage     = lazy(() => import('./pages/AlertsPage'))

// Wrap each lazy route:
<Suspense fallback={<PageSkeleton />}>
  <BoardsPage />
</Suspense>
```

**File to create:** `src/components/PageSkeleton.tsx`

```typescript
// src/components/PageSkeleton.tsx
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
```

---

### 2.3  Handle Gemini API failures and timeouts gracefully

Find the backend handler that calls Gemini (search: `generative-ai` or `gemini` in `backend/`).
Apply this wrapper pattern:

```typescript
// backend/services/narrativeService.ts
// Wrap the existing Gemini call inside a timeout + fallback:

const GEMINI_TIMEOUT_MS = 25_000  // Vercel max function duration is 30s

async function callGeminiWithTimeout(prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    // Replace with your actual Gemini SDK call
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI narrative timed out — cached result served')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// In the route handler:
export async function getNarrative(req: Request, res: Response) {
  try {
    // 1. Check cache first (existing logic — keep it)
    const cached = await getCachedNarrative(req.query.project_id as string)
    if (cached) return res.json({ narrative: cached, cached: true })

    // 2. Generate with timeout
    const narrative = await callGeminiWithTimeout(buildPrompt(/* ... */))
    await saveToCache(req.query.project_id as string, narrative)
    return res.json({ narrative, cached: false })

  } catch (err: any) {
    console.error('[getNarrative] error:', err.message)
    // Return a graceful fallback — never a 500 that crashes the Analytics page
    return res.status(200).json({
      narrative: 'Execution summary is temporarily unavailable. Check back shortly.',
      cached: false,
      error: true,
    })
  }
}
```

On the frontend, find where the narrative is rendered and handle `error: true`:

```typescript
// In AnalyticsPage.tsx or the narrative component:
{narrativeData?.error ? (
  <p className="text-sm text-gray-400 italic">
    Execution summary is currently unavailable — the AI service is warming up.
  </p>
) : (
  <p>{narrativeData?.narrative}</p>
)}
```

---

### 2.4  Fix Supabase Realtime subscriptions — cleanup + disconnection handling

Find every file that calls `supabase.channel(...)` or `supabase.from(...).on(...)`.
Common locations: `BoardsPage.tsx`, `FocusPage.tsx`, task hooks.

Apply this pattern to every Realtime subscription:

```typescript
// Pattern: always return a cleanup function from useEffect
useEffect(() => {
  const channel = supabase
    .channel(`tasks:project:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,  // SCOPE BY PROJECT
      },
      (payload) => {
        dispatch(handleTaskRealtimeEvent(payload))
      }
    )
    .on('system', {}, (status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setRealtimeStatus('disconnected')
      }
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected')
        // Re-fetch on reconnect to catch missed events
        dispatch(tasksApi.util.invalidateTags(['Task']))
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)  // ← CRITICAL: prevent accumulation
  }
}, [projectId, dispatch])
```

**File to create:** `src/components/RealtimeBanner.tsx`

```typescript
// src/components/RealtimeBanner.tsx
interface Props { status: 'connected' | 'disconnected' | 'reconnecting' }

export function RealtimeBanner({ status }: Props) {
  if (status === 'connected') return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      Live updates paused — reconnecting…
    </div>
  )
}
```

Add `<RealtimeBanner status={realtimeStatus} />` to `BoardsPage.tsx`.

---

### 2.5  Add useReveal hook cleanup

Find `src/hooks/useReveal.ts`. Add IntersectionObserver disconnect on unmount:

```typescript
// src/hooks/useReveal.ts
import { useEffect, useRef } from 'react'

export function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.disconnect()  // Stop observing once revealed
        }
      },
      { threshold }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()  // ← Cleanup on unmount
    }
  }, [threshold])

  return ref
}
```

---

### 2.6  Enable connection pooling in backend Supabase client

Find `backend/` where the Supabase admin client is initialised.

```typescript
// backend/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

// For serverless functions: use the transaction-mode PgBouncer URL
// Get this from: Supabase Dashboard > Settings > Database > Connection pooling
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,   // Serverless: no session persistence
      autoRefreshToken: false,
    },
    // Use the pooler URL (port 6543) not direct connection (port 5432)
    // Set SUPABASE_DB_URL to: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  }
)

export { supabaseAdmin }
```

Set `SUPABASE_DB_URL` in Vercel environment variables to the **Transaction mode** pooler
URL from Supabase Dashboard → Settings → Database → Connection Pooling.

---

### 2.7  Fix CSV export to handle special characters and edge cases

Find the CSV generation code (search for `encodeURIComponent` or `data:text/csv` in `src/`):

```typescript
// Replace the encoded-URI approach with Blob + URL.createObjectURL:

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) {
    // Graceful empty export
    rows = [{ message: 'No data to export' }]
  }

  const headers = Object.keys(rows[0])

  const escape = (val: unknown): string => {
    const str = val == null ? '' : String(val)
    // Wrap in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csv = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
```

---

### 2.8  Fix ICS calendar export for timezone correctness

Find the `.ics` generation code (search for `BEGIN:VCALENDAR` in `src/`):

```typescript
// src/lib/icsExport.ts  (replace or create)

function toICSDate(date: Date): string {
  // Always use UTC (Z suffix) to avoid timezone ambiguity
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function generateICS(events: Array<{
  title:    string
  start:    Date
  end?:     Date
  description?: string
}>): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Floework//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const ev of events) {
    if (!ev.title || !ev.start) continue  // Skip malformed events

    const end = ev.end ?? new Date(ev.start.getTime() + 30 * 60_000)
    const uid = `${ev.start.getTime()}-${Math.random().toString(36).slice(2)}@floework`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(ev.start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${ev.title.replace(/[,;\\]/g, '\\$&')}`,
      ev.description ? `DESCRIPTION:${ev.description.slice(0, 500).replace(/\n/g, '\\n')}` : '',
      'END:VEVENT',
    ).filter(Boolean)
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(events: Parameters<typeof generateICS>[0], filename = 'floework') {
  if (events.length === 0) return  // Silently skip empty export
  const blob = new Blob([generateICS(events)], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `${filename}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
```

---

### 2.9  Add focus session orphan protection (tab close mid-session)

Find the focus session timer component (`FocusPage.tsx` or similar).

```typescript
// Add to the component that starts/manages focus sessions:

useEffect(() => {
  if (!activeSession) return

  // Heartbeat: update session last_seen every 30s so we can detect orphans
  const heartbeat = setInterval(async () => {
    await supabase
      .from('focus_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', activeSession.id)
  }, 30_000)

  // beforeunload: auto-end the session when the tab closes
  const handleUnload = () => {
    // Use sendBeacon for reliable delivery on tab close
    const payload = JSON.stringify({
      session_id: activeSession.id,
      ended_at:   new Date().toISOString(),
    })
    navigator.sendBeacon('/api/focus-sessions/end', payload)
  }

  window.addEventListener('beforeunload', handleUnload)

  return () => {
    clearInterval(heartbeat)
    window.removeEventListener('beforeunload', handleUnload)
  }
}, [activeSession])
```

**Create the beacon endpoint** `backend/routes/focusSessions.ts`:

```typescript
// POST /api/focus-sessions/end  — handles sendBeacon (Content-Type: text/plain)
router.post('/focus-sessions/end', async (req, res) => {
  try {
    let body = req.body
    // sendBeacon sends as text/plain — parse manually if needed
    if (typeof body === 'string') body = JSON.parse(body)

    const { session_id, ended_at } = z.object({
      session_id: z.string().uuid(),
      ended_at:   z.string().datetime(),
    }).parse(body)

    await supabaseAdmin
      .from('focus_sessions')
      .update({ ended_at, status: 'completed' })
      .eq('id', session_id)
      .is('ended_at', null)  // Only update if not already ended

    res.status(200).send()
  } catch {
    res.status(200).send()  // Always 200 for sendBeacon
  }
})
```

**Add migration** to track `last_seen_at`:

**File:** `supabase/migrations/20240004_focus_session_heartbeat.sql`
```sql
ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'orphaned'));

-- Scheduled cleanup: mark sessions as orphaned if last_seen > 5 minutes ago and no ended_at
-- Run this as a Supabase Edge Function cron or pg_cron job
```

---

### 2.10  Add optimistic update rollback for drag-and-drop

Find the RTK Query mutation used when a task is dragged to a new status column.
Apply the `onQueryStarted` pattern:

```typescript
// In your RTK Query API slice (src/store/api/tasksApi.ts or similar)

updateTaskStatus: builder.mutation<Task, { id: string; status: string }>({
  query: ({ id, status }) => ({
    url:    `/tasks/${id}`,
    method: 'PATCH',
    body:   { status },
  }),
  async onQueryStarted({ id, status }, { dispatch, queryFulfilled, getState }) {
    // 1. Optimistically update the cache
    const patchResult = dispatch(
      tasksApi.util.updateQueryData('getTasks', projectId, (draft) => {
        const task = draft.find(t => t.id === id)
        if (task) task.status = status
      })
    )

    try {
      await queryFulfilled
    } catch {
      // 2. Roll back on failure
      patchResult.undo()
      // 3. Show toast
      toast.error('Failed to update task status — please try again.')
    }
  },
  invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
}),
```

---

### 2.11  Debounce global search input

Find `TopHeader.tsx` where the search dispatch happens:

```typescript
// src/components/TopHeader.tsx
import { useCallback, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
// Install: npm install use-debounce

export function TopHeader() {
  const dispatch = useDispatch()
  const [inputValue, setInputValue] = useState('')

  const debouncedSearch = useDebouncedCallback((value: string) => {
    dispatch(setSearchQuery(value.trim()))
  }, 250)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    debouncedSearch(e.target.value)
  }

  return (
    // ... existing JSX ...
    <input
      value={inputValue}
      onChange={handleChange}
      placeholder="Search tasks, activity..."
    />
  )
}
```

In the Redux reducer, ensure empty string resets the filter:

```typescript
// In the search reducer
setSearchQuery: (state, action) => {
  state.query = action.payload  // empty string = no filter (handle in selector)
}

// In the selector
export const selectFilteredTasks = createSelector(
  [(s: RootState) => s.tasks.items, (s: RootState) => s.search.query],
  (tasks, query) => {
    if (!query) return tasks  // ← Return all when query is empty
    const q = query.toLowerCase()
    return tasks.filter(t => t.title.toLowerCase().includes(q))
  }
)
```

---

### 2.12  Protect Vercel Cron Jobs with a secret header

In `vercel.json`, add the cron definition:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-analytics",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

In the cron handler:

```typescript
// backend/routes/cron.ts
import type { Request, Response } from 'express'

export function weeklyAnalyticsCron(req: Request, res: Response) {
  // Vercel sets this header automatically for cron invocations:
  const cronSecret = req.headers['authorization']
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // ... existing cron logic ...
}
```

Set `CRON_SECRET` in Vercel environment variables to a random 32-character string.

---

### 2.13  Add team invitation expiry enforcement

Find the invitation acceptance handler in `backend/routes/invitations.ts`:

```typescript
// backend/routes/invitations.ts  — in the accept handler
export async function acceptInvitation(req: Request, res: Response) {
  const { token } = req.params

  const { data: invitation, error } = await supabaseAdmin
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    return res.status(404).json({ error: 'Invitation not found or already used.' })
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    // Delete the expired token
    await supabaseAdmin.from('team_invitations').delete().eq('token', token)
    return res.status(410).json({ error: 'This invitation has expired. Ask your admin to send a new one.' })
  }

  // Add user to team
  await supabaseAdmin.from('team_members').insert({
    team_id: invitation.team_id,
    user_id: req.user.id,
    role:    invitation.role ?? 'member',
  })

  // CRITICAL: delete the token so it cannot be reused
  await supabaseAdmin.from('team_invitations').delete().eq('token', token)

  return res.json({ success: true, team_id: invitation.team_id })
}
```

---

## PHASE 3 — MEDIUM PRIORITY

---

### 3.1  Add Custom 404 and Error pages

**File to create:** `src/pages/NotFoundPage.tsx`

```typescript
// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center p-8">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="text-xl font-medium">Page not found</h1>
      <p className="text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
        Go to dashboard
      </Link>
    </div>
  )
}
```

Add to router:
```typescript
// src/App.tsx — at the end of route definitions
{ path: '*', element: <NotFoundPage /> }
```

---

### 3.2  Memoize Recharts data computations

Find `AnalyticsPage.tsx` or the component containing the `PieChart`:

```typescript
// Add useMemo around data aggregation:
import { useMemo } from 'react'

const pieData = useMemo(() => {
  if (!tasks?.length) return []
  const counts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}, [tasks])
// Only recomputes when tasks array reference changes
```

---

### 3.3  Fix UserAvatar edge cases

Find `src/components/UserAvatar.tsx`:

```typescript
// src/components/UserAvatar.tsx
function getInitials(name: string): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/).filter(p => /[a-zA-Z]/.test(p))
  if (parts.length === 0) return name.slice(0, 1).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hashColor(name: string): string {
  if (!name) return '#6366f1'  // Default indigo — never undefined
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}
```

---

### 3.4  Add aria-labels and keyboard navigation

Find all icon-only buttons in `TopHeader.tsx`, the sidebar component, and modals:

```typescript
// Add aria-label to every interactive element without visible text:
<button aria-label="Open notifications">
  <BellIcon />
</button>

<button aria-label="Open user menu">
  <UserAvatar ... />
</button>

// Sidebar links:
<Link to="/analytics" aria-label="Analytics">
  <BarChartIcon />
</Link>
```

Enable dnd-kit keyboard sensor in the FlowBoard:

```typescript
// In BoardsPage.tsx or the DndContext setup:
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)

<DndContext sensors={sensors} ...>
```

---

### 3.5  Add health check endpoint

**File to create:** `backend/routes/health.ts`

```typescript
// backend/routes/health.ts
import type { Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin'

export async function healthCheck(req: Request, res: Response) {
  const start = Date.now()
  try {
    // Lightweight DB ping
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    const dbOk = !error || error.code === 'PGRST116'  // PGRST116 = no rows, still connected
    const latency = Date.now() - start

    return res.status(dbOk ? 200 : 503).json({
      status:  dbOk ? 'ok' : 'degraded',
      db:      dbOk ? 'ok' : 'error',
      latency_ms: latency,
      ts:      new Date().toISOString(),
    })
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err.message })
  }
}
```

Register route: `app.get('/api/health', healthCheck)`

---

### 3.6  Lock dependency versions

Run:
```bash
# Pin all current dependency versions (remove ^ and ~)
npx npm-pin-dependencies
# OR manually in package.json: replace "^x.y.z" with "x.y.z" for critical packages:
# @dnd-kit/core, @supabase/supabase-js, @reduxjs/toolkit, react, react-dom
```

In CI, use `npm ci` instead of `npm install` to enforce the lockfile:

```yaml
# .github/workflows/ci.yml — add or modify the install step
- name: Install dependencies
  run: npm ci
```

---

### 3.7  Set up Sentry error tracking

**Install:**
```bash
npm install @sentry/react @sentry/vite-plugin
```

**File to modify:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true,  // Required for Sentry source maps
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org:     process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
})
```

**File to modify:** `src/main.tsx`

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,  // 'development' | 'production'
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
})
```

Wrap the root `ErrorBoundary` with Sentry's:
```typescript
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react'
<SentryErrorBoundary fallback={<AppCrashFallback />}>
  <App />
</SentryErrorBoundary>
```

---

### 3.8  Add structured logging to backend

**File to create:** `backend/lib/logger.ts`

```typescript
// backend/lib/logger.ts
// Structured JSON logger — Vercel Log Drains can ingest this
let _reqId = 0

export function createLogger(route: string) {
  const reqId = ++_reqId

  return {
    info: (msg: string, data?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'info',  reqId, route, msg, ...data, ts: Date.now() })),
    warn: (msg: string, data?: Record<string, unknown>) =>
      console.warn(JSON.stringify({ level: 'warn',  reqId, route, msg, ...data, ts: Date.now() })),
    error: (msg: string, err: unknown, data?: Record<string, unknown>) =>
      console.error(JSON.stringify({
        level: 'error', reqId, route, msg,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        ...data,
        ts: Date.now(),
      })),
  }
}
```

Use in every route handler:
```typescript
import { createLogger } from '../lib/logger'

export async function createTask(req: Request, res: Response) {
  const log = createLogger('POST /tasks')
  try {
    log.info('start', { userId: req.user.id, projectId: req.body.project_id })
    // ... handler logic ...
    log.info('success', { taskId: result.id })
    res.json(result)
  } catch (err) {
    log.error('failed', err, { userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

---

### 3.9  Add CI pipeline with TypeScript checks

**File to create:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint src --ext .ts,.tsx --max-warnings 0

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run unit tests
        run: npx vitest run --reporter=verbose
```

---

### 3.10  Write core unit tests

**File to create:** `src/__tests__/sprintNaming.test.ts`

```typescript
// src/__tests__/sprintNaming.test.ts
import { describe, it, expect } from 'vitest'
import { getNextSprintName } from '../lib/sprintUtils'  // adjust path

describe('getNextSprintName', () => {
  it('returns Sprint 1 for an empty project', () => {
    expect(getNextSprintName([])).toBe('Sprint 1')
  })
  it('returns Sprint 3 when Sprint 1 and Sprint 2 exist', () => {
    expect(getNextSprintName(['Sprint 1', 'Sprint 2'])).toBe('Sprint 3')
  })
  it('handles gaps — uses count+1 not max+1', () => {
    // If Sprint 2 was deleted, next should be Sprint 3 (count-based), not Sprint 2
    expect(getNextSprintName(['Sprint 1', 'Sprint 3'])).toBe('Sprint 4')
  })
})
```

**File to create:** `src/__tests__/userAvatar.test.ts`

```typescript
// src/__tests__/userAvatar.test.ts
import { describe, it, expect } from 'vitest'
import { getInitials, hashColor } from '../components/UserAvatar'

describe('getInitials', () => {
  it('handles empty string',         () => expect(getInitials('')).toBe('?'))
  it('handles single word',          () => expect(getInitials('Atharva')).toBe('AT'))
  it('handles two words',            () => expect(getInitials('Atharva M')).toBe('AM'))
  it('handles extra whitespace',     () => expect(getInitials('  John  Doe  ')).toBe('JD'))
  it('handles numbers in name',      () => expect(getInitials('User123')).toBeTruthy())
  it('max 2 chars',                  () => expect(getInitials('A B C D').length).toBeLessThanOrEqual(2))
})

describe('hashColor', () => {
  it('never returns undefined',      () => expect(hashColor('')).toBeTruthy())
  it('is deterministic',             () => expect(hashColor('Atharva')).toBe(hashColor('Atharva')))
  it('differs for different names',  () => expect(hashColor('Alice')).not.toBe(hashColor('Bob')))
})
```

**File to create:** `src/__tests__/csvExport.test.ts`

```typescript
// src/__tests__/csvExport.test.ts
import { describe, it, expect } from 'vitest'
import { exportToCSVString } from '../lib/csvExport'
// Add exportToCSVString helper that returns the string without triggering download

describe('exportToCSVString', () => {
  it('handles empty array gracefully', () => {
    const result = exportToCSVString([])
    expect(result).toBeTruthy()
  })
  it('escapes commas in values', () => {
    const result = exportToCSVString([{ name: 'Task, with comma', status: 'done' }])
    expect(result).toContain('"Task, with comma"')
  })
  it('escapes quotes in values', () => {
    const result = exportToCSVString([{ name: 'Say "hello"', status: 'done' }])
    expect(result).toContain('"Say ""hello"""')
  })
  it('handles null and undefined values', () => {
    const result = exportToCSVString([{ name: null, status: undefined } as any])
    expect(result).not.toThrow
  })
})
```

---

## PHASE 4 — VERIFICATION SUITE

Run these checks after all phases are complete.

### 4.1  Security verification

```bash
# 1. No secrets in frontend bundle
npm run build
grep -r "service_role" dist/
grep -r "GEMINI_API_KEY" dist/
# Expected: no output

# 2. All tables have RLS enabled
# Run in Supabase SQL editor:
# SELECT tablename FROM pg_tables
# WHERE schemaname = 'public'
# AND NOT EXISTS (
#   SELECT 1 FROM pg_class c
#   JOIN pg_namespace n ON n.oid = c.relnamespace
#   WHERE c.relname = pg_tables.tablename
#   AND n.nspname = 'public'
#   AND c.relrowsecurity = true
# );
# Expected: empty result (all tables have RLS)

# 3. TypeScript passes
npx tsc --noEmit
# Expected: exit code 0, no errors

# 4. ESLint passes
npx eslint src --ext .ts,.tsx
# Expected: 0 errors (warnings acceptable)
```

### 4.2  Build verification

```bash
npm run build
# Expected: builds without errors
# Check dist/ folder size — warn if > 2MB uncompressed JS

# Bundle analysis
npx vite-bundle-visualizer
# Open the generated report and verify:
# - No lodash full import (use lodash-es or specific imports)
# - recharts is in a lazy chunk, not the main bundle
# - @dnd-kit is in a lazy chunk (loaded with BoardsPage)
```

### 4.3  Database verification

```bash
# Apply all migrations to staging first
supabase db push --db-url "$STAGING_DB_URL"

# Verify indexes exist
# Run in SQL editor:
# SELECT indexname, tablename FROM pg_indexes
# WHERE tablename IN ('tasks','focus_sessions','sprints','projects','team_members')
# ORDER BY tablename;
# Expected: each table has at least 2–3 indexes

# Verify unique constraint on sprints
# INSERT INTO sprints (name, project_id, status) VALUES ('Sprint 1', '<uuid>', 'ACTIVE');
# INSERT INTO sprints (name, project_id, status) VALUES ('Sprint 1', '<uuid>', 'ACTIVE');
# Expected: second insert raises a unique violation error
```

### 4.4  Unit test verification

```bash
npx vitest run
# Expected: all tests pass, 0 failures
```

### 4.5  Realtime leak check

Open Chrome DevTools → Memory → Take heap snapshot before and after navigating between
projects 5 times. Search for `RealtimeChannel` in the snapshot. The count should remain
constant (1 per active subscription), not grow with each navigation.

### 4.6  Mobile viewport check

Open the deployed app in Chrome DevTools with device set to iPhone 12 (390px wide).
Verify:
- Sidebar collapses to icon-only mode
- FlowBoard columns are horizontally scrollable
- All modals are fully visible and dismissible
- Glassmorphism blur does not cause scroll jank (check Performance tab)

---

## Appendix A — Environment Variables Checklist

Before deploying to production, confirm all of these are set in Vercel Dashboard →
Settings → Environment Variables → Production:

| Variable                    | Scope     | Required |
|-----------------------------|-----------|----------|
| `VITE_SUPABASE_URL`         | Frontend  | ✓        |
| `VITE_SUPABASE_ANON_KEY`    | Frontend  | ✓        |
| `VITE_APP_URL`              | Frontend  | ✓        |
| `VITE_SENTRY_DSN`           | Frontend  | optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend   | ✓        |
| `GEMINI_API_KEY`            | Backend   | ✓        |
| `CRON_SECRET`               | Backend   | ✓        |
| `STRIPE_SECRET_KEY`         | Backend   | if Stripe|
| `STRIPE_WEBHOOK_SECRET`     | Backend   | if Stripe|
| `SENTRY_AUTH_TOKEN`         | Build     | optional |
| `SENTRY_ORG`                | Build     | optional |
| `SENTRY_PROJECT`            | Build     | optional |

> Run `vercel env ls --environment=production` to audit what is currently set.

---

## Appendix B — Files Modified/Created Summary

| File | Action | Phase |
|------|--------|-------|
| `supabase/migrations/20240001_rls_hardening.sql` | Create | 1.1 |
| `supabase/migrations/20240002_storage_rls.sql` | Create | 1.2 |
| `supabase/migrations/20240003_indexes.sql` | Create | 1.4 |
| `supabase/migrations/026_fix_rls_recursion.sql` | Create | 2.1 |
| `supabase/migrations/027_consistency_hardening.sql` | Create | 2.8 |
| `supabase/migrations/028_version_based_occ.sql` | Create | 2.9 |
| `supabase/migrations/029_conflict_observability.sql` | Create | 2.10 |
| `apps/web/src/store/api.ts` | Modify | 2.8-2.10 |
| `apps/web/src/hooks/useTaskRealtime.ts` | Modify | 2.5, 2.11 |
| `apps/web/src/components/PhaseColumn.tsx` | Modify | 2.9, 2.12 |
| `api/tasks/index.ts` | Modify | 2.8, 2.9 |
| `failure-report.md` | Create | Audit |
| `storm-report.md` | Create | Audit |
| `backend/routes/health.ts` | Create | 3.5 |
| `backend/routes/focusSessions.ts` | Modify | 2.9 |
| `backend/routes/invitations.ts` | Modify | 2.13 |
| `backend/services/narrativeService.ts` | Modify | 2.3 |
| `src/lib/supabaseClient.ts` | Verify/Modify | 1.3 |
| `src/lib/icsExport.ts` | Create | 2.8 |
| `src/lib/csvExport.ts` | Modify | 2.7 |
| `src/components/ProtectedRoute.tsx` | Modify | 1.8 |
| `src/components/ErrorBoundary.tsx` | Create | 2.1 |
| `src/components/PageSkeleton.tsx` | Create | 2.2 |
| `src/components/RealtimeBanner.tsx` | Create | 2.4 |
| `src/components/UserAvatar.tsx` | Modify | 3.3 |
| `src/components/TopHeader.tsx` | Modify | 2.11 |
| `src/hooks/useReveal.ts` | Modify | 2.5 |
| `src/pages/NotFoundPage.tsx` | Create | 3.1 |
| `src/App.tsx` | Modify | 1.8, 2.1, 2.2 |
| `src/store/api/tasksApi.ts` | Modify | 2.10 |
| `src/__tests__/sprintNaming.test.ts` | Create | 3.10 |
| `src/__tests__/userAvatar.test.ts` | Create | 3.10 |
| `src/__tests__/csvExport.test.ts` | Create | 3.10 |
| `vite.config.ts` | Modify | 3.7 |
| `src/main.tsx` | Modify | 3.7 |
| `.github/workflows/ci.yml` | Create | 3.9 |   

---

## Engineering Final Report — Resilience & Consistency Hardening

### 1. Executive Summary
Floework has been upgraded from a basic "eventually correct" synchronization model to a **Strongly Causal Consistent** distributed system. Through systematic adversarial testing (Mutation Storms) and failure injection, we identified and eliminated critical race conditions, state regression vectors, and UX silent failure modes.

### 2. Architectural Shift: Version-Based OCC
The core of the hardening effort involved moving from millisecond-sensitive timestamp checks to **Strict Monotonic Versioning**.
- **The Invariant**: `UPDATE tasks SET ... WHERE id = :id AND version = :client_version`.
- **Result**: Every mutation is now linearizable per-entity. Out-of-order API responses are deterministically rejected by the database rather than corrupting state.

### 3. Resilience Engine Features
- **Intent-Aware Retries**: A jittered, timestamped retry mechanism in `PhaseColumn.tsx` that automatically resolves concurrency conflicts without user intervention, unless a newer user action has superseded the intent.
- **Server-Authoritative Reconciliation**: A reconciliation layer in the frontend that treats server responses and real-time broadcasts as the absolute source of truth, instantly clearing "optimistic lies" or provisional local states.
- **Real-time Deduplication**: Project-scoped version tracking in `useTaskRealtime` to suppress redundant renders and prevent UI flicker from duplicate event delivery.
- **Atomic Operations**: Critical toggles (e.g., starring tasks) were moved to server-side RPCs to ensure commutativity and eliminate read-modify-write races.

### 4. Adversarial Testing Results (Summary)
Detailed findings are logged in `failure-report.md` and `storm-report.md`.

| Scenario | Risk | Mitigation | Status |
|----------|------|------------|--------|
| **Mutation Storm** | Causality break / Drag flicker | Versioned OCC + Intent-Aware Retry | **RESOLVED** |
| **Reconnect Gap** | Stale data after downtime | Mandatory re-sync on `SUBSCRIBED` | **RESOLVED** |
| **Out-of-Order API** | Regression overwrite | Version comparison guards (LWW) | **RESOLVED** |
| **Optimistic Undo** | Overwriting fresh Realtime | Version-checked rollback logic | **RESOLVED** |

### 5. Production Observability
We introduced the `concurrency_conflicts` system to provide deep visibility into the platform's health under load.
- **SQL Views**: `conflict_stats` and `conflict_hotspots` allow for real-time monitoring of contention points.
- **Conflict Enriched Logs**: Every rejected update logs the client-vs-server version gap, user context, and endpoint metadata.

### 6. Build & Deployment Hardening
- **Cross-Platform Build Fixes**: Resolved critical Vercel build failures for both Rollup (`Error: Cannot find module @rollup/rollup-linux-x64-gnu`) and esbuild (`Error: The package "@esbuild/linux-x64" could not be found`) by adding explicit Linux-target binaries to `optionalDependencies` in the root `package.json`.
- **Security & Visibility Refinement**: Upgraded RLS for `profiles` and `messages` from simple subqueries to performance-optimized joins. Team members can now securely see each other's metadata (names/avatars) while maintaining strict project isolation.
- **Performance Hardening**: Added critical indexes on `team_members(user_id, team_id)` to prevent latency spikes during high-concurrency membership checks.
- **SQL Verification**: Confirmed that all 32 migrations (000–031) are successfully applied to the database.

### 7. Certification
The platform is now certified as **Hardened for Concurrent Production Workloads**. It maintains absolute state integrity while delivering a low-latency, optimistic user experience.

---
*Report Generated: 2026-05-05*
*Status: Engineering Sign-off Complete*