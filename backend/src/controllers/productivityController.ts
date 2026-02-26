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
        // In a real app, this would aggregate real FocusSessions and ProductivityLogs over the week.
        // For the sake of the milestone, we can return the structure expected by the frontend.

        const barData = [
            { day: "Mon", focusHrs: 5.2, tasksCompleted: 4 },
            { day: "Tue", focusHrs: 6.1, tasksCompleted: 5 },
            { day: "Wed", focusHrs: 3.8, tasksCompleted: 2 },
            { day: "Thu", focusHrs: 7.0, tasksCompleted: 6 },
            { day: "Fri", focusHrs: 4.5, tasksCompleted: 3 },
        ];

        const burnoutData = [
            { week: "W1", interrupts: 8, burnoutRisk: 22 },
            { week: "W2", interrupts: 12, burnoutRisk: 35 },
            { week: "W3", interrupts: 18, burnoutRisk: 52 },
            { week: "W4", interrupts: 14, burnoutRisk: 45 },
            { week: "W5", interrupts: 22, burnoutRisk: 68 },
            { week: "W6", interrupts: 16, burnoutRisk: 55 },
        ];

        res.json({ success: true, data: { barData, burnoutData } });
    } catch (error) {
        next(error);
    }
}
