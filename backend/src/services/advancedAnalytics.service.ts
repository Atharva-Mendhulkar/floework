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
    type WeekData = { focusSecs: number; interrupts: number; sessions: number };
    const weeks: WeekData[] = [
        { focusSecs: 0, interrupts: 0, sessions: 0 },
        { focusSecs: 0, interrupts: 0, sessions: 0 },
        { focusSecs: 0, interrupts: 0, sessions: 0 },
        { focusSecs: 0, interrupts: 0, sessions: 0 },
    ];

    const now = Date.now();
    for (const s of sessions) {
        const weeksAgo = Math.floor((now - s.startTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weekIdx = Math.min(3, weeksAgo);
        weeks[3 - weekIdx].focusSecs += s.durationSecs;
        weeks[3 - weekIdx].interrupts += s.interrupts;
        weeks[3 - weekIdx].sessions += 1;
    }

    return weeks.map((w, i) => {
        const avgInterrupts = w.sessions > 0 ? w.interrupts / w.sessions : 0;
        const hoursPerDay = (w.focusSecs / 3600) / 7;
        // Risk: high interrupts + high hours per day
        const burnoutRisk = Math.min(100, Math.round(avgInterrupts * 8 + hoursPerDay * 6));
        return {
            week: `W${i + 1}`,
            focusHrs: parseFloat((w.focusSecs / 3600).toFixed(1)),
            interrupts: w.interrupts,
            burnoutRisk,
        };
    });
}
