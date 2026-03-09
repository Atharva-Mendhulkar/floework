import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// Get all sprints for a given project
export const getProjectSprints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;

        const sprints = await prisma.sprint.findMany({
            where: { projectId },
            orderBy: { startDate: 'desc' },
            include: {
                tasks: {
                    select: { id: true, title: true, status: true, priority: true }
                }
            }
        });

        res.json({ success: true, count: sprints.length, data: sprints });
    } catch (error) {
        next(error);
    }
};

// Create a new sprint
export const createSprint = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { name, startDate, endDate } = req.body;

        if (!name || !startDate || !endDate) {
            return next(new AppError('Name, Start Date, and End Date are required', 400));
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) return next(new AppError('Project not found', 404));

        const sprint = await prisma.sprint.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                projectId,
            }
        });

        res.status(201).json({ success: true, data: sprint });
    } catch (error) {
        next(error);
    }
};

// Update sprint status (e.g., ACTIVATE or COMPLETE)
export const updateSprint = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sprintId } = req.params;
        const { status } = req.body;

        const sprint = await prisma.sprint.findUnique({
            where: { id: sprintId },
            include: { tasks: true }
        });

        if (!sprint) return next(new AppError('Sprint not found', 404));

        let updatedSprint;

        if (status === 'COMPLETED') {
            // When a sprint completes, we can optionally roll over incomplete tasks
            // We'll disconnect them from the sprint so they return to the backlog.
            await prisma.$transaction(async (tx) => {
                const incompleteTasks = sprint.tasks.filter((t: any) => t.status !== 'DONE');
                for (const t of incompleteTasks) {
                    await tx.task.update({
                        where: { id: t.id },
                        data: { sprintId: null } // Move back to backlog
                    });
                }
                updatedSprint = await tx.sprint.update({
                    where: { id: sprintId },
                    data: { status }
                });
            });
        } else {
            updatedSprint = await prisma.sprint.update({
                where: { id: sprintId },
                data: { status }
            });
        }

        res.json({ success: true, data: updatedSprint });
    } catch (error) {
        next(error);
    }
};
