import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { computeTaskSignals } from '../services/executionSignals.service';
import { computeFocusStability } from '../services/focusStability.service';
import { logExecutionEvent } from '../services/executionGraph.service';
import { signalQueue } from '../queues/signalQueue';

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

        logExecutionEvent(taskId, userId, 'FOCUS_START');

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
        const { aiAssisted } = req.body;

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
                aiAssisted: Boolean(aiAssisted)
            } as any,
        });

        logExecutionEvent(existingSession.taskId, userId, 'FOCUS_STOP', { durationSecs, interrupts: existingSession.interrupts });

        // Enqueue signal computation via BullMQ; fall back to inline if queue unavailable
        const jobData = {
            taskId: existingSession.taskId,
            userId: existingSession.userId,
            sessionStartTime: existingSession.startTime.toISOString(),
        };
        signalQueue.add('compute', jobData).catch(() => {
            // BullMQ unavailable (no Redis) — run inline as fallback
            Promise.all([
                computeTaskSignals(existingSession.taskId, existingSession.userId),
                computeFocusStability(existingSession.userId, existingSession.startTime),
            ]).catch((err) => console.error('[signals-fallback]', err));
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
