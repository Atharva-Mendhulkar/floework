interface NarrativeInput {
    avgEffortDensity: number;
    blockerCount: number;
    peakSlot: { day: string; hour: number } | null;
    totalFocusHrs: number;
    avgResumeRate: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function generateNarrative(input: NarrativeInput): {
    summary: string;
    highlights: string[];
    warnings: string[];
} {
    const highlights: string[] = [];
    const warnings: string[] = [];

    // Effort density
    if (input.avgEffortDensity > 0.7) {
        highlights.push('Execution continuity was strong — work sessions were largely uninterrupted.');
    } else if (input.avgEffortDensity >= 0.4) {
        highlights.push('Moderate execution continuity — some fragmentation present.');
    } else if (input.avgEffortDensity > 0) {
        warnings.push('Work sessions were highly fragmented this week. Consider protecting dedicated focus blocks.');
    }

    // Resume rate
    if (input.avgResumeRate > 2) {
        warnings.push('High context-switching detected — tasks were resumed frequently, increasing cognitive load.');
    }

    // Blocker signals
    if (input.blockerCount === 1) {
        warnings.push('1 task shows a blocker signal: high effort invested but low progress. Worth investigating.');
    } else if (input.blockerCount > 1) {
        warnings.push(`${input.blockerCount} tasks show blocker signals — high effort but slow progress. Structural blockers likely.`);
    }

    // Peak focus window
    if (input.peakSlot) {
        highlights.push(
            `Your most productive window is ${DAY_NAMES[input.peakSlot.day as any] || input.peakSlot.day} around ${input.peakSlot.hour}:00.`
        );
    }

    // Total focus hours
    if (input.totalFocusHrs > 25) {
        highlights.push(`High-volume execution week with ${input.totalFocusHrs.toFixed(1)} total focus hours.`);
    } else if (input.totalFocusHrs > 0) {
        highlights.push(`${input.totalFocusHrs.toFixed(1)} total focus hours recorded this week.`);
    }

    // Summary
    let summary = 'No focus sessions recorded yet — start a session from any task card.';
    if (input.totalFocusHrs > 0) {
        if (input.blockerCount === 0 && input.avgEffortDensity > 0.6) {
            summary = 'Solid execution week. Strong continuity and no blockers detected.';
        } else if (input.blockerCount > 0) {
            summary = 'Productive week, but blockers are slowing progress on some tasks.';
        } else {
            summary = 'Moderate execution week — focus continuity can be improved.';
        }
    }

    return { summary, highlights, warnings };
}
