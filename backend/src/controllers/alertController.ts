import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        const alerts = await prisma.alert.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (error) {
        next(error);
    }
};

export const markAlertAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const alertId = req.params.id;

        // Verify ownership
        const alert = await prisma.alert.findUnique({ where: { id: alertId } });
        if (!alert || alert.userId !== userId) {
            return next(new AppError('Alert not found', 404));
        }

        const updatedAlert = await prisma.alert.update({
            where: { id: alertId },
            data: { isRead: true },
        });

        res.json({ success: true, data: updatedAlert });
    } catch (error) {
        next(error);
    }
};

export const markAllAlertsAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        await prisma.alert.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.json({ success: true, message: "All alerts marked as read." });
    } catch (error) {
        next(error);
    }
};
