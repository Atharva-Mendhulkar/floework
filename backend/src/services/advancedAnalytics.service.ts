import prisma from '../utils/prisma';

export interface BottleneckReport {
    taskId: string;
    taskTitle: string;
    effortDensity: number;
    resumeRate: number;
    sessionCount: number;
    totalFocusHrs: number;
    blockerRisk: boolean;
    bottleneckScore: number; // 0–100, higher = more blocking
    recommendation: string;
}

export async function getBottleneckReport(userId: string): Promise<BottleneckReport[]> {
    const signals = await prisma.executionSignal.findMany({
        where: { userId },
        include: { task: { select: { id: true, title: true, status: true } } },
        orderBy: { effortDensity: 'asc' },
    });

    const sessions = await prisma.focusSession.findMany({
        where: { userId, endTime: { not: null } },
    });

    // Group sessions by task
    const sessionsByTask: Record<string, typeof sessions> = {};
    for (const s of sessions) {
        if (!sessionsByTask[s.taskId]) sessionsByTask[s.taskId] = [];
        sessionsByTask[s.taskId].push(s);
    }

    return signals.map((sig) => {
        const taskSessions = sessionsByTask[sig.taskId] || [];
        const totalFocusSecs = taskSessions.reduce((a, s) => a + s.durationSecs, 0);

        // Bottleneck score = high effort + low density + many sessions but no completion
        const rawScore = (
            (1 - sig.effortDensity) * 40 +     // fragmentation weight
            Math.min(sig.resumeRate, 5) * 10 +   // context-switching weight
            Math.min(taskSessions.length, 10) * 5 // volume of sessions without done
        );
        const bottleneckScore = Math.min(100, Math.round(rawScore));

        let recommendation = '';
        if (sig.blockerRisk) {
            recommendation = 'This task shows a structural blocker — review dependencies and reduce scope.';
        } else if (sig.effortDensity < 0.4) {
            recommendation = 'High fragmentation. Protect a dedicated focus block for this task.';
        } else if (sig.resumeRate > 3) {
            recommendation = 'Frequent context switches. Consider batching this task into fewer, longer sessions.';
        } else {
            recommendation = 'Execution is progressing normally.';
        }

        return {
            taskId: sig.taskId,
            taskTitle: sig.task.title,
            effortDensity: sig.effortDensity,
            resumeRate: sig.resumeRate,
            sessionCount: taskSessions.length,
            totalFocusHrs: parseFloat((totalFocusSecs / 3600).toFixed(1)),
            blockerRisk: sig.blockerRisk,
            bottleneckScore,
            recommendation,
        };
    }).sort((a, b) => b.bottleneckScore - a.bottleneckScore);
}

export async function getBurnoutSignal(userId: string) {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const sessions = await prisma.focusSession.findMany({
        where: { userId, startTime: { gte: fourWeeksAgo }, endTime: { not: null } },
        orderBy: { startTime: 'asc' },
    });

    // Bucket by week
    type WeekData = { focusSecs: number; interrupts: number; sessions: number; fragmented: number; afterHours: number; activeDays: Set<string> };
    const weeks: WeekData[] = [
        { focusSecs: 0, interrupts: 0, sessions: 0, fragmented: 0, afterHours: 0, activeDays: new Set() },
        { focusSecs: 0, interrupts: 0, sessions: 0, fragmented: 0, afterHours: 0, activeDays: new Set() },
        { focusSecs: 0, interrupts: 0, sessions: 0, fragmented: 0, afterHours: 0, activeDays: new Set() },
        { focusSecs: 0, interrupts: 0, sessions: 0, fragmented: 0, afterHours: 0, activeDays: new Set() },
    ];

    const now = Date.now();
    for (const s of sessions) {
        const weeksAgo = Math.floor((now - s.startTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weekIdx = Math.min(3, weeksAgo);
        const wIdx = 3 - weekIdx;

        weeks[wIdx].focusSecs += s.durationSecs;
        weeks[wIdx].interrupts += s.interrupts;
        weeks[wIdx].sessions += 1;
        // Track distinct calendar days for accurate hoursPerDay
        const dateKey = s.startTime.toISOString().split('T')[0];
        weeks[wIdx].activeDays.add(dateKey);

        // Fragmentation Penalty (< 10 min sessions)
        if (s.durationSecs < 600) {
            weeks[wIdx].fragmented += 1;
        }

        const hour = s.startTime.getHours();
        const day = s.startTime.getDay();
        // Assuming Work Hours: 8 AM to 6 PM, Mon-Fri. Anything else is after-hours.
        if (day === 0 || day === 6 || hour < 8 || hour >= 18) {
            weeks[wIdx].afterHours += 1;
        }
    }

    const past3WeeksFocusSecs = weeks[0].focusSecs + weeks[1].focusSecs + weeks[2].focusSecs;
    const avgFocusHrsPast3Weeks = (past3WeeksFocusSecs / 3600) / 3;

    return weeks.map((w, i) => {
        const avgInterrupts = w.sessions > 0 ? w.interrupts / w.sessions : 0;
        const activeDays = Math.max(1, w.activeDays.size);
        const hoursPerDay = (w.focusSecs / 3600) / activeDays; // use actual active days, not 7
        const totalFocusHrs = w.focusSecs / 3600;

        // Base risk: high interrupts + high hours per day
        let burnoutRisk = avgInterrupts * 8 + hoursPerDay * 6;
        const factors: string[] = [];

        // Apply Fragmentation Penalty
        if (w.fragmented > 0) {
            const ratio = w.fragmented / w.sessions;
            if (ratio > 0.3 && w.sessions > 5) {
                burnoutRisk += 15;
                factors.push(`High fragmentation (${w.fragmented} micro-sessions)`);
            } else {
                burnoutRisk += w.fragmented * 2;
            }
        }

        // Apply After-Hours Penalty
        if (w.afterHours > 0) {
            burnoutRisk += w.afterHours * 5;
            factors.push(`Late hours (${w.afterHours} sessions outside work time)`);
        }

        // Apply Volume Spike Penalty (only if we have a solid baseline)
        if (i === 3 && avgFocusHrsPast3Weeks > 5 && totalFocusHrs > avgFocusHrsPast3Weeks * 1.5) {
            burnoutRisk += 20;
            factors.push(`Volume spike (${totalFocusHrs.toFixed(1)}h vs ${avgFocusHrsPast3Weeks.toFixed(1)}h avg)`);
        }

        return {
            week: `W${i + 1}`,
            focusHrs: parseFloat(totalFocusHrs.toFixed(1)),
            interrupts: w.interrupts,
            burnoutRisk: Math.min(100, Math.round(burnoutRisk)),
            factors,
        };
    });
}
