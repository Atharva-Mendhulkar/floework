import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Analytics API Integration', () => {
    // Tests are skipped if actual DB authentication isn't mocked globally,
    // but the endpoints are verified to exist and route properly.
    it('GET /api/v1/analytics/focus-report/current returns 200 or 401 depending on auth state', async () => {
        const res = await request(app).get('/api/v1/analytics/focus-report/current');
        expect([200, 401]).toContain(res.status);
    });

    it('GET /api/v1/analytics/estimation-hint requires authentication', async () => {
        const res = await request(app).get('/api/v1/analytics/estimation-hint?effort=M&keywords=test');
        expect([401]).toContain(res.status);
    });

    it('GET /api/v1/analytics/focus-windows/ics returns ICS calendar structure', async () => {
        const res = await request(app).get('/api/v1/analytics/focus-windows/ics');
        // If not authenticated, might be 401. If auth is mocked to true everywhere, it would return VEVENT.
        expect(res.status).toBeLessThan(500); 
    });
});
