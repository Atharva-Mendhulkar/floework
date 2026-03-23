import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Focus API Integration', () => {
    it('POST /api/v1/focus/stop rejects if authenticated user is missing', async () => {
        const res = await request(app)
            .post('/api/v1/focus/stop')
            .send({ sessionId: "123", aiAssisted: true });
        // Without auth token
        expect(res.status).toBe(401);
    });
});
