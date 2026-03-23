import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Onboarding API Integration', () => {
    it('GET /api/v1/user/me/has-real-tasks requires auth', async () => {
        const res = await request(app).get('/api/v1/users/me/has-real-tasks');
        expect(res.status).toBe(401);
    });

    it('DELETE /api/v1/tasks/samples requires auth', async () => {
        const res = await request(app).delete('/api/v1/tasks/samples');
        expect(res.status).toBe(401);
    });
});
