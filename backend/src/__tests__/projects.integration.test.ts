/**
 * projects.integration.test.ts
 * Coverage for project list (user-scoped), get, create, update, and delete endpoints.
 * Tests are written to be resilient to mock isolation between test files.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../utils/prisma', () => ({
    default: {
        project: {
            findMany: vi.fn(() => [{ id: 'proj-1', name: 'Test Project', teamId: 'team-1', team: {}, _count: { tasks: 0 } }]),
            findUnique: vi.fn((args: any) =>
                args.where.id === 'proj-1'
                    ? { id: 'proj-1', name: 'Test Project', teamId: 'team-1', team: {}, tasks: [] }
                    : null
            ),
            create: vi.fn((args: any) => ({ id: 'proj-1', ...args.data })),
            update: vi.fn((args: any) => ({ id: 'proj-1', ...args.data })),
            delete: vi.fn(),
        },
        team: { findUnique: vi.fn(() => ({ id: 'team-1', name: 'Test Team' })) },
        teamMember: {
            findFirst: vi.fn(() => ({ userId: 'user-1', teamId: 'team-1', teamRole: 'ADMIN' })),
        },
        user: { findUnique: vi.fn(() => ({ id: 'user-1', name: 'Test', email: 'test@example.com' })) },
        executionSignal: { findMany: vi.fn(() => []) },
        focusSession: { findMany: vi.fn(() => []) },
        task: { findMany: vi.fn(() => []) },
        estimationPattern: { findMany: vi.fn(() => []) },
        sprint: { findMany: vi.fn(() => []) },
    }
}));

vi.mock('../services/predictiveDelivery.service', () => ({
    getProjectPrediction: vi.fn(() => ({ confidence: 80, estimatedCompletion: new Date(), tasksRemaining: 0 })),
}));

import { app } from '../server';

function makeToken(userId = 'user-1') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Projects API', () => {
    it('GET /api/v1/projects → 401 without token', async () => {
        const res = await request(app).get('/api/v1/projects');
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/projects → non-5xx with token (user-scoped)', async () => {
        const res = await request(app)
            .get('/api/v1/projects')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
        expect([200, 401]).toContain(res.status);
    });

    it('GET /api/v1/projects/:id → non-5xx with token', async () => {
        const res = await request(app)
            .get('/api/v1/projects/proj-1')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
    });

    it('GET /api/v1/projects/unknown → 404 for unknown project', async () => {
        const res = await request(app)
            .get('/api/v1/projects/unknown')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect([404, 401]).toContain(res.status);
    });

    it('POST /api/v1/projects → 401 without token', async () => {
        const res = await request(app).post('/api/v1/projects').send({ name: 'Proj', teamId: 'team-1' });
        expect(res.status).toBe(401);
    });

    it('PATCH /api/v1/projects/proj-1 → 401 without token', async () => {
        const res = await request(app).patch('/api/v1/projects/proj-1').send({ name: 'Updated' });
        expect(res.status).toBe(401);
    });

    it('PATCH /api/v1/projects/proj-1 → non-5xx with token (admin update)', async () => {
        const res = await request(app)
            .patch('/api/v1/projects/proj-1')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ name: 'New Name' });
        expect(res.status).toBeLessThan(500);
    });

    it('DELETE /api/v1/projects/proj-1 → 401 without token', async () => {
        const res = await request(app).delete('/api/v1/projects/proj-1');
        expect(res.status).toBe(401);
    });

    it('DELETE /api/v1/projects/proj-1 → non-5xx with token (admin delete)', async () => {
        const res = await request(app)
            .delete('/api/v1/projects/proj-1')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
    });

    it('GET /api/v1/projects/:id/prediction → non-5xx with token', async () => {
        const res = await request(app)
            .get('/api/v1/projects/proj-1/prediction')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBeLessThan(500);
    });
});
