import { describe, it, expect } from 'vitest';

export function extractKeywords(title: string): string[] {
    const STOP_WORDS = new Set(['a','an','the','and','or','to','of','for','in','on','with','add','fix','update','create','implement']);
    return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

describe('estimation utility', () => {
    it('extractKeywords filters stop words', () => {
        const res = extractKeywords('Update the database and fix bugs');
        expect(res).not.toContain('update');
        expect(res).not.toContain('the');
        expect(res).not.toContain('and');
        expect(res).not.toContain('fix');
        expect(res).toContain('database');
        expect(res).toContain('bugs');
    });

    it('extractKeywords filters words with length <= 3', () => {
        const res = extractKeywords('Hi API UX');
        expect(res.length).toBe(0);
    });

    it('extractKeywords("Refactor authentication middleware") returns ["refactor","authentication","middleware"]', () => {
        const res = extractKeywords('Refactor authentication middleware');
        expect(res).toEqual(['refactor', 'authentication', 'middleware']);
    });
});
