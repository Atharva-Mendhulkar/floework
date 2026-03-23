import { describe, it, expect } from 'vitest';

export function parsePRUrl(url: string) {
    // Expected: https://github.com/owner/repo/pull/123
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
    if (match) {
        return { owner: match[1], repo: match[2], prNumber: parseInt(match[3]) };
    }
    return null;
}

describe('prStatusChecker worker', () => {
    it('parsePRUrl: valid GitHub PR URL extracts owner, repo, prNumber', () => {
        const res = parsePRUrl('https://github.com/Atharva-Mendhulkar/floework/pull/42');
        expect(res).toEqual({ owner: 'Atharva-Mendhulkar', repo: 'floework', prNumber: 42 });
    });

    it('parsePRUrl: GitHub issues URL returns null', () => {
        const res = parsePRUrl('https://github.com/Atharva-Mendhulkar/floework/issues/42');
        expect(res).toBeNull();
    });

    it('parsePRUrl: non-GitHub URL returns null', () => {
        const res = parsePRUrl('https://gitlab.com/owner/repo/-/merge_requests/42');
        expect(res).toBeNull();
    });
});
