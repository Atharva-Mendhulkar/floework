import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logExecutionEvent, getTaskExecutionTimeline } from '../services/executionGraph.service';

export const getTaskReplay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const events = await getTaskExecutionTimeline(req.params.id);
        res.json({ success: true, count: events.length, data: events });
    } catch (error) {
        next(error);
    }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId, starred } = req.query;
        const filter: any = {};
        if (projectId) filter.projectId = String(projectId);
        if (starred === 'true') filter.isStarred = true;

        const tasks = await prisma.task.findMany({
            where: filter,
            include: { assignee: { select: { id: true, name: true } } },
        });

        res.json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        next(error);
    }
};

export const updateTaskState = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, phase } = req.body;

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: { status, phase },
        });

        const userId = (req as any).user?.id;
        if (userId) {
            logExecutionEvent(task.id, userId, 'STATUS_CHANGE', { status, phase });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

export const toggleTaskStar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { isStarred } = req.body;

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: { isStarred },
        });

        res.json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, description, projectId, assigneeId, dueDate, priority } = req.body;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return next(new AppError('Project not found for the provided projectId', 404));
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                projectId,
                assigneeId,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority
            },
        });

        const userId = (req as any).user?.id;
        if (userId) {
            logExecutionEvent(task.id, userId, 'TASK_CREATED', { title, priority });
        }

        res.status(201).json({ success: true, data: task });
    } catch (error) {
        next(error);
    }
};
