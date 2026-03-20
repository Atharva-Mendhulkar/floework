import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      analyticsUserId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const enforceDataOwnership = (req: Request, res: Response, next: NextFunction) => {
  // Prevent client from requesting another user's data via query param
  if (req.query.userId && req.query.userId !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Controllers must use this, not req.query.userId
  req.analyticsUserId = req.user.id;
  next();
};
