import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// Start a new Focus Session
export const startFocusSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { taskId } = req.body;
        const userId = (req as any).user.id; // From authMiddleware

        // Verify task exists
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            return next(new AppError('Task not found', 404));
        }

        const session = await prisma.focusSession.create({
            data: {
                userId,
                taskId,
            },
        });

        res.status(201).json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
};

// End an active Focus Session
// Calculates the total duration in seconds automatically.
export const stopFocusSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // Session ID
        const userId = (req as any).user.id;

        const existingSession = await prisma.focusSession.findUnique({ where: { id } });
        if (!existingSession) {
            return next(new AppError('Session not found', 404));
        }

        // Security check: Only the user who owns the session can stop it
        if (existingSession.userId !== userId) {
            return next(new AppError('Not authorized', 403));
        }

        const endTime = new Date();
        // Calculate total duration in seconds from startTime to endTime
        const durationSecs = Math.floor((endTime.getTime() - existingSession.startTime.getTime()) / 1000);

        const updatedSession = await prisma.focusSession.update({
            where: { id },
            data: {
                endTime,
                durationSecs,
            },
        });

        res.json({ success: true, data: updatedSession });
    } catch (error) {
        next(error);
    }
};

// Get all focus sessions for the authenticated user, optionally filtered by task
export const getUserFocusSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { taskId } = req.query;

        const filter: any = { userId };
        if (taskId) {
            filter.taskId = String(taskId);
        }

        const sessions = await prisma.focusSession.findMany({
            where: filter,
            include: {
                task: { select: { title: true, projectId: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        res.json({ success: true, count: sessions.length, data: sessions });
    } catch (error) {
        next(error);
    }
};
