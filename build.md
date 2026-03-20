# FLOEWORK — AGENT BUILD SPECIFICATION

> **READ THIS FIRST.** This file is the single source of truth. Work top to bottom. Never build UI before the API contract exists. Never build an API before the schema migration is committed. When a constraint in `§1` conflicts with a "simpler" approach, the constraint wins.

---

## TABLE OF CONTENTS

- [§1 — Constraints & Rules](#1-constraints--rules)
- [§2 — Existing Stack Reference](#2-existing-stack-reference)
- [§3 — Feature 1: Context-Switch Audit](#3-feature-1-context-switch-audit)
- [§4 — Feature 2: Estimation Memory Engine](#4-feature-2-estimation-memory-engine)
- [§5 — Feature 3: PR Wait-Time Blocker Signal](#5-feature-3-pr-wait-time-blocker-signal)
- [§6 — Feature 4: Deep Work Window Recommender](#6-feature-4-deep-work-window-recommender)
- [§7 — Feature 5: Effort Narrative](#7-feature-5-effort-narrative)
- [§8 — Feature 6: AI Time Displacement Tracker](#8-feature-6-ai-time-displacement-tracker)
- [§9 — Onboarding: Day-One Activation Loop](#9-onboarding-day-one-activation-loop)
- [§10 — Privacy Architecture](#10-privacy-architecture)
- [§11 — Master Test Checklist](#11-master-test-checklist)

---

## §1 — CONSTRAINTS & RULES

> These are hard rules. Treat violations as compile errors.

### 1.1 Order of Operations (per feature)
```
schema migration → backend service → BullMQ worker (if async) → API endpoint → frontend component → tests
```
Never invert this order.

### 1.2 The Core Design Rule
Every feature must surface a **conclusion**, not raw data. If a component displays a table or chart the user must interpret themselves, stop and compute the conclusion server-side first. The component renders the conclusion.

### 1.3 Privacy Rules (architectural, not UI)

| Data | Default Visibility | Team Can See? |
|---|---|---|
| Focus session duration | Private — owner only | No |
| Interruption count | Private — owner only | No |
| After-hours activity | Private — owner only | No |
| Burnout trend score | Private — owner only | No |
| Estimation history | Private — owner only | Aggregate % only, opt-in |
| Effort narrative | Private — owner only | Via explicit share link |
| Task stall flag | Team-visible | Yes — it is task state |
| Blocker flag | Team-visible | Yes — it is task state |

**Implementation rule:** All analytics endpoints use `req.user.id` injected by middleware. Never accept a `userId` query param from the client.

### 1.4 Zero Manual Logging
Every data point must derive from actions the user already does: starting a session, moving a task, pushing a PR. If a feature requires extra tagging/logging beyond those gestures, redesign it.

**Exception:** The AI-assisted toggle (§8) is the only acceptable manual tag — it is a single pre-session toggle, not ongoing logging.

### 1.5 Tech Stack Constraints
- **Frontend:** React + Vite. Use existing `shadcn-ui` components. Do not add a new component library.
- **State:** Redux Toolkit + RTK Query. Extend existing slices — do not create parallel state systems.
- **Backend:** Express.js + TypeScript. All routes: `auth → RBAC → validation → controller`.
- **ORM:** Prisma. All schema changes = `.prisma` migration files. Never apply raw SQL manually.
- **Async:** BullMQ. Any computation >200ms = background job, not a synchronous response.
- **Realtime:** Socket.io. Use the existing event bus. Do not create a second WebSocket connection.
- **Testing:** Vitest + Supertest. Every new controller needs ≥1 integration test. Every new React component needs ≥1 DOM assertion test.

### 1.6 Encrypted Fields
Use `AES-256-GCM`. Implement once in `src/utils/crypto.ts`, reuse everywhere.

```typescript
// src/utils/crypto.ts — implement this utility first, before any feature that needs it
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32-byte hex key

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

Encrypt before storing: `GitHubConnection.accessToken`, `GoogleCalendarConnection.accessToken`, `GoogleCalendarConnection.refreshToken`.

### 1.7 Required .env additions
Add these to `.env.example` (never hardcode values):
```
ENCRYPTION_KEY=          # 32-byte hex string
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
GOOGLE_CALLBACK_URL=
```

---

## §2 — EXISTING STACK REFERENCE

> Do not rebuild what exists. Extend only.

### 2.1 Existing Prisma Models
```prisma
User              { id, email, name, teamId, role }
Team              { id, name, ownerId }
Project           { id, name, teamId }
Sprint            { id, name, projectId, startDate, endDate }
Task              { id, title, status, assigneeId, sprintId, effort, phase, priority, focusCount }
FocusSession      { id, taskId, userId, duration, interrupts, startTime, endTime, note }
ExecutionEvent    { id, taskId, userId, eventType, payload, createdAt }
FocusStabilitySlot{ id, userId, dayOfWeek, hourOfDay, score, weekLabel }
```

### 2.2 Existing API Routes
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /tasks
POST   /tasks
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /focus/start
POST   /focus/stop
GET    /analytics/burnout
GET    /analytics/stability
GET    /analytics/narrative
GET    /analytics/bottlenecks
POST   /teams/invite
POST   /teams/join
POST   /billing/checkout
POST   /billing/portal
POST   /billing/webhook
```

### 2.3 Existing BullMQ Workers
```
bottleneck-scorer    — nightly, composite bottleneck scores on tasks
stability-roller     — computes FocusStabilitySlot rollups from raw FocusSessions
```

### 2.4 Existing Socket.io Events
```
task:updated         — broadcast task state change to sprint room
focus:started        — broadcast presence
focus:stopped        — broadcast presence
sprint:updated       — broadcast sprint rename
```

---

## §3 — FEATURE 1: CONTEXT-SWITCH AUDIT

**Purpose:** A private weekly card telling the engineer their uninterrupted deep-work hours, vs their personal best, with the one reason their week was fragmented. No charts. Plain language. One card.

---

### 3.1 Schema Changes

```prisma
// Add to schema.prisma

model WeeklyFocusReport {
  id             String   @id @default(cuid())
  userId         String
  weekLabel      String   // 'YYYY-WW'
  deepFocusHours Float    // sessions >= 25 min, interrupts <= 2
  sessionCount   Int
  avgSessionMins Float
  topFragmentor  String?  // plain-English cause, generated by worker
  bestWeekHours  Float?   // rolling 4-week personal best
  generatedAt    DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
  @@unique([userId, weekLabel])
}

// Add to User model:
weeklyReportEnabled Boolean @default(true)
```

```bash
npx prisma migrate dev --name add_weekly_focus_report
```

---

### 3.2 BullMQ Worker

**File:** `src/workers/weeklyFocusAuditor.ts`
**Schedule:** Every Monday 06:00 UTC
**Queue name:** `weekly-focus-auditor`

**Algorithm:**
```
1. SELECT all users WHERE weeklyReportEnabled = true
2. For each user:
   a. Pull FocusSessions for past 7 days (Mon–Sun)
   b. Filter deepSessions: duration >= 25 AND interrupts <= 2
   c. deepFocusHours = sum(deepSessions.duration) / 60
   d. Pull past 4 WeeklyFocusReport records for this user
   e. bestWeekHours = max(past 4 records' deepFocusHours, current)
   f. topFragmentor:
      - Group sessions by day
      - Score each day: (interrupts / duration) ratio
      - Worst day = highest ratio
      - Template: "{DayName} {timeOfDay} broke your longest focus blocks"
      - timeOfDay: "morning" if avgHour < 12, "afternoon" if < 18, "evening" otherwise
   g. UPSERT WeeklyFocusReport for weekLabel = current ISO week
```

---

### 3.3 API Endpoints

```typescript
// GET /analytics/focus-report
// Auth required. enforceDataOwnership middleware applied.
// Returns: most recent WeeklyFocusReport for req.user.id
// If no current-week report: return most recent + flag { isLastWeek: true }
// RTK Query cache TTL: 3600 seconds

// GET /analytics/focus-report/current
// Returns running total for current week (live, not pre-computed):
// { currentWeekHours: float, sessionCount: int, weekLabel: string }
// Computed synchronously from FocusSessions — fast enough, no worker needed
```

---

### 3.4 Frontend

**New component:** `src/components/analytics/FocusReportCard.tsx`

**Render conditions:**
```typescript
const isMonday = new Date().getDay() === 1;
// Monday: render full FocusReportCard using GET /analytics/focus-report
// Other days: render compact variant using GET /analytics/focus-report/current
```

**Full card layout (Monday):**
```
┌─────────────────────────────────────────────┐
│ [indigo left border]                         │
│                                              │
│  4.1 hrs deep focus this week    ← text-3xl bold indigo-600
│  Your best recent week: 7.3 hrs  ← text-sm gray-500
│                                              │
│  Tuesday afternoon broke your longest        │
│  focus blocks.                   ← text-sm gray-700 italic
└─────────────────────────────────────────────┘
```

**Compact variant (other days):**
```
┌────────────────────────────────────┐
│ This week so far: 2.4 hrs          │
└────────────────────────────────────┘
```

**Empty state:** `sessionCount < 3` → render: *"Not enough data this week — run your first focus session to start tracking."*

**Loading state:** Use existing skeleton shimmer from AnalyticsPage.

**Placement:** Add `<FocusReportCard />` to Dashboard index component, below `<ActivityTable />`.

**Settings toggle:** Add to `/profile` under new section heading "Focus Reports":
- Label: `Receive weekly focus report`
- Default: ON
- On change: `PATCH /user/preferences { weeklyReportEnabled: boolean }`

---

### 3.5 Tests
```
✓ Unit: deepSession filter — sessions < 25 min excluded
✓ Unit: deepSession filter — sessions with interrupts > 2 excluded
✓ Unit: topFragmentor string is a complete English sentence
✓ Unit: bestWeekHours = max across 4 weeks including current
✓ Integration: GET /analytics/focus-report → 200 with valid schema
✓ Integration: GET /analytics/focus-report → isLastWeek:true when no current-week report
✓ Integration: GET /analytics/focus-report rejects userId query param (returns 403)
✓ Component: FocusReportCard renders deepFocusHours as headline
✓ Component: FocusReportCard renders empty state when sessionCount < 3
```

---

## §4 — FEATURE 2: ESTIMATION MEMORY ENGINE

**Purpose:** After an engineer completes tasks, Floework learns where they personally underestimate. A calibration hint appears inline at task creation. An accuracy table lives in Analytics. Zero retrospective blame — forward-looking calibration only.

---

### 4.1 Schema Changes

```prisma
model EstimationRecord {
  id              String   @id @default(cuid())
  userId          String
  taskId          String   @unique
  effortEstimate  String   // 'S' | 'M' | 'L'
  tagKeywords     String[]
  estimatedHours  Float    // S=2, M=5, L=10 (see §4.4 for config)
  actualHours     Float    // sum(FocusSessions.duration) for this task
  completedAt     DateTime
  user            User     @relation(fields: [userId], references: [id])
  task            Task     @relation(fields: [taskId], references: [id])
}

model EstimationPattern {
  id           String   @id @default(cuid())
  userId       String
  effortLevel  String   // 'S' | 'M' | 'L'
  tagKeyword   String
  sampleSize   Int
  avgRatio     Float    // actualHours / estimatedHours
  updatedAt    DateTime @updatedAt
  @@unique([userId, effortLevel, tagKeyword])
}
```

```bash
npx prisma migrate dev --name add_estimation_memory
```

---

### 4.2 Effort Baseline Config

```typescript
// src/config/estimation.ts
export const EFFORT_BASELINE_HOURS: Record<string, number> = {
  S: 2,
  M: 5,
  L: 10,
};

export const HINT_MIN_SAMPLES = 5;
export const HINT_MIN_RATIO   = 1.4; // only hint if actual ≥ 1.4x estimate
```

---

### 4.3 BullMQ Worker

**File:** `src/workers/estimationLogger.ts`
**Trigger:** Enqueued by `PATCH /tasks/:id` when `status` changes to `'Done'`
**Queue name:** `log-estimation-record`

**Algorithm:**
```
1. Fetch task (effort, title, assigneeId)
2. Sum FocusSessions.duration for this task → actualHours (in hours)
3. estimatedHours = EFFORT_BASELINE_HOURS[task.effort]
4. tagKeywords = extractKeywords(task.title)
5. UPSERT EstimationRecord
6. For each keyword in tagKeywords:
   a. Pull all EstimationRecords for (userId, effortLevel, keyword)
   b. avgRatio = mean(actualHours / estimatedHours) across records
   c. UPSERT EstimationPattern { sampleSize, avgRatio }
```

**Keyword extraction function:**
```typescript
const STOP_WORDS = new Set(['a','an','the','and','or','to','of','for','in','on','with','add','fix','update','create','implement']);

export function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}
```

---

### 4.4 API Endpoints

```typescript
// GET /analytics/estimation-hint?effort=M&keywords=frontend,refactor
// Auth required. enforceDataOwnership applied.
// Logic:
//   - Find EstimationPattern WHERE userId=req.user.id AND effortLevel=effort
//     AND tagKeyword IN keywords AND sampleSize >= HINT_MIN_SAMPLES AND avgRatio >= HINT_MIN_RATIO
//   - Return the single highest-ratio match
//   - Response: { ratio: 2.1, keyword: 'frontend', effortLevel: 'M', sampleSize: 8 }
//   - Return null (200) if no qualifying pattern

// GET /analytics/estimation-accuracy
// Auth required. enforceDataOwnership applied.
// Returns: all EstimationPatterns for req.user.id, sorted by avgRatio DESC
// Includes summary: { bestKeyword, bestEffort, worstKeyword, worstEffort }
```

---

### 4.5 Frontend

**Task creation modal — calibration hint:**
```typescript
// In TaskCreationModal.tsx
// On effort level change:
const keywords = extractKeywords(titleInput); // reuse the same extraction logic, client-side copy
const hint = await getEstimationHint({ effort: selectedEffort, keywords });

// Render below effort picker ONLY when hint is non-null:
// ┌─────────────────────────────────────────────────────┐
// │ yellow-50 bg, yellow-600 text, no icon, dismissable │
// │ Your Medium frontend tasks usually run 2x over.     │
// │ Consider Large.                            [×]       │
// └─────────────────────────────────────────────────────┘

// Dismiss: per-task only. Do not persist dismissal.
// Do NOT render on task edit. Only on creation.
```

**New component:** `src/components/analytics/EstimationAccuracyTab.tsx`

**Table columns:** Effort | Keyword | Tasks completed | Avg estimated hrs | Avg actual hrs | Ratio
- Rows where ratio > 1.4 → `bg-yellow-50`
- Rows where ratio < 0.8 → `bg-green-50`
- Rows with < 3 samples → show `Collecting data...` in ratio column

**Summary sentence below table:**
```
"Your most underestimated work type is [worstKeyword] at [worstEffort] level.
Your most accurate estimates are for [bestKeyword] at [bestEffort] level."
```

**Placement:** Add `Estimation` tab to tab group in `AnalyticsPage.tsx`.

---

### 4.6 Tests
```
✓ Unit: extractKeywords('Refactor authentication middleware') → ['refactor','authentication','middleware']
✓ Unit: extractKeywords strips stop words and short words
✓ Unit: avgRatio calculation across 6 records → correct mean
✓ Integration: hint endpoint → null when sampleSize < HINT_MIN_SAMPLES
✓ Integration: hint endpoint → null when avgRatio < HINT_MIN_RATIO
✓ Integration: hint endpoint → correct pattern when both thresholds met
✓ Component: CalibrationHint renders with ratio text when hint non-null
✓ Component: CalibrationHint does not mount when hint is null
✓ Component: CalibrationHint dismiss button hides the component
```

---

## §5 — FEATURE 3: PR WAIT-TIME BLOCKER SIGNAL

**Purpose:** GitHub OAuth integration. When a PR linked to a Floework task has been open ≥24h without review, the task card shows an amber `PR: 26h` badge. The stall is logged to ExecutionEvent. No pinging. No Slack messages. Just the task showing why it has not moved.

---

### 5.1 Schema Changes

```prisma
model GitHubConnection {
  id          String   @id @default(cuid())
  userId      String   @unique
  githubLogin String
  accessToken String   // AES-256-GCM encrypted — use encrypt() from §1.6
  scopes      String[]
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

model LinkedPR {
  id          String    @id @default(cuid())
  taskId      String
  userId      String
  owner       String
  repo        String
  prNumber    Int
  prTitle     String?
  state       String    @default("open") // "open" | "merged" | "closed"
  openedAt    DateTime?
  mergedAt    DateTime?
  lastChecked DateTime  @default(now())
  task        Task      @relation(fields: [taskId], references: [id])
  @@unique([taskId, owner, repo, prNumber])
}
```

```bash
npx prisma migrate dev --name add_github_pr_tracking
```

---

### 5.2 GitHub OAuth Routes

```typescript
// GET /api/auth/github
// Redirect to GitHub OAuth:
// scope: 'repo read:user'
// state: JWT-signed { userId } to prevent CSRF

// GET /api/auth/github/callback
// Exchange code for access token
// encrypt(accessToken) before storing in GitHubConnection
// Respond with: <script>window.opener.postMessage('github:connected', '*'); window.close();</script>

// DELETE /api/auth/github
// Revoke GitHub token via GitHub API, then delete GitHubConnection record
```

---

### 5.3 PR Linking Endpoint

```typescript
// POST /tasks/:id/pr
// Body: { prUrl: string }
// Auth required.

// URL parser:
function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], prNumber: parseInt(match[3]) };
}

// Steps:
// 1. Parse URL → { owner, repo, prNumber } — return 400 if invalid
// 2. Fetch PR from GitHub API using user's GitHubConnection.accessToken
// 3. Create LinkedPR record
// 4. Enqueue 'pr-status-checker' job immediately with { linkedPRId }
// 5. Append ExecutionEvent { eventType: 'pr_linked', payload: { prNumber, owner, repo } }

// Extend GET /tasks/:id response:
// Add field: linkedPr: LinkedPR | null
```

---

### 5.4 BullMQ Worker

**File:** `src/workers/prStatusChecker.ts`
**Schedule:** Every 30 minutes (repeatable job)
**Queue name:** `pr-status-checker`

**Algorithm:**
```
1. Fetch all LinkedPRs WHERE state = 'open'
2. For each PR:
   a. GET https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}
      — use owner's GitHubConnection.accessToken (decrypt first)
   b. Update LinkedPR: { state, prTitle, openedAt, mergedAt, lastChecked }
   c. If state just changed to 'merged' | 'closed':
      → AppendExecutionEvent { eventType: 'pr_merged', payload: { waitHours, prNumber } }
   d. If state still 'open' AND openedAt is now > 24h ago:
      → If no 'pr_stalled' ExecutionEvent exists for this PR yet:
         AppendExecutionEvent { eventType: 'pr_stalled', payload: { openHours } }
   e. Emit Socket.io event: task:pr_updated to sprint room
      payload: { taskId, linkedPr: updatedLinkedPR }
```

**openHours helper:**
```typescript
const openHours = (openedAt: Date) =>
  Math.floor((Date.now() - openedAt.getTime()) / 3_600_000);
```

---

### 5.5 Frontend

**Profile page — Integrations section:**
```typescript
// Add to ProfilePage.tsx under new <section> "Integrations"
// GitHubConnect component:
// - Disconnected state: GitHub SVG icon (16px) + "GitHub" label + outline "Connect" button
// - Connected state: green dot + "Connected as @{githubLogin}" + "Disconnect" text button (gray-400)
// OAuth popup pattern:
const connectGitHub = () => {
  const popup = window.open('/api/auth/github', 'github-oauth', 'width=600,height=700');
  window.addEventListener('message', (e) => {
    if (e.data === 'github:connected') { popup?.close(); refetchConnection(); }
  }, { once: true });
};
```

**Task card — PR badge:**
```typescript
// In TaskCard.tsx
// Render PRBadge ONLY when:
//   task.linkedPr?.state === 'open' && openHours(task.linkedPr.openedAt) >= 24

// PRBadge:
// <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">
//   PR: {openHours}h
// </span>
// Position: bottom-right of card, alongside effort badge
// onClick: open TaskDetailPanel, scroll to PR section
```

**Task Detail Panel — PR section:**
```
New collapsible section "Pull Request" in TaskDetailPanel slide-over.

When linkedPr exists:
  PR title (linked to GitHub URL)
  "Opened Xh ago"
  Reviewer list: name + status (requested / reviewed / approved)
  Merge status

When linkedPr is null:
  "No PR linked."
  Text input: placeholder="Paste GitHub PR URL"
  On submit: POST /tasks/:id/pr
```

**Socket.io listener:**
```typescript
socket.on('task:pr_updated', ({ taskId, linkedPr }) => {
  dispatch(api.util.updateQueryData('getTask', taskId, (draft) => {
    draft.linkedPr = linkedPr;
  }));
});
```

---

### 5.6 Tests
```
✓ Unit: parsePRUrl('https://github.com/owner/repo/pull/42') → { owner, repo, prNumber: 42 }
✓ Unit: parsePRUrl('not-a-url') → null
✓ Unit: parsePRUrl('https://github.com/owner/repo/issues/42') → null (issues not PRs)
✓ Unit: openHours calculation is correct
✓ Integration: POST /tasks/:id/pr creates LinkedPR record
✓ Integration: POST /tasks/:id/pr returns 400 for invalid URL
✓ Integration: pr-status-checker updates state from 'open' to 'merged' when GitHub returns merged
✓ Integration: ExecutionEvent created when openHours >= 24 and no prior pr_stalled event
✓ Integration: accessToken is stored encrypted (raw DB value is not plaintext)
✓ Component: PRBadge renders with correct hours
✓ Component: PRBadge does not render when openHours < 24
✓ Component: PRBadge does not render when linkedPr is null
```

---

## §6 — FEATURE 4: DEEP WORK WINDOW RECOMMENDER

**Purpose:** Using existing `FocusStabilitySlot` data, identify the engineer's historically best focus windows. Offer a `.ics` download and Google Calendar sync. The gap between insight and action is closed with one button.

---

### 6.1 Schema Changes

```prisma
model GoogleCalendarConnection {
  id           String    @id @default(cuid())
  userId       String    @unique
  googleEmail  String
  accessToken  String    // encrypted
  refreshToken String    // encrypted
  calendarId   String    @default("primary")
  lastSynced   DateTime?
  user         User      @relation(fields: [userId], references: [id])
}

model FocusCalendarEvent {
  id          String   @id @default(cuid())
  userId      String
  gcalEventId String?
  dayOfWeek   Int      // 0=Sun … 6=Sat
  startHour   Int
  endHour     Int
  createdAt   DateTime @default(now())
}
```

```bash
npx prisma migrate dev --name add_calendar_integration
```

---

### 6.2 Peak Window Algorithm

**Add to `stability-roller` worker — runs after existing slot computation.**

**Cache key:** `focus:peak:{userId}` in Redis, TTL 86400 (24h)

```typescript
// PeakWindow type:
type PeakWindow = { dayOfWeek: number; startHour: number; endHour: number; avgScore: number };

function computePeakWindows(slots: FocusStabilitySlot[]): PeakWindow[] {
  // 1. Group by (dayOfWeek, hourOfDay), average score across weeks
  // 2. Find 85th percentile threshold
  // 3. Collect all slots above threshold
  // 4. Merge contiguous hours into blocks:
  //    hours [9, 10, 11] on same day → { startHour: 9, endHour: 12 }
  // 5. Return top 3 blocks sorted by avgScore DESC
  // Returns [] if user has < 3 distinct weekLabels in their slot data
}
```

---

### 6.3 API Endpoints

```typescript
// GET /analytics/focus-windows
// Auth required. Read from Redis cache first. Recompute if cache miss.
// Response: PeakWindow[] (empty array if insufficient data)

// GET /analytics/focus-windows/ics
// Auth required.
// Generate .ics file using `ical-generator` npm package:
//   - VEVENT per peak window
//   - RRULE: FREQ=WEEKLY
//   - DTSTART: next occurrence of that dayOfWeek at startHour
//   - DURATION: endHour - startHour hours
//   - SUMMARY: "Deep Work — Protected"
//   - DESCRIPTION: "Protected by Floework"
// Response headers:
//   Content-Type: text/calendar; charset=utf-8
//   Content-Disposition: attachment; filename="floework-focus-windows.ics"

// GET /api/auth/google-calendar        — OAuth redirect
// GET /api/auth/google-calendar/callback — exchange code, store encrypted tokens, enqueue gcal-sync
// DELETE /api/auth/google-calendar     — revoke, delete connection, delete FocusCalendarEvents

// GET /analytics/focus-windows/gcal-status
// Response: { connected: boolean, googleEmail: string | null, lastSynced: DateTime | null }
```

**Install:** `npm install ical-generator`

---

### 6.4 BullMQ Worker

**File:** `src/workers/gcalSync.ts`
**Queue name:** `gcal-sync`
**Trigger:** After Google Calendar OAuth callback + weekly (Sundays 08:00 UTC)

```
1. Fetch peak windows for user (from Redis cache or recompute)
2. For each PeakWindow:
   a. If FocusCalendarEvent exists (gcalEventId is set): PATCH event via Google Calendar API
   b. If not: POST new VEVENT via Google Calendar API, store gcalEventId in FocusCalendarEvent
3. Update GoogleCalendarConnection.lastSynced
```

---

### 6.5 Frontend

**New component:** `src/components/analytics/PeakFocusWindows.tsx`

```
Layout (in order):
1. Section heading: "Your best focus windows"
   Sub-label: "Based on your last 4 weeks" (gray-400, text-xs)

2. Window pills row:
   [Tue 9–11am] [Thu 9–11am] [Wed 2–4pm]
   — indigo-100 bg, indigo-700 text, rounded-full, text-sm

3. Calendar actions:
   If NOT Google Calendar connected:
     [Download .ics]  ← outline button, primary
     Connect Google Calendar  ← text link below button

   If Google Calendar connected:
     ✓ Synced to Google Calendar — last synced {relative time}  ← green-600 text-sm
     Remove sync  ← text link gray-400

4. Empty state (insufficient data):
   "Run focus sessions for 3 more weeks to unlock your focus windows."
```

**.ics download implementation:**
```typescript
const downloadIcs = async () => {
  const res = await fetch('/analytics/focus-windows/ics', { headers: { Authorization: `Bearer ${token}` } });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'floework-focus-windows.ics'; a.click();
  URL.revokeObjectURL(url);
};
```

**Google Calendar OAuth popup:** Same pattern as GitHub (§5.5).

**Placement:** Add `<PeakFocusWindows />` below `<FocusStabilityHeatmap />` in `AnalyticsPage.tsx`.

---

### 6.6 Tests
```
✓ Unit: computePeakWindows returns [] when user has < 3 week labels
✓ Unit: computePeakWindows returns max 3 windows
✓ Unit: contiguous slot merge — hours [9,10,11] → { startHour:9, endHour:12 }
✓ Unit: non-contiguous slots — hours [9,10,14,15] → two separate windows
✓ Integration: GET /analytics/focus-windows → 200 with PeakWindow[]
✓ Integration: GET /analytics/focus-windows/ics → Content-Type: text/calendar
✓ Integration: GET /analytics/focus-windows/ics contains VEVENT and RRULE:FREQ=WEEKLY
✓ Integration: Google tokens stored encrypted
✓ Component: PeakFocusWindows renders correct day/time labels in pills
✓ Component: PeakFocusWindows renders empty state when windows array is empty
```

---

## §7 — FEATURE 5: EFFORT NARRATIVE

**Purpose:** A weekly auto-generated, plain-language summary of what the engineer did, how their focus was, and what stalled. Private by default. Editable. Shareable via time-limited link. A work journal that writes itself.

---

### 7.1 Schema Changes

```prisma
model EffortNarrative {
  id          String    @id @default(cuid())
  userId      String
  weekLabel   String    // 'YYYY-WW'
  body        String    // generated prose; editable by engineer
  isEdited    Boolean   @default(false)
  shareToken  String?   @unique
  shareExpiry DateTime?
  generatedAt DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id])
  @@unique([userId, weekLabel])
}
```

```bash
npx prisma migrate dev --name add_effort_narrative
```

---

### 7.2 Narrative Template Engine

**Rule:** This is a deterministic template engine. Do **not** use an LLM. Predictable output is the requirement.

**File:** `src/services/narrativeTemplate.ts`

```typescript
interface NarrativeInput {
  completedTasks: { title: string; effort: string; focusHours: number }[];
  stalledTasks:   { title: string; daysStalled: number; reason?: 'pr_stalled' | null }[];
  focusStats:     { sessionCount: number; avgSessionMins: number; isPersonalBest: boolean };
  afterHoursFlag: boolean;
}

export function generateNarrative(input: NarrativeInput): string {
  const parts: string[] = [];

  // Block 1: Task summary
  if (input.completedTasks.length === 0) {
    parts.push('No tasks were completed this week.');
  } else {
    const taskList = input.completedTasks.map(t =>
      `${t.title} (${t.effort}, ${t.focusHours.toFixed(1)} focus hours)`
    ).join(', ');
    const count = input.completedTasks.length;
    parts.push(`This week you completed ${count} task${count > 1 ? 's' : ''}: ${taskList}.`);
  }

  // Block 2: Stalls (only if present)
  if (input.stalledTasks.length > 0) {
    const s = input.stalledTasks[0];
    const reason = s.reason === 'pr_stalled' ? ' awaiting PR review' : '';
    parts.push(`One task is stalled — "${s.title}" has been in progress for ${s.daysStalled} day${s.daysStalled > 1 ? 's' : ''}${reason}.`);
  }

  // Block 3: Focus stats
  let focusLine = `Your focus this week: ${input.focusStats.sessionCount} session${input.focusStats.sessionCount !== 1 ? 's' : ''} averaging ${Math.round(input.focusStats.avgSessionMins)} minutes`;
  if (input.focusStats.isPersonalBest) focusLine += ', your best streak of the month';
  parts.push(focusLine + '.');

  // Block 4: After-hours
  parts.push(input.afterHoursFlag
    ? 'After-hours activity was logged this week.'
    : 'No after-hours activity logged.');

  return parts.join(' ');
}
```

---

### 7.3 BullMQ Worker

**File:** `src/workers/narrativeGenerator.ts`
**Schedule:** Every Monday 07:00 UTC (1 hour after `weekly-focus-auditor`)
**Queue name:** `narrative-generator`

```
For each user:
1. Pull completed tasks for past 7 days + their FocusSessions
2. Pull stalled tasks: Task.status = 'In Progress' AND no FocusSession in past 48h
   - Check ExecutionEvent for 'pr_stalled' to populate reason
3. Pull WeeklyFocusReport (generated 1h earlier) for focusStats
   - isPersonalBest: currentWeek deepFocusHours > max of prior 3 weeks
4. afterHoursFlag: any FocusSession with startTime hour < 7 OR > 20 (user's local time)
   - Use user.timezone if stored, else UTC
5. Call generateNarrative(input) → body string
6. UPSERT EffortNarrative { userId, weekLabel, body }
```

---

### 7.4 API Endpoints

```typescript
// GET /narrative
// Auth required. Returns paginated EffortNarratives for req.user.id, newest first.
// Query params: page (default 1), limit (default 10)

// GET /narrative/current
// Auth required. Returns the most recent EffortNarrative.

// PATCH /narrative/:id
// Auth required. Ownership check: narrative.userId === req.user.id.
// Body: { body: string }
// Sets isEdited = true. Returns updated narrative.

// POST /narrative/:id/share
// Auth required. Ownership check.
// Generates shareToken = cuid(), shareExpiry = now + 7 days.
// Returns: { shareUrl: string } where shareUrl = `${BASE_URL}/narrative/shared/${shareToken}`

// DELETE /narrative/:id/share
// Auth required. Ownership check.
// Sets shareToken = null, shareExpiry = null.

// GET /narrative/shared/:token
// PUBLIC — no auth.
// Returns narrative if: shareToken matches AND shareExpiry > now
// Returns 404 if token not found OR expired (do not distinguish between the two)
```

---

### 7.5 Frontend

**New page:** `src/pages/NarrativePage.tsx`
**Route:** `/narrative` (protected)
**Sidebar:** Add after Focus, before Analytics. Icon: `FileText` from lucide-react.

**Page layout:**
```
max-width: 720px, mx-auto, px-6

┌─── CurrentNarrativeCard ──────────────────────────┐
│ Week of [date range]                   [Edit] [Share] [Copy]
│                                                   │
│ {narrative body text}                             │
│ text-base leading-relaxed text-gray-700           │
└───────────────────────────────────────────────────┘

[past weeks accordion below]
```

**Edit mode:**
```typescript
// Clicking Edit replaces <p> with <textarea>
// Auto-save on blur: debounced 800ms → PATCH /narrative/:id
// Show inline "Saved ✓" for 2s after successful save
```

**Share flow:**
```typescript
// POST /narrative/:id/share → get shareUrl
// Show modal:
//   URL input (read-only, copy-on-click)
//   "Link expires in 7 days"
//   [Copy link] button → navigator.clipboard.writeText(shareUrl)
//   [Revoke link] text button → DELETE /narrative/:id/share
```

**Copy for 1:1:**
```typescript
// navigator.clipboard.writeText(narrative.body)
// Toast: "Copied to clipboard" for 2s
```

**Past narratives accordion:**
```typescript
// Each collapsed item shows: week label + first 80 chars of body
// Expanded: full body text, edit button, share button
// Fetch with GET /narrative?page=1
```

**Public share page:** `src/pages/SharedNarrativePage.tsx`
```
Route: /narrative/shared/:token (UNPROTECTED — no ProtectedRoute wrapper)
Fetches: GET /narrative/shared/:token
Shows: narrative body in read-only prose
Footer: "Created with Floework"
404 state: "This narrative has expired or does not exist."
```

---

### 7.6 Tests
```
✓ Unit: generateNarrative — completedTasks=[] → starts with "No tasks were completed"
✓ Unit: generateNarrative — 2 tasks, 1 stall → body contains both task titles and stall title
✓ Unit: generateNarrative — stalledTask with reason='pr_stalled' → body contains "awaiting PR review"
✓ Unit: generateNarrative — afterHoursFlag=false → body ends with "No after-hours activity logged."
✓ Integration: GET /narrative/current → 200 with body string
✓ Integration: PATCH /narrative/:id → updates body, sets isEdited=true
✓ Integration: POST /narrative/:id/share → returns shareUrl string
✓ Integration: GET /narrative/shared/:token → 200 for valid non-expired token
✓ Integration: GET /narrative/shared/:token → 404 for expired token
✓ Integration: GET /narrative/shared/:token → 404 for unknown token (same response as expired)
✓ Component: CurrentNarrativeCard renders body text
✓ Component: Edit click converts body to textarea
✓ Component: SharedNarrativePage renders narrative body without auth header
```

---

## §8 — FEATURE 6: AI TIME DISPLACEMENT TRACKER

**Purpose:** An optional pre-session toggle in the Focus Zone marks a session as AI-assisted. Over time, Floework shows whether AI is redirecting the engineer toward harder problems or just accelerating the same ones.

---

### 8.1 Schema Changes

```prisma
// Add to FocusSession model:
aiAssisted  Boolean  @default(false)

model AIDisplacementSummary {
  id               String   @id @default(cuid())
  userId           String
  weekLabel        String
  aiHours          Float
  humanHours       Float
  aiTaskEfforts    String[] // effort levels of AI-assisted completed tasks
  humanTaskEfforts String[] // effort levels of human-only completed tasks
  insightText      String   // pre-computed insight sentence
  updatedAt        DateTime @updatedAt
  @@unique([userId, weekLabel])
}
```

```bash
npx prisma migrate dev --name add_ai_displacement
```

---

### 8.2 Session Update

```typescript
// Extend POST /focus/stop
// Body now accepts: { aiAssisted?: boolean }
// Save to FocusSession.aiAssisted — default false if not provided
```

---

### 8.3 BullMQ Worker

**File:** `src/workers/aiDisplacementRoller.ts`
**Schedule:** Every Sunday 23:00 UTC
**Queue name:** `ai-displacement-roller`

**Algorithm:**
```
For each user who has any FocusSession WHERE aiAssisted=true in past week:
1. aiHours = sum(duration) WHERE aiAssisted=true / 60
2. humanHours = sum(duration) WHERE aiAssisted=false / 60
3. aiTaskEfforts: effort levels of tasks completed this week with ≥1 AI session
4. humanTaskEfforts: effort levels of tasks completed with 0 AI sessions
5. insightText = computeInsight(aiTaskEfforts, humanTaskEfforts)
6. UPSERT AIDisplacementSummary
```

**Insight sentence:**
```typescript
const EFFORT_SCORE: Record<string, number> = { S: 1, M: 2, L: 3 };

function computeInsight(aiEfforts: string[], humanEfforts: string[]): string {
  if (aiEfforts.length === 0) return 'No AI-assisted tasks completed this week.';
  const aiAvg    = aiEfforts.reduce((s, e)    => s + (EFFORT_SCORE[e] ?? 2), 0) / aiEfforts.length;
  const humanAvg = humanEfforts.reduce((s, e) => s + (EFFORT_SCORE[e] ?? 2), 0) / humanEfforts.length;
  if (aiAvg < humanAvg - 0.4)
    return 'AI is handling your lighter tasks — your deep human work is trending harder.';
  if (aiAvg > humanAvg + 0.4)
    return 'AI is being used on your harder tasks — check if simpler work is being neglected.';
  return 'AI is saving time on work of similar complexity — consider redirecting it toward harder problems.';
}
```

---

### 8.4 API Endpoint

```typescript
// GET /analytics/ai-displacement
// Auth required. enforceDataOwnership applied.
// Returns: past 4 AIDisplacementSummary records, newest first
// Each record includes pre-computed insightText
// Empty array if user has < 5 total AI-assisted sessions (ever)
```

---

### 8.5 Frontend

**Focus Zone toggle:**
```typescript
// In FocusPage.tsx — add ABOVE task title display, BELOW page header

// AIAssistedToggle component:
// <div className="flex items-center gap-2 mb-4">
//   <Sparkles size={14} className="text-purple-400" />
//   <span className="text-sm text-gray-500">AI-assisted</span>
//   <Toggle checked={aiAssisted} onChange={setAiAssisted} disabled={sessionActive} />
// </div>

// Rules:
// - Defaults to OFF every session
// - Disabled (unclickable) once sessionActive === true
// - Value passed to stopFocusSession Redux action → included in POST /focus/stop body
// - Persist last-used value in localStorage key 'floework_ai_toggle_default'
//   so repeat users don't have to re-toggle each time
```

**New component:** `src/components/analytics/AIDisplacementSection.tsx`

```
Section heading: "AI & Deep Work"

If < 5 AI-assisted sessions total:
  Empty state: "Start tagging AI-assisted sessions in the Focus Zone to see your displacement pattern."

If sufficient data:
  Recharts BarChart, stacked:
    - 4 weeks on X axis (weekLabel → "Mar W1" format)
    - Two series: "AI-assisted" (purple-400) and "Human focus" (indigo-500)
    - Y axis: hours
    - Tooltip: shows both values on hover

  Insight text below chart:
    <p className="text-sm text-gray-600 mt-3 italic">{latestSummary.insightText}</p>
```

**Placement:** Add `<AIDisplacementSection />` to `AnalyticsPage.tsx` below `<EstimationAccuracyTab />`.

---

### 8.6 Tests
```
✓ Unit: computeInsight — aiAvg < humanAvg - 0.4 → "lighter tasks" message
✓ Unit: computeInsight — roughly equal → "similar complexity" message
✓ Unit: computeInsight — aiEfforts=[] → "No AI-assisted tasks" message
✓ Integration: POST /focus/stop with aiAssisted=true → FocusSession.aiAssisted = true
✓ Integration: POST /focus/stop without aiAssisted → FocusSession.aiAssisted = false
✓ Integration: GET /analytics/ai-displacement → empty array when < 5 AI sessions
✓ Integration: GET /analytics/ai-displacement → 200 with AIDisplacementSummary[] when sufficient data
✓ Component: AIAssistedToggle disabled when sessionActive=true
✓ Component: AIAssistedToggle enabled when sessionActive=false
✓ Component: AIDisplacementSection renders empty state when no data
```

---

## §9 — ONBOARDING: DAY-ONE ACTIVATION LOOP

**Purpose:** Ensure the engineer sees the Execution Graph populate — their first aha moment — within 5 minutes of registering, before any real data exists.

**Constraint:** Every step must work for a solo engineer with no team. Do not gate any core feature behind team creation.

---

### 9.1 Schema Change

```prisma
// Add to Task model:
isSample  Boolean  @default(false)
```

```bash
npx prisma migrate dev --name add_sample_task_flag
```

---

### 9.2 Activation Flow

| Step | Trigger | What happens | Time target |
|------|---------|-------------|-------------|
| 1 | User submits registration form | Create user. Call `seedSampleWorkspace(userId)`. Redirect to `/boards`. | < 30s |
| 2 | User lands on `/boards` | Pre-populated board with 3 sample tasks + sample sprint. No empty state. | Immediate |
| 3 | First visit only | Tooltip overlay pointing at "Review authentication flow" task's Start Focus button. "Start your first session to see how Floework tracks your work." Dismissable. | — |
| 4 | User runs a ≥5 min focus session on any sample task | Skip mental offload note screen for `isSample=true` tasks. Return to board immediately. | 5 min |
| 5 | Session ends | Task card focus count increments. Task Detail Panel auto-opens showing Execution Graph with first event. | Immediate |
| 6 | After aha moment | Board header banner: "Replace sample tasks with your real work." with [Clear samples] button. | User-paced |

---

### 9.3 Seed Function

```typescript
// src/services/seedSampleWorkspace.ts

export async function seedSampleWorkspace(userId: string): Promise<void> {
  const workspace = await prisma.project.create({
    data: { name: 'My Workspace', teamId: null, ownerId: userId }
  });

  const sprint = await prisma.sprint.create({
    data: {
      name: 'Your first sprint',
      projectId: workspace.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.task.createMany({
    data: [
      { title: 'Set up development environment', effort: 'S', status: 'Done',        sprintId: sprint.id, assigneeId: userId, isSample: true },
      { title: 'Review authentication flow',     effort: 'M', status: 'In Progress', sprintId: sprint.id, assigneeId: userId, isSample: true },
      { title: 'Write unit tests for API layer', effort: 'L', status: 'Backlog',     sprintId: sprint.id, assigneeId: userId, isSample: true },
    ]
  });
}
```

---

### 9.4 Additional Endpoints

```typescript
// GET /user/has-real-tasks
// Auth required.
// Returns: { hasRealTasks: boolean }
// Logic: EXISTS Task WHERE assigneeId=req.user.id AND isSample=false
// Used by board header to decide whether to show "Replace sample tasks" banner

// DELETE /tasks/samples
// Auth required.
// Deletes ALL tasks WHERE isSample=true AND assigneeId=req.user.id
// Also deletes related FocusSessions, ExecutionEvents, LinkedPRs for those tasks
```

---

### 9.5 Frontend Rules

```typescript
// Onboarding tooltip:
// localStorage key: 'floework_onboarding_v1_complete'
// Show tooltip ONLY when key is not set
// On dismiss OR on successful first focus session end: set key to '1'
// Use a lightweight tooltip, not a modal — board must remain interactive

// Mental offload note screen:
// In the post-session confirmation flow, check if task.isSample === true
// If true: skip the note screen entirely, return to board
// If false: show the existing confirmation + note flow unchanged

// "Replace sample tasks" banner:
// In BoardPage.tsx, call GET /user/has-real-tasks on mount
// Show banner when hasRealTasks=false
// [Clear samples] button → DELETE /tasks/samples → refetch board → dismiss banner
// Banner style: subtle, top of board content, dismissable with X
```

---

### 9.6 Tests
```
✓ Integration: registration endpoint calls seedSampleWorkspace
✓ Integration: seedSampleWorkspace creates 1 sprint and 3 tasks with isSample=true
✓ Integration: GET /user/has-real-tasks → false immediately after registration
✓ Integration: GET /user/has-real-tasks → true after creating one non-sample task
✓ Integration: DELETE /tasks/samples removes all isSample=true tasks for user
✓ Integration: DELETE /tasks/samples does NOT remove isSample=false tasks
✓ Component: onboarding tooltip renders when localStorage key is absent
✓ Component: onboarding tooltip does not render when localStorage key is set
```

---

## §10 — PRIVACY ARCHITECTURE

> These are code patterns enforced at the framework level. Implement them once and apply globally.

---

### 10.1 enforceDataOwnership Middleware

**File:** `src/middleware/enforceDataOwnership.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export const enforceDataOwnership = (req: Request, res: Response, next: NextFunction) => {
  // Prevent client from requesting another user's data via query param
  if (req.query.userId && req.query.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Controllers must use this, not req.query.userId
  req.analyticsUserId = req.user!.id;
  next();
};
```

**Apply to ALL of these routes:**
```
GET /analytics/*
GET /narrative
GET /narrative/current
GET /narrative/:id
PATCH /narrative/:id
POST /narrative/:id/share
DELETE /narrative/:id/share
```

---

### 10.2 Team-Level Endpoint Rules

The following endpoints must **never** include individual behavioural data in their responses:

| Endpoint | Forbidden fields |
|---|---|
| `GET /tasks` | FocusSessions, burnout score, EstimationPattern |
| `GET /sprints/:id` | Any per-user analytics data |
| `GET /teams/:id/members` | Any productivity metrics |
| Socket.io `task:updated` | Focus session metadata |
| Socket.io `focus:started/stopped` | Duration, interrupts, session details |

---

### 10.3 Share Token Security

Rules for `EffortNarrative.shareToken`:
- Generate with `cuid()` — never sequential IDs
- Enforce expiry **at query time** in `GET /narrative/shared/:token`:
  ```typescript
  const narrative = await prisma.effortNarrative.findUnique({ where: { shareToken: token } });
  if (!narrative || !narrative.shareExpiry || narrative.shareExpiry < new Date()) {
    return res.status(404).json({ error: 'Not found' }); // Same 404 for both cases
  }
  ```
- Never return `shareToken` value in any endpoint other than `POST /narrative/:id/share`

---

### 10.4 Encrypted Field Checklist

Before shipping each feature, verify:

```
§5 GitHubConnection.accessToken                  → encrypt() before INSERT/UPDATE
§6 GoogleCalendarConnection.accessToken          → encrypt() before INSERT/UPDATE
§6 GoogleCalendarConnection.refreshToken         → encrypt() before INSERT/UPDATE
§5 pr-status-checker worker                      → decrypt() before GitHub API call
§6 gcal-sync worker                              → decrypt() before Google API call
```

---

## §11 — MASTER TEST CHECKLIST

Run all tests before marking any feature complete: `npx vitest run && npx vitest run --reporter=verbose`

### Context-Switch Audit (§3)
```
✓ deepSession filter: duration < 25min excluded
✓ deepSession filter: interrupts > 2 excluded
✓ topFragmentor output is a complete sentence
✓ bestWeekHours = max across 4 weeks
✓ GET /analytics/focus-report → 200 valid schema
✓ GET /analytics/focus-report → isLastWeek:true when no current week
✓ GET /analytics/focus-report → 403 when userId query param present
✓ FocusReportCard renders headline number
✓ FocusReportCard renders empty state when sessionCount < 3
```

### Estimation Memory (§4)
```
✓ extractKeywords filters stop words
✓ extractKeywords filters words <= 3 chars
✓ avgRatio calculation is correct mean
✓ hint → null when sampleSize < 5
✓ hint → null when avgRatio < 1.4
✓ hint → pattern when both thresholds met
✓ CalibrationHint renders when hint non-null
✓ CalibrationHint absent when hint null
✓ CalibrationHint dismiss hides component
```

### PR Blocker Signal (§5)
```
✓ parsePRUrl valid URL → correct owner/repo/prNumber
✓ parsePRUrl invalid URL → null
✓ parsePRUrl issues URL → null
✓ openHours calculation correct
✓ POST /tasks/:id/pr creates LinkedPR
✓ POST /tasks/:id/pr invalid URL → 400
✓ worker updates state open→merged
✓ ExecutionEvent created at 24h
✓ accessToken stored encrypted
✓ PRBadge renders at openHours >= 24
✓ PRBadge absent at openHours < 24
✓ PRBadge absent when linkedPr null
```

### Deep Work Windows (§6)
```
✓ computePeakWindows → [] when < 3 week labels
✓ computePeakWindows → max 3 results
✓ contiguous merge: [9,10,11] → {start:9, end:12}
✓ non-contiguous: [9,10,14,15] → 2 windows
✓ GET /analytics/focus-windows → 200
✓ GET /analytics/focus-windows/ics → Content-Type: text/calendar
✓ .ics contains VEVENT and RRULE:FREQ=WEEKLY
✓ Google tokens stored encrypted
✓ PeakFocusWindows renders pills
✓ PeakFocusWindows renders empty state
```

### Effort Narrative (§7)
```
✓ generateNarrative completedTasks=[] → "No tasks were completed"
✓ generateNarrative 2 tasks + 1 stall → contains both titles
✓ generateNarrative pr_stalled reason → "awaiting PR review"
✓ generateNarrative afterHoursFlag=false → "No after-hours activity logged."
✓ GET /narrative/current → 200 with body
✓ PATCH /narrative/:id → updates body, isEdited=true
✓ POST /narrative/:id/share → returns shareUrl
✓ GET /narrative/shared/:token valid → 200
✓ GET /narrative/shared/:token expired → 404
✓ GET /narrative/shared/:token unknown → 404
✓ CurrentNarrativeCard renders body
✓ Edit click → textarea
✓ SharedNarrativePage renders without auth
```

### AI Displacement (§8)
```
✓ computeInsight aiAvg < humanAvg-0.4 → "lighter tasks"
✓ computeInsight equal → "similar complexity"
✓ computeInsight aiEfforts=[] → "No AI-assisted tasks"
✓ POST /focus/stop aiAssisted=true → saved true
✓ POST /focus/stop no aiAssisted → saved false
✓ GET /analytics/ai-displacement → [] when < 5 AI sessions
✓ GET /analytics/ai-displacement → data when sufficient
✓ AIAssistedToggle disabled when session active
✓ AIAssistedToggle enabled when session inactive
✓ AIDisplacementSection renders empty state
```

### Onboarding (§9)
```
✓ Registration calls seedSampleWorkspace
✓ seedSampleWorkspace creates 1 sprint + 3 isSample tasks
✓ GET /user/has-real-tasks → false after registration
✓ GET /user/has-real-tasks → true after first real task
✓ DELETE /tasks/samples removes only isSample=true
✓ Tooltip renders when localStorage key absent
✓ Tooltip absent when localStorage key set
```

### Privacy Architecture (§10)
```
✓ enforceDataOwnership → 403 when userId query param ≠ token user
✓ GET /tasks response contains no FocusSession fields
✓ Socket.io task:updated payload contains no duration/interrupts fields
```

---

*End of specification. Total features: 6. Total new Prisma models: 9. Total new BullMQ workers: 5. Total new API endpoints: 22. All features use the existing stack — no new infrastructure required.*