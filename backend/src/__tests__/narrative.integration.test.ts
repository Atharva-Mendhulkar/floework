import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

vi.mock('../utils/prisma', () => ({
    default: { effortNarrative: { findUnique: vi.fn().mockResolvedValue(null) } }
}));

describe('Narrative API Integration', () => {
    it('GET /api/v1/narrative/shared/:token → 404 for unknown token', async () => {
        const res = await request(app).get('/api/v1/narrative/shared/fake-token-12345');
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Link expired or invalid');
    });

    it('PATCH /api/v1/narrative/:id requires authentication', async () => {
        const res = await request(app).patch('/api/v1/narrative/123').send({ body: "test" });
        expect(res.status).toBe(401);
    });
});
