/**
 * teams.integration.test.ts
 * Coverage for team CRUD, invite, join, role updates, and member removal.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';

vi.mock('../utils/prisma', () => ({
    default: {
        team: {
            findMany: vi.fn(() => [{ id: 'team-1', name: 'Test Team', members: [] }]),
            create: vi.fn((args: any) => ({ id: 'team-1', ...args.data, members: [] })),
            findUnique: vi.fn(() => ({ id: 'team-1', name: 'Test Team' })),
        },
        teamMember: {
            findUnique: vi.fn(({ where }: any) =>
                // inviter check passes; new member check returns null (not yet in team)
                where.userId_teamId?.userId === 'user-1'
                    ? { userId: 'user-1', teamId: 'team-1', teamRole: 'ADMIN' }
                    : null
            ),
            findFirst: vi.fn(() => ({ userId: 'user-1', teamId: 'team-1', teamRole: 'ADMIN' })),
            create: vi.fn((args: any) => args.data),
            update: vi.fn((args: any) => ({ ...args.data, user: { id: 'user-2', name: 'Member' } })),
            delete: vi.fn(),
        },
        user: {
            findUnique: vi.fn(({ where }: any) =>
                where.email === 'newmember@example.com'
                    ? { id: 'user-2', email: 'newmember@example.com', name: 'New Member' }
                    : { id: 'user-1', email: 'test@example.com', name: 'Test' }
            ),
        },
        invitation: {
            create: vi.fn((args: any) => ({ id: 'inv-1', token: 'valid-token', ...args.data })),
            findUnique: vi.fn(({ where }: any) =>
                where.token === 'valid-token'
                    ? { id: 'inv-1', token: 'valid-token', teamId: 'team-1', role: 'MEMBER', status: 'PENDING', expiresAt: new Date(Date.now() + 86400000) }
                    : null
            ),
            update: vi.fn(),
        },
        $transaction: vi.fn(async (cb: any) => cb({ teamMember: { create: vi.fn((args: any) => ({ ...args.data, team: { id: 'team-1' } })) }, invitation: { update: vi.fn() } })),
    }
}));

function makeToken(userId = 'user-1') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Teams API', () => {
    it('GET /api/v1/teams → 401 without token', async () => {
        const res = await request(app).get('/api/v1/teams');
        expect(res.status).toBe(401);
    });

    it('GET /api/v1/teams → 200 with token', async () => {
        const res = await request(app)
            .get('/api/v1/teams')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/teams → 401 without token', async () => {
        const res = await request(app).post('/api/v1/teams').send({ name: 'My Team' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/teams → 201 with valid token and name', async () => {
        const res = await request(app)
            .post('/api/v1/teams')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ name: 'New Team', description: 'A test team' });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/teams → 400 without name', async () => {
        const res = await request(app)
            .post('/api/v1/teams')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/v1/teams/:teamId/invite → 401 without token', async () => {
        const res = await request(app)
            .post('/api/v1/teams/team-1/invite')
            .send({ email: 'newmember@example.com' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/teams/:teamId/invite → 200 when admin sends invite', async () => {
        const res = await request(app)
            .post('/api/v1/teams/team-1/invite')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ email: 'newmember@example.com' });
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('token');
    });

    it('POST /api/v1/teams/:teamId/invite → 400 without email', async () => {
        const res = await request(app)
            .post('/api/v1/teams/team-1/invite')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/v1/teams/join → 401 without token', async () => {
        const res = await request(app).post('/api/v1/teams/join').send({ token: 'valid-token' });
        expect(res.status).toBe(401);
    });

    it('POST /api/v1/teams/join → 400 with invalid token', async () => {
        const res = await request(app)
            .post('/api/v1/teams/join')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ token: 'bad-token' });
        expect(res.status).toBe(404);
    });

    it('PATCH /api/v1/teams/:teamId/members/:userId → 401 without token', async () => {
        const res = await request(app)
            .patch('/api/v1/teams/team-1/members/user-2')
            .send({ role: 'ADMIN' });
        expect(res.status).toBe(401);
    });

    it('PATCH /api/v1/teams/:teamId/members/:userId → 400 for invalid role', async () => {
        const res = await request(app)
            .patch('/api/v1/teams/team-1/members/user-2')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ role: 'SUPERSTAR' });
        expect(res.status).toBe(400);
    });

    it('PATCH /api/v1/teams/:teamId/members/:userId → 200 for valid role change', async () => {
        const res = await request(app)
            .patch('/api/v1/teams/team-1/members/user-2')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ role: 'ADMIN' });
        expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/teams/:teamId/members/:userId → 401 without token', async () => {
        const res = await request(app).delete('/api/v1/teams/team-1/members/user-2');
        expect(res.status).toBe(401);
    });

    it('DELETE /api/v1/teams/:teamId/members/:userId → 200 when admin removes member', async () => {
        const res = await request(app)
            .delete('/api/v1/teams/team-1/members/user-2')
            .set('Authorization', `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
    });
});
