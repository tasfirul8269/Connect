import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            token?: string;
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const cleanupExpiredTokens: () => Promise<void>;
//# sourceMappingURL=auth.d.ts.map