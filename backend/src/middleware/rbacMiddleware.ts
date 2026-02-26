import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Restrict access to specific roles
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = (req as any).user?.role;

        if (!userRole || !roles.includes(userRole)) {
            return next(new AppError(`User role '${userRole || 'undefined'}' is not authorized to access this route`, 403));
        }

        next();
    };
};
