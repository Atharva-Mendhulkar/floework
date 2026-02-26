import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
// Import socket io instance. Let's assume io is exported from server or socketService.
import { getIO } from '../services/socketService';

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;

        const messages = await prisma.message.findMany({
            where: { projectId },
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        next(error);
    }
};

export const createMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { content } = req.body;
        const authorId = (req as any).user.id;

        // Verify project existence
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return next(new AppError('Project not found', 404));
        }

        const message = await prisma.message.create({
            data: {
                content,
                authorId,
                projectId,
            },
            include: { author: { select: { id: true, name: true, role: true } } },
        });

        // Broadcast to project room via Socket.IO
        getIO().to(`project:${projectId}`).emit('new_message', message);

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        next(error);
    }
};
