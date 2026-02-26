import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import prisma from '../utils/prisma';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('Not authorized to access this route', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            return next(new AppError('User belonging to this token no longer exists', 401));
        }

        // Attach user to request object
        (req as any).user = user;
        next();
    } catch (error) {
        return next(new AppError('Not authorized to access this route', 401));
    }
};
