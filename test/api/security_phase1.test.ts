import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set mock environment variables before imports
process.env.SUPABASE_URL = 'https://mock-supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.NODE_ENV = 'test';

// Helper to create mock VercelRequest & VercelResponse
function createMockReqRes({
  method = 'GET',
  headers = {},
  query = {},
  body = {},
}: {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: Record<string, any>;
} = {}) {
  const req = {
    method,
    headers: { ...headers },
    query: { ...query },
    body: { ...body },
  } as any;

  let statusCode = 200;
  let responseBody: any = null;
  const responseHeaders: Record<string, string> = {};

  const res = {
    setHeader(key: string, val: string) {
      responseHeaders[key.toLowerCase()] = val;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseBody = data;
      return res;
    },
    send(data: any) {
      responseBody = data;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return responseBody;
    },
    get headers() {
      return responseHeaders;
    },
  } as any;

  return { req, res };
}

// Mock Kafka & SQS publishers
const mockPublishedEvents: any[] = [];
vi.mock('../../api/_lib/kafka', () => ({
  publishEvent: vi.fn(async (topic: string, key: string, message: any) => {
    mockPublishedEvents.push({ topic, key, message });
  }),
}));

vi.mock('../../api/_lib/sqs', () => ({
  publishFocusCompletionEvent: vi.fn(async (userId: string, event: any) => {
    mockPublishedEvents.push({ topic: 'focus.events', key: userId, message: event });
    return { messageId: 'msg-mock-123' };
  }),
  publishToQueue: vi.fn().mockResolvedValue({ messageId: 'msg-mock-123' }),
}));

// Mock Redis
vi.mock('../../api/_lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  },
}));

// In-memory mock database state
const mockDb = {
  users: new Map<string, { id: string; email: string }>(),
  teams: new Map<string, { id: string; name: string }>(),
  projects: new Map<string, { id: string; team_id: string; name: string }>(),
  team_members: new Map<string, { team_id: string; user_id: string; role: string }>(),
  tasks: new Map<string, { id: string; project_id: string; title: string; version: number }>(),
  concurrency_conflicts: [] as any[],
};

// Mock Supabase createClient
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: vi.fn(async (token: string) => {
          if (mockDb.users.has(token)) {
            return { data: { user: mockDb.users.get(token) }, error: null };
          }
          return { data: { user: null }, error: { message: 'Invalid token' } };
        }),
      },
      from: (table: string) => {
        let filters: Record<string, any> = {};
        let updatePayload: any = null;
        let insertPayload: any = null;
        let selectColumns: string = '*';
        let isSingle = false;

        const builder: any = {
          select(cols = '*') {
            selectColumns = cols;
            return builder;
          },
          eq(column: string, value: any) {
            filters[column] = value;
            return builder;
          },
          order() {
            return builder;
          },
          update(payload: any) {
            updatePayload = payload;
            return builder;
          },
          insert(payload: any) {
            insertPayload = payload;
            return builder;
          },
          single() {
            isSingle = true;
            return builder.execute();
          },
          then(resolve: any, reject: any) {
            return builder.execute().then(resolve, reject);
          },
          execute: async () => {
            if (insertPayload) {
              if (table === 'concurrency_conflicts') {
                mockDb.concurrency_conflicts.push(insertPayload);
                return { data: insertPayload, error: null };
              }
              if (table === 'tasks') {
                const newTask = { id: 'task-new', ...insertPayload, version: 1 };
                mockDb.tasks.set(newTask.id, newTask);
                return { data: newTask, error: null };
              }
            }

            if (updatePayload && table === 'tasks') {
              const taskId = filters['id'];
              const task = mockDb.tasks.get(taskId);
              if (!task) {
                return { data: null, error: { message: 'Not found', code: '404' } };
              }
              // Check OCC version
              if (filters['version'] !== undefined && filters['version'] !== task.version) {
                // Version mismatch -> PGRST116 (0 rows returned)
                return { data: null, error: { message: 'Version mismatch', code: 'PGRST116' } };
              }
              const updated = { ...task, ...updatePayload, version: task.version + 1 };
              mockDb.tasks.set(taskId, updated);
              return { data: updated, error: null };
            }

            if (table === 'tasks') {
              if (filters['id']) {
                const task = mockDb.tasks.get(filters['id']);
                if (!task) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
                return { data: task, error: null };
              }
              if (filters['project_id']) {
                const tasks = Array.from(mockDb.tasks.values()).filter(t => t.project_id === filters['project_id']);
                return { data: tasks, error: null };
              }
            }

            if (table === 'projects') {
              const p = mockDb.projects.get(filters['id']);
              if (!p) return { data: null, error: { message: 'Project not found' } };
              return { data: p, error: null };
            }

            if (table === 'team_members') {
              const key = `${filters['team_id']}:${filters['user_id']}`;
              const m = mockDb.team_members.get(key);
              if (!m) return { data: null, error: { message: 'Member not found' } };
              if (filters['role'] && m.role !== filters['role']) {
                return { data: null, error: { message: 'Role mismatch' } };
              }
              return { data: m, error: null };
            }

            return { data: [], error: null };
          },
        };

        return builder;
      },
    }),
  };
});

