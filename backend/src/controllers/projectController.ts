import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const projects = await prisma.project.findMany({
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
