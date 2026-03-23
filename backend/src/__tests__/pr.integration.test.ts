import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('PR Link API Integration', () => {
    it('POST /api/v1/tasks/:id/pr requires auth and returns 401 without token', async () => {
        const res = await request(app)
            .post('/api/v1/tasks/task-123/pr')
            .send({ prUrl: 'https://github.com/foo/bar/pull/1' });
        expect(res.status).toBe(401);
    });
});
