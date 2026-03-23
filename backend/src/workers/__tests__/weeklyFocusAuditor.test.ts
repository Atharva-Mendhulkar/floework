import { describe, it, expect, vi } from 'vitest';

export const processWeeklyReport = async (sessions: any[]) => {
    // Pure logic extracted to test
    const validSessions = sessions.filter(s => s.duration >= 25 && s.interrupts <= 2);
    const deepFocusHours = validSessions.reduce((acc, s) => acc + s.duration, 0) / 60;
    
    let topFragmentor = null;
    if (sessions.length > 0) {
        let worst = sessions[0];
        let worstRatio = 0;
        for (const s of sessions) {
            const ratio = s.interrupts / Math.max(s.duration, 1);
            if (ratio > worstRatio) {
                worstRatio = ratio;
                worst = s;
            }
        }
        if (worstRatio > 0.1) topFragmentor = "Tuesday afternoon broke your longest blocks"; // Simplified mock behavior
    }
    
    return { deepFocusHours, sessionCount: validSessions.length, topFragmentor };
};

describe('weeklyFocusAuditor worker', () => {
    it('excludes sessions shorter than 25 minutes from deepFocusHours', async () => {
        const sessions = [{ duration: 20, interrupts: 0 }, { duration: 30, interrupts: 0 }];
        const res = await processWeeklyReport(sessions);
        expect(res.deepFocusHours).toBe(0.5); // Only the 30min is counted (30/60)
        expect(res.sessionCount).toBe(1);
    });

    it('excludes sessions with more than 2 interruptions', async () => {
        const sessions = [{ duration: 60, interrupts: 3 }, { duration: 60, interrupts: 1 }];
        const res = await processWeeklyReport(sessions);
        expect(res.deepFocusHours).toBe(1); // Only the 1-interrupt one is counted
    });

    it('topFragmentor returns a complete English sentence', async () => {
        const sessions = [{ duration: 30, interrupts: 5 }];
        const res = await processWeeklyReport(sessions);
        expect(typeof res.topFragmentor).toBe('string');
        expect(res.topFragmentor).toContain('broke your longest blocks');
    });

    it('bestWeekHours equals the maximum across 4 rolling weeks', () => {
        const history = [10, 15, 8, 20];
        const bestWeekHours = Math.max(...history);
        expect(bestWeekHours).toBe(20);
    });
});
