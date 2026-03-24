import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { getProjectPrediction } from '../services/predictiveDelivery.service';

export const getProjectPredictiveDelivery = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await getProjectPrediction(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const projects = await prisma.project.findMany({
            where: userId ? {
                team: { members: { some: { userId } } }
            } : {},
            include: {
                team: true,
                _count: { select: { tasks: true } },
            },
        });
        res.json({ success: true, count: projects.length, data: projects });
    } catch (error) {
        next(error);
    }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                team: true,
                tasks: {
                    include: { assignee: { select: { id: true, name: true, email: true } } }
                },
            },
        });

        if (!project) {
            return next(new AppError('Project not found', 404));
        }

        res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, teamId } = req.body;

        // Validate team exists
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
            return next(new AppError('Team not found for the provided teamId', 404));
        }

        const project = await prisma.project.create({
            data: { name, description, teamId },
        });

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = (req as any).user?.id;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) return next(new AppError('Project not found', 404));

        // Only team admins can update projects
        const membership = await prisma.teamMember.findFirst({
            where: { userId, teamId: project.teamId, teamRole: 'ADMIN' }
        });
        if (!membership) return next(new AppError('Forbidden: must be a team admin', 403));

        const updated = await prisma.project.update({
            where: { id },
            data: { ...(name && { name }), ...(description !== undefined && { description }) },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) return next(new AppError('Project not found', 404));

        const membership = await prisma.teamMember.findFirst({
            where: { userId, teamId: project.teamId, teamRole: 'ADMIN' }
        });
        if (!membership) return next(new AppError('Forbidden: must be a team admin', 403));

        await prisma.project.delete({ where: { id } });
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        next(error);
    }
};
