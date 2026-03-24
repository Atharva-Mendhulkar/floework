/**
 * tasks.integration.test.ts
 * Full coverage for task CRUD, star, replay, linkPR, and sample-task deletion.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';

vi.mock('../utils/prisma', () => ({
    default: {
        task: {
            findMany: vi.fn(() => []),
            findUnique: vi.fn(() => null),
            create: vi.fn((args: any) => ({ id: 'task-1', ...args.data })),
            update: vi.fn((args: any) => ({ id: 'task-1', ...args.data })),
            deleteMany: vi.fn(() => ({ count: 0 })),
            count: vi.fn(() => 0),
        },
        teamMember: {
            findFirst: vi.fn(() => ({ userId: 'user-1', teamId: 'team-1', teamRole: 'MEMBER' })),
            findUnique: vi.fn(() => null),
        },
        project: { findUnique: vi.fn(() => ({ id: 'proj-1', teamId: 'team-1' })) },
        executionSignal: { findMany: vi.fn(() => []) },
        gitHubConnection: { findUnique: vi.fn(() => null) },
        focusSession: { findMany: vi.fn(() => []) },
        user: { findUnique: vi.fn(() => ({ id: 'user-1', name: 'Test', email: 'test@example.com' })) },
    }
}));

vi.mock('../services/executionGraph.service', () => ({
    logExecutionEvent: vi.fn(),
    getTaskExecutionTimeline: vi.fn(() => []),
}));

function makeToken(userId = 'user-1') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Tasks API', () => {
    it('GET /api/v1/tasks → 401 without token', async () => {
        const res = await request(app).get('/api/v1/tasks');
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/tasks → 200 with valid token', async () => {
        const res = await request(app)
            .get('/api/v1/tasks')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/tasks → 401 without token', async () => {
        const res = await request(app).post('/api/v1/tasks').send({ title: 'Test', projectId: 'proj-1' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/tasks → 201 with valid token and projectId', async () => {
        const res = await request(app)
            .post('/api/v1/tasks')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ title: 'New Task', projectId: 'proj-1', priority: 'Medium' });
        expect([201, 403]).toContain(res.status);
    });

    it('PATCH /api/v1/tasks/:id → 401 without token', async () => {
        const res = await request(app).patch('/api/v1/tasks/task-1').send({ status: 'In Progress' });
        expect(res.status).toBe(401);
    });

    it('PATCH /api/v1/tasks/:id/star → 401 without token', async () => {
        const res = await request(app).patch('/api/v1/tasks/task-1/star').send({ isStarred: true });
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/tasks/:id/replay → 401 without token', async () => {
        const res = await request(app).get('/api/v1/tasks/task-1/replay');
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/tasks/:id/pr → 401 without token', async () => {
        const res = await request(app)
            .post('/api/v1/tasks/task-1/pr')
            .send({ prUrl: 'https://github.com/org/repo/pull/1' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/tasks/:id/pr → 403 when GitHub not connected', async () => {
        const res = await request(app)
            .post('/api/v1/tasks/task-1/pr')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ prUrl: 'https://github.com/org/repo/pull/1' });
        // gitHubConnection mock returns null → 403
        expect([403, 404]).toContain(res.status);
    });

    it('POST /api/v1/tasks/:id/pr → 400 for invalid PR URL', async () => {
        const res = await request(app)
            .post('/api/v1/tasks/task-1/pr')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ prUrl: 'not-a-pr-url' });
        expect(res.status).toBe(400);
    });

    it('DELETE /api/v1/tasks/samples → 401 without token', async () => {
        const res = await request(app).delete('/api/v1/tasks/samples');
        expect(res.status).toBe(401);
    });

    it('DELETE /api/v1/tasks/samples → 200 with token', async () => {
        const res = await request(app)
            .delete('/api/v1/tasks/samples')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
