import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      (req as any).userId = decoded.userId;
    }
  } catch (_) {
    // ignore invalid tokens for optional auth
  } finally {
    next();
  }
};
