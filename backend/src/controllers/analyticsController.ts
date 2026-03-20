import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getTaskSignals } from '../services/executionSignals.service';
import { getUserStabilityGrid } from '../services/focusStability.service';
import { generateNarrative } from '../services/narrativeEngine.service';
import { getOrSet, TTL_SECONDS } from '../utils/cache';
import { getBottleneckReport, getBurnoutSignal } from '../services/advancedAnalytics.service';
import { HINT_MIN_SAMPLES, HINT_MIN_RATIO } from '../config/estimation';
import { getPeakWindows } from '../services/focusStability.service';
import ical, { ICalEventRepeatingFreq } from 'ical-generator';

// GET /analytics/task/:taskId/signals
export const getTaskExecutionSignals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { taskId } = req.params;
        const userId = (req as any).user.id;

        const signal = await getOrSet(
            `signals:task:${taskId}:${userId}`,
            TTL_SECONDS,
            () => getTaskSignals(taskId, userId)
        );

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

        const grid = await getOrSet(
            `stability:${userId}`,
            TTL_SECONDS,
            () => getUserStabilityGrid(userId)
        );

        res.json({ success: true, data: grid });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/narrative
export const getNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        const narrative = await getOrSet(`narrative:${userId}`, TTL_SECONDS, async () => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const signals = await prisma.executionSignal.findMany({ where: { userId } });

            const avgEffortDensity = signals.length > 0
                ? signals.reduce((a: number, s: any) => a + s.effortDensity, 0) / signals.length
                : 0;

            const avgResumeRate = signals.length > 0
                ? signals.reduce((a: number, s: any) => a + s.resumeRate, 0) / signals.length
                : 0;

            const blockerCount = signals.filter((s: any) => s.blockerRisk).length;

            const recentSessions = await prisma.focusSession.findMany({
                where: { userId, startTime: { gte: sevenDaysAgo }, endTime: { not: null } },
            });
            const totalFocusSecs = recentSessions.reduce((a: number, s: any) => a + s.durationSecs, 0);
            const totalFocusHrs = parseFloat((totalFocusSecs / 3600).toFixed(1));

            const topSlot = await prisma.focusStabilitySlot.findFirst({
                where: { userId },
                orderBy: { focusScore: 'desc' },
            });

            const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const peak = topSlot
                ? { day: DAY_NAMES[topSlot.dayOfWeek], hour: topSlot.hourOfDay }
                : null;

            return generateNarrative({ avgEffortDensity, blockerCount, peakSlot: peak, totalFocusHrs, avgResumeRate });
        });

        res.json({ success: true, data: narrative });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/bottlenecks
export const getBottlenecks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const report = await getBottleneckReport(userId);
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/burnout
export const getBurnout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const data = await getBurnoutSignal(userId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/focus-report
export const getFocusReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user.id;
        const reports = await (prisma as any).weeklyFocusReport.findMany({
            where: { userId },
            orderBy: { generatedAt: 'desc' },
            take: 4,
        });
        res.json({ success: true, data: reports });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/focus-report/current
export const getCurrentFocusReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user.id;
        const recentReports = await (prisma as any).weeklyFocusReport.findMany({
            where: { userId },
            orderBy: { generatedAt: 'desc' },
            take: 2,
        });

        if (recentReports.length === 0) {
            return res.json({ success: true, data: null });
        }

        const report = recentReports[0];
        
        // Check if report belongs to current week
        const d = new Date();
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const currentISOWeek = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;

        if (report.weekLabel !== currentISOWeek) {
            return res.json({ success: true, data: { ...report, isLastWeek: true } });
        }

        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/estimation-hint
export const getEstimationHint = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { effort, keywords } = req.query;
        const userId = (req as any).analyticsUserId || (req as any).user?.id || (req as any).user.id;
        
        if (!effort || !keywords) {
            return res.json({ success: true, data: null });
        }
        
        const keywordArr = (keywords as string).split(',');
        const patterns = await prisma.estimationPattern.findMany({
            where: {
                userId,
                predictedEffort: String(effort),
                keyword: { in: keywordArr },
                sampleSize: { gte: HINT_MIN_SAMPLES },
                ratio: { gte: HINT_MIN_RATIO }
            },
            orderBy: { ratio: 'desc' },
            take: 1
        });
        
        res.json({ success: true, data: patterns.length > 0 ? patterns[0] : null });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/estimation-accuracy
export const getEstimationAccuracy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user?.id || (req as any).user.id;
        const patterns = await prisma.estimationPattern.findMany({
            where: { userId },
            orderBy: { ratio: 'desc' }
        });
        
        let best = null;
        let worst = null;
        
        if (patterns.length > 0) {
            worst = patterns[0];
            const sorted = [...patterns].sort((a,b) => Math.abs(a.ratio - 1) - Math.abs(b.ratio - 1));
            best = sorted[0];
        }
        
        res.json({ 
            success: true, 
            data: { 
                patterns, 
                summary: { 
                    bestKeyword: best?.keyword, 
                    bestEffort: best?.predictedEffort, 
                    worstKeyword: worst?.keyword, 
                    worstEffort: worst?.predictedEffort 
                } 
            } 
        });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/focus-windows
export const getFocusWindows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user?.id || (req as any).user.id;
        const windows = await getOrSet(
            `focus:peak:${userId}`,
            TTL_SECONDS,
            () => getPeakWindows(userId)
        );
        res.json({ success: true, data: windows });
    } catch (error) {
        next(error);
    }
};

// GET /analytics/focus-windows/ics
export const getFocusWindowsIcs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user?.id || (req as any).user.id;
        const windows = await getOrSet(
            `focus:peak:${userId}`,
            TTL_SECONDS,
            () => getPeakWindows(userId)
        );

        const cal = ical({ name: 'Floework Deep Work Windows' });
        
        for (const w of windows) {
            // Calculate next occurrence of this dayOfWeek
            const d = new Date();
            const currentDay = d.getDay();
            const distance = (w.dayOfWeek + 7 - currentDay) % 7;
            const nextDate = new Date(d);
            nextDate.setDate(d.getDate() + distance);
            nextDate.setHours(w.startHour, 0, 0, 0);

            const endDate = new Date(nextDate);
            endDate.setHours(w.endHour, 0, 0, 0);

            cal.createEvent({
                start: nextDate,
                end: endDate,
                summary: 'Deep Work — Protected',
                description: 'Protected by Floework',
                repeating: { freq: ICalEventRepeatingFreq.WEEKLY }
            });
        }

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="floework-focus-windows.ics"');
        res.send(cal.toString());
    } catch (error) {
        next(error);
    }
};

// GET /analytics/ai-displacement
export const getAiDisplacement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).analyticsUserId || (req as any).user?.id || (req as any).user.id;
        
        const totalAiSessions = await prisma.focusSession.count({
            where: { userId, aiAssisted: true } as any
        });

        if (totalAiSessions < 5) {
            return res.json({ success: true, data: [] });
        }

        const data = await (prisma as any).aIDisplacementSummary.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 4
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};
