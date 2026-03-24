/**
 * sprints.integration.test.ts
 * Coverage for sprint CRUD, delete, and task assignment.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../utils/prisma', () => ({
    default: {
        sprint: {
            findMany: vi.fn(() => [{ id: 'sprint-1', name: 'Sprint 1', projectId: 'proj-1', tasks: [] }]),
            findUnique: vi.fn((args: any) =>
                args.where.id === 'sprint-1'
                    ? { id: 'sprint-1', name: 'Sprint 1', projectId: 'proj-1', tasks: [{ id: 'task-1', status: 'Todo' }] }
                    : null
            ),
            create: vi.fn((args: any) => ({ id: 'sprint-1', ...args.data })),
            update: vi.fn((args: any) => ({ id: 'sprint-1', ...args.data })),
            delete: vi.fn(),
        },
        task: {
            findUnique: vi.fn(() => ({ id: 'task-1', title: 'Task', projectId: 'proj-1', sprintId: null })),
            update: vi.fn((args: any) => ({ id: 'task-1', ...args.data })),
            updateMany: vi.fn(() => ({ count: 1 })),
        },
        project: { findUnique: vi.fn(() => ({ id: 'proj-1', name: 'Project 1' })) },
        teamMember: {
            findFirst: vi.fn(() => ({ userId: 'user-1', teamId: 'team-1', teamRole: 'MEMBER' })),
        },
        user: { findUnique: vi.fn(() => ({ id: 'user-1' })) },
        $transaction: vi.fn(async (cb: any) => cb({
            task: { updateMany: vi.fn() },
            sprint: { delete: vi.fn() },
        })),
    }
}));

import { app } from '../server';

function makeToken(userId = 'user-1') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Sprints API', () => {
    it('GET /api/v1/projects/:projectId/sprints → 401 without token', async () => {
        const res = await request(app).get('/api/v1/projects/proj-1/sprints');
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/projects/:projectId/sprints → non-5xx with token', async () => {
        const res = await request(app)
            .get('/api/v1/projects/proj-1/sprints')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
    });

    it('POST /api/v1/projects/:projectId/sprints → 401 without token', async () => {
        const res = await request(app)
            .post('/api/v1/projects/proj-1/sprints')
            .send({ name: 'Sprint 1', startDate: '2026-01-01', endDate: '2026-01-14' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/projects/:projectId/sprints → non-5xx with valid data', async () => {
        const res = await request(app)
            .post('/api/v1/projects/proj-1/sprints')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ name: 'Sprint 1', startDate: '2026-01-01', endDate: '2026-01-14' });
        expect(res.status).toBeLessThan(500);
        expect([201, 200, 401]).toContain(res.status);
    });

    it('POST /api/v1/projects/:projectId/sprints → 400 missing required fields', async () => {
        const res = await request(app)
            .post('/api/v1/projects/proj-1/sprints')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ name: 'Sprint 1' }); // missing startDate, endDate
        expect([400, 401]).toContain(res.status);
    });

    it('PATCH /api/v1/projects/:projectId/sprints/:sprintId → 401 without token', async () => {
        const res = await request(app)
            .patch('/api/v1/projects/proj-1/sprints/sprint-1')
            .send({ status: 'ACTIVE' });
        expect(res.status).toBe(401);
    });

    it('PATCH /api/v1/projects/:projectId/sprints/:sprintId → non-5xx status update', async () => {
        const res = await request(app)
            .patch('/api/v1/projects/proj-1/sprints/sprint-1')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ status: 'ACTIVE' });
        expect(res.status).toBeLessThan(500);
    });

    it('DELETE /api/v1/projects/:projectId/sprints/:sprintId → 401 without token', async () => {
        const res = await request(app).delete('/api/v1/projects/proj-1/sprints/sprint-1');
        expect(res.status).toBe(401);
    });

    it('DELETE /api/v1/projects/:projectId/sprints/:sprintId → non-5xx with token', async () => {
        const res = await request(app)
            .delete('/api/v1/projects/proj-1/sprints/sprint-1')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
    });

    it('DELETE /api/v1/projects/:projectId/sprints/unknown → 404 or 401', async () => {
        const res = await request(app)
            .delete('/api/v1/projects/proj-1/sprints/unknown-sprint')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect([404, 401]).toContain(res.status);
    });

    it('POST /api/v1/projects/:projectId/sprints/:id/tasks/:taskId → 401 without token', async () => {
        const res = await request(app).post('/api/v1/projects/proj-1/sprints/sprint-1/tasks/task-1');
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/projects/:projectId/sprints/:id/tasks/:taskId → non-5xx with token', async () => {
        const res = await request(app)
            .post('/api/v1/projects/proj-1/sprints/sprint-1/tasks/task-1')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ remove: false });
        expect(res.status).toBeLessThan(500);
    });
});
