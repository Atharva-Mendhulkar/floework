import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Server & API Health', () => {
    it('should return a 200 OK from the healthcheck endpoint', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 404 for unknown endpoints', async () => {
        const response = await request(app).get('/api/unknown-route-1234');
        expect(response.status).toBe(404);
        expect(response.text).toContain('Cannot GET');
    });
});
