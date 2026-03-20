import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import crypto from 'crypto';

// GET /narrative
export const getNarratives = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const narratives = await (prisma as any).effortNarrative.findMany({
            where: { userId },
            orderBy: { generatedAt: 'desc' },
            skip,
            take: limit
        });

        const total = await (prisma as any).effortNarrative.count({ where: { userId } });

        res.json({
            success: true,
            data: narratives,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

// GET /narrative/current
export const getCurrentNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        
        const narrative = await (prisma as any).effortNarrative.findFirst({
            where: { userId },
            orderBy: { generatedAt: 'desc' }
        });

        res.json({ success: true, data: narrative });
    } catch (error) {
        next(error);
    }
};

// PATCH /narrative/:id
export const updateNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { body } = req.body;

        const narrative = await (prisma as any).effortNarrative.findUnique({ where: { id } });
        if (!narrative) return res.status(404).json({ success: false, message: 'Not found' });
        if (narrative.userId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

        const updated = await (prisma as any).effortNarrative.update({
            where: { id },
            data: { body, isEdited: true }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// POST /narrative/:id/share
export const shareNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const narrative = await (prisma as any).effortNarrative.findUnique({ where: { id } });
        if (!narrative) return res.status(404).json({ success: false, message: 'Not found' });
        if (narrative.userId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

        const shareToken = crypto.randomUUID();
        const shareExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const updated = await (prisma as any).effortNarrative.update({
            where: { id },
            data: { shareToken, shareExpiry }
        });

        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/narrative/shared/${shareToken}`;
        res.json({ success: true, data: { shareUrl, shareToken, shareExpiry } });
    } catch (error) {
        next(error);
    }
};

// DELETE /narrative/:id/share
export const revokeNarrativeShare = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const narrative = await (prisma as any).effortNarrative.findUnique({ where: { id } });
        if (!narrative) return res.status(404).json({ success: false, message: 'Not found' });
        if (narrative.userId !== userId) return res.status(403).json({ success: false, message: 'Forbidden' });

        await (prisma as any).effortNarrative.update({
            where: { id },
            data: { shareToken: null, shareExpiry: null }
        });

        res.json({ success: true, message: 'Share link revoked' });
    } catch (error) {
        next(error);
    }
};

// GET /narrative/shared/:token
export const getSharedNarrative = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;

        const narrative = await (prisma as any).effortNarrative.findUnique({
            where: { shareToken: token },
            include: { user: { select: { name: true, email: true, role: true } } }
        });

        if (!narrative || !narrative.shareExpiry || new Date() > narrative.shareExpiry) {
            return res.status(404).json({ success: false, message: 'Link expired or invalid' });
        }

        res.json({ success: true, data: narrative });
    } catch (error) {
        next(error);
    }
};
