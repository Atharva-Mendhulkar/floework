import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';

// Mock auth middleware to return a known user
vi.mock('../middleware/authMiddleware', () => ({
    protect: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', email: 'test@example.com' };
        next();
    }
}));

describe('Middleware Integration', () => {
    it('enforceDataOwnership → 403 when userId query param differs from token userId', async () => {
        const res = await request(app)
            .get('/api/v1/analytics/stability?userId=other-user-id');
        expect(res.status).toBe(403);
    });

    it('enforceDataOwnership → passes when userId query matches or is omitted', async () => {
        const res = await request(app)
            .get('/api/v1/analytics/stability');
        expect(res.status).not.toBe(403);
    });
});
