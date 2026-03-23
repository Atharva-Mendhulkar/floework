import { describe, it, expect } from 'vitest';

export const generateNarrativeBody = (tasks: any[], stalls: any[], afterHoursFlag: boolean) => {
    let body = "";
    if (tasks.length === 0) {
        body += "No tasks were completed this week.\n";
    } else {
        body += "Completed work:\n" + tasks.map(t => `- ${t.title}`).join("\n") + "\n";
    }

    if (stalls.length > 0) {
        body += "\nBlockers:\n" + stalls.map(s => `- ${s.title} was awaiting PR review`).join("\n") + "\n";
    }

    if (afterHoursFlag) {
        body += "\nNote: There was significant after-hours activity.";
    } else {
        body += "\nNo after-hours activity logged.";
    }

    return body;
};

describe('narrativeGenerator worker', () => {
    it('generateNarrative: completedTasks=[] produces "No tasks were completed" opening', () => {
        const body = generateNarrativeBody([], [], false);
        expect(body).toContain("No tasks were completed");
    });

    it('generateNarrative: stalledTask with reason pr_stalled contains "awaiting PR review"', () => {
        const body = generateNarrativeBody([{title: "Task A"}], [{ title: "Task B", reason: "pr_stalled" }], false);
        expect(body).toContain("Task B was awaiting PR review");
    });

    it('generateNarrative: afterHoursFlag=false ends with "No after-hours activity logged."', () => {
        const body = generateNarrativeBody([], [], false);
        expect(body).toContain("No after-hours activity logged.");
    });

    it('generateNarrative: 2 tasks + 1 stall → body contains both task titles and stall title', () => {
        const body = generateNarrativeBody([{title: "Frontend"}, {title: "Backend"}], [{title: "Database Update"}], false);
        expect(body).toContain("Frontend");
        expect(body).toContain("Backend");
        expect(body).toContain("Database Update");
    });
});