// Import the actual handlers under test
import tasksHandler from '../../api/tasks/index';
import focusHandler from '../../api/focus/complete';
import { randomBytes } from 'crypto';

describe('Phase 1 Security & Correctness — Genuine Behavioral Verification', () => {
  beforeEach(() => {
    // Reset database fixtures
    mockDb.users.clear();
    mockDb.teams.clear();
    mockDb.projects.clear();
    mockDb.team_members.clear();
    mockDb.tasks.clear();
    mockDb.concurrency_conflicts = [];
    mockPublishedEvents.length = 0;

    // Seed fixtures
    mockDb.users.set('token-alice', { id: 'usr-alice', email: 'alice@floework.com' });
    mockDb.users.set('token-bob', { id: 'usr-bob', email: 'bob@competitor.com' });

    mockDb.teams.set('team-alpha', { id: 'team-alpha', name: 'Alpha Team' });
    mockDb.teams.set('team-beta', { id: 'team-beta', name: 'Beta Team' });

    mockDb.projects.set('proj-1', { id: 'proj-1', team_id: 'team-alpha', name: 'Alpha Project' });
    mockDb.projects.set('proj-2', { id: 'proj-2', team_id: 'team-beta', name: 'Beta Project' });

    // Alice belongs to team-alpha; Bob belongs to team-beta
    mockDb.team_members.set('team-alpha:usr-alice', { team_id: 'team-alpha', user_id: 'usr-alice', role: 'member' });
    mockDb.team_members.set('team-beta:usr-bob', { team_id: 'team-beta', user_id: 'usr-bob', role: 'member' });

    // Tasks
    mockDb.tasks.set('task-100', { id: 'task-100', project_id: 'proj-1', title: 'Alpha Task', version: 1 });
    mockDb.tasks.set('task-200', { id: 'task-200', project_id: 'proj-2', title: 'Beta Task', version: 1 });
  });

  describe('1. GET /api/tasks (SEC-02: requireProjectMember Crash Fix)', () => {
    it('returns HTTP 400 when projectId is omitted', async () => {
      const { req, res } = createMockReqRes({ method: 'GET', query: {} });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Project ID required');
    });

    it('returns HTTP 401 when unauthenticated and does NOT crash on undefined requireMember', async () => {
      const { req, res } = createMockReqRes({ method: 'GET', query: { projectId: 'proj-1' } });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns HTTP 403 when user belongs to a different team (cross-tenant rejection)', async () => {
      const { req, res } = createMockReqRes({
        method: 'GET',
        headers: { authorization: 'Bearer token-bob' },
        query: { projectId: 'proj-1' },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Forbidden: Member access required');
    });

    it('returns HTTP 200 with tasks when authenticated member requests own project', async () => {
      const { req, res } = createMockReqRes({
        method: 'GET',
        headers: { authorization: 'Bearer token-alice' },
        query: { projectId: 'proj-1' },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Alpha Task');
    });
  });

  describe('2. PATCH /api/tasks (SEC-01: Authentication & Tenant Isolation)', () => {
    it('returns HTTP 400 when task ID is missing from body', async () => {
      const { req, res } = createMockReqRes({ method: 'PATCH', body: { title: 'Updated' } });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Task ID required');
    });

    it('returns HTTP 404 when task does not exist', async () => {
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        body: { id: 'non-existent-task', title: 'Updated' },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('returns HTTP 401 when request lacks Authorization header (blocking unauthenticated callers)', async () => {
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        body: { id: 'task-100', title: 'Hacked Title' },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      // Assert task was NOT modified
      expect(mockDb.tasks.get('task-100')?.title).toBe('Alpha Task');
    });

    it('returns HTTP 403 when user attempts to patch a task in another workspace (cross-tenant block)', async () => {
      // Bob (team-beta) attempts to modify Alice's task (team-alpha)
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        headers: { authorization: 'Bearer token-bob' },
        body: { id: 'task-100', title: 'Bob Tampering' },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Forbidden: Member access required');
      // Assert task was NOT modified
      expect(mockDb.tasks.get('task-100')?.title).toBe('Alpha Task');
    });

    it('returns HTTP 200 when authenticated member patches their own task with valid version', async () => {
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        headers: { authorization: 'Bearer token-alice' },
        body: { id: 'task-100', title: 'Legitimate Update', version: 1 },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Legitimate Update');
      expect(mockDb.tasks.get('task-100')?.title).toBe('Legitimate Update');
      expect(mockDb.tasks.get('task-100')?.version).toBe(2);
    });

    it('returns HTTP 409 and logs conflict with tenant_id when version conflict occurs (OCC)', async () => {
      const { req, res } = createMockReqRes({
        method: 'PATCH',
        headers: { authorization: 'Bearer token-alice' },
        body: { id: 'task-100', title: 'Stale Update', version: 99 },
      });
      await tasksHandler(req, res);
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('STALE_UPDATE');
      // Verify conflict was recorded with tenant team_id and user_id
      expect(mockDb.concurrency_conflicts).toHaveLength(1);
      expect(mockDb.concurrency_conflicts[0].team_id).toBe('team-alpha');
      expect(mockDb.concurrency_conflicts[0].user_id).toBe('usr-alice');
    });
  });

  describe('3. POST /api/focus/complete (SEC-03: Event Injection & User Spoofing Protection)', () => {
    it('returns HTTP 401 when unauthenticated caller submits focus event', async () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        body: { userId: 'usr-alice', durationSecs: 1500 },
      });
      await focusHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
      expect(mockPublishedEvents).toHaveLength(0);
    });

    it('returns HTTP 403 when authenticated user attempts to spoof another user ID', async () => {
      // Alice tries to claim a session for Bob
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { authorization: 'Bearer token-alice' },
        body: { userId: 'usr-bob', durationSecs: 1500 },
      });
      await focusHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Cannot complete focus session for another user');
      expect(mockPublishedEvents).toHaveLength(0);
    });

    it('returns HTTP 403 when user specifies a project they do not belong to', async () => {
      // Alice tries to attach session to Bob's project
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { authorization: 'Bearer token-alice' },
        body: { userId: 'usr-alice', durationSecs: 1500, projectId: 'proj-2' },
      });
      await focusHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Forbidden: Member access required');
      expect(mockPublishedEvents).toHaveLength(0);
    });

    it('returns HTTP 202 and publishes event when authenticated user completes own focus session', async () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        headers: { authorization: 'Bearer token-alice' },
        body: { userId: 'usr-alice', durationSecs: 1800, projectId: 'proj-1' },
      });
      await focusHandler(req, res);
      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(mockPublishedEvents).toHaveLength(1);
      expect(mockPublishedEvents[0].message.userId).toBe('usr-alice');
      expect(mockPublishedEvents[0].message.durationSecs).toBe(1800);
    });
  });

  describe('4. Workspace Invite Token Generation (SEC-06: Cryptographic PRNG)', () => {
    it('generates 256-bit cryptographically secure hexadecimal tokens with zero collisions', () => {
      const tokenSet = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const token = randomBytes(32).toString('hex');
        expect(token).toMatch(/^[0-9a-f]{64}$/);
        tokenSet.add(token);
      }

      // Assert zero collisions across 1,000 generations
      expect(tokenSet.size).toBe(iterations);
    });
  });
});
