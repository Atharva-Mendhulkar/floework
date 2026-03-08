import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getTaskSignals } from '../services/executionSignals.service';
import { getUserStabilityGrid } from '../services/focusStability.service';
import { generateNarrative } from '../services/narrativeEngine.service';

// GET /analytics/task/:taskId/signals
export const getTaskExecutionSignals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { taskId } = req.params;
        const userId = (req as any).user.id;

        const signal = await getTaskSignals(taskId, userId);

        if (!signal) {
            return res.json({
                success: true,
                data: null,
                message: 'No signals yet — complete a focus session on this task to generate signals.',
            });
        }

        res.json({ success: true, data: signal });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/stability
export const getStabilityGrid = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const grid = await getUserStabilityGrid(userId);
        res.json({ success: true, data: grid });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/narrative
export const getNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Aggregate execution signals for this user
        const signals = await prisma.executionSignal.findMany({ where: { userId } });

        const avgEffortDensity = signals.length > 0
            ? signals.reduce((a, s) => a + s.effortDensity, 0) / signals.length
            : 0;

        const avgResumeRate = signals.length > 0
            ? signals.reduce((a, s) => a + s.resumeRate, 0) / signals.length
            : 0;

        const blockerCount = signals.filter((s) => s.blockerRisk).length;

        // Total focus hours this week
        const recentSessions = await prisma.focusSession.findMany({
            where: { userId, startTime: { gte: sevenDaysAgo }, endTime: { not: null } },
        });
        const totalFocusSecs = recentSessions.reduce((a, s) => a + s.durationSecs, 0);
        const totalFocusHrs = parseFloat((totalFocusSecs / 3600).toFixed(1));

        // Peak stability slot
        const topSlot = await prisma.focusStabilitySlot.findFirst({
            where: { userId },
            orderBy: { focusScore: 'desc' },
        });

        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const peak = topSlot
            ? { day: DAY_NAMES[topSlot.dayOfWeek], hour: topSlot.hourOfDay }
            : null;

        const narrative = generateNarrative({
            avgEffortDensity,
            blockerCount,
            peakSlot: peak,
            totalFocusHrs,
            avgResumeRate,
        });

        res.json({ success: true, data: narrative });
    } catch (error) {
        next(error);
    }
};
