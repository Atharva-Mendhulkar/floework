import { describe, it, expect } from 'vitest';

export function computeInsight(aiAvg: number, humanAvg: number, aiEfforts: string[]) {
    if (aiEfforts.length === 0) return "No AI-assisted tasks logged this week.";
    if (aiAvg < humanAvg - 0.4) return "You tackle lighter tasks using AI assistance.";
    if (Math.abs(aiAvg - humanAvg) <= 0.4) return "Your AI and human tasks show similar complexity.";
    return "You reserve your most complex engineering for AI-assisted sessions.";
}

describe('aiDisplacementRoller worker', () => {
    it('computeInsight: aiAvg < humanAvg-0.4 → "lighter tasks" message', () => {
        expect(computeInsight(1.0, 2.0, ['M'])).toContain('lighter tasks');
    });

    it('computeInsight: roughly equal → "similar complexity" message', () => {
        expect(computeInsight(1.5, 1.6, ['M'])).toContain('similar complexity');
    });

    it('computeInsight: aiEfforts=[] → "No AI-assisted tasks" message', () => {
        expect(computeInsight(0, 0, [])).toContain('No AI-assisted tasks');
    });
});
