import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Get today's productivity logs for a user
export const getDailyProductivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await prisma.productivityLog.findMany({
            where: {
                userId,
                date: {
                    gte: today,
                },
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        next(error);
    }
};

// Log a new productivity metric
export const logProductivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { metric, value } = req.body;
        const userId = (req as any).user.id;

        const log = await prisma.productivityLog.create({
            data: {
                userId,
                metric,
                value,
            },
        });

        res.status(201).json({ success: true, data: log });
    } catch (error) {
        next(error);
    }
};

export const getTeamStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Find all users and their active focus session if any
        const users = await prisma.user.findMany({
            include: {
                focusSessions: {
                    where: { endTime: null },
                    include: { task: true }
                }
            }
        });

        const teamStatus = users.map(user => {
            const activeSession = user.focusSessions[0];
            return {
                member: {
                    id: user.id,
                    name: user.name,
                    initials: user.name.substring(0, 2).toUpperCase(),
                    color: "bg-blue-500", // Fallback color
                },
                status: activeSession ? "In Focus" : "Available",
                task: activeSession?.task.title || null
            };
        });

        res.json({ success: true, data: teamStatus });
    } catch (error) {
        next(error);
    }
};

export const getAnalyticsDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const sessions = await prisma.focusSession.findMany({
            where: {
                userId,
                endTime: { not: null },
                startTime: { gte: sevenDaysAgo },
            },
            orderBy: { startTime: 'asc' },
        });

        // Bucket by abbreviated day name
        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayMap: Record<string, { focusSecs: number; sessions: number }> = {};
        for (const s of sessions) {
            const key = DAY_NAMES[s.startTime.getDay()];
            if (!dayMap[key]) dayMap[key] = { focusSecs: 0, sessions: 0 };
            dayMap[key].focusSecs += s.durationSecs;
            dayMap[key].sessions += 1;
        }

        // Produce last-7-days ordered barData
        const barData = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
            const key = DAY_NAMES[d.getDay()];
            const entry = dayMap[key] || { focusSecs: 0, sessions: 0 };
            return {
                day: key,
                focusHrs: parseFloat((entry.focusSecs / 3600).toFixed(1)),
                tasksCompleted: entry.sessions,
            };
        });

        // Burnout trend: last 6 weeks of interrupt counts
        const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
        const allSessions = await prisma.focusSession.findMany({
            where: { userId, startTime: { gte: sixWeeksAgo }, endTime: { not: null } },
        });

        const weekMap: Record<string, { interrupts: number; count: number }> = {};
        for (const s of allSessions) {
            const weekNum = Math.floor((Date.now() - s.startTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const key = `W${6 - weekNum}`;
            if (!weekMap[key]) weekMap[key] = { interrupts: 0, count: 0 };
            weekMap[key].interrupts += s.interrupts;
            weekMap[key].count += 1;
        }

        const burnoutData = Array.from({ length: 6 }, (_, i) => {
            const key = `W${i + 1}`;
            const entry = weekMap[key] || { interrupts: 0, count: 0 };
            const avgInterrupts = entry.count > 0 ? entry.interrupts / entry.count : 0;
            return {
                week: key,
                interrupts: Math.round(entry.interrupts),
                burnoutRisk: Math.min(100, Math.round(avgInterrupts * 12)),
            };
        });

        res.json({ success: true, data: { barData, burnoutData } });
    } catch (error) {
        next(error);
    }
}
