"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }
        // Check if token is blacklisted (ignore if table doesn't exist)
        try {
            const blacklistedToken = await (0, database_1.default) `
        SELECT 1 FROM token_blacklist 
        WHERE token = ${token} AND expires_at > NOW()
        LIMIT 1
      `;
            if (blacklistedToken.length > 0) {
                return res.status(401).json({ error: 'Token has been revoked' });
            }
        }
        catch (err) {
            // Likely table missing in early setups; proceed without blacklist enforcement
            console.warn('Token blacklist check skipped:', err?.message || err);
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Attach user ID and token to the request object
        req.userId = decoded.userId;
        req.token = token;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(403).json({ error: 'Token has expired' });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
exports.authenticateToken = authenticateToken;
// Middleware to clean up expired tokens (can be run periodically)
const cleanupExpiredTokens = async () => {
    try {
        await (0, database_1.default) `
      DELETE FROM token_blacklist 
      WHERE expires_at <= NOW()
    `;
    }
    catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
};
exports.cleanupExpiredTokens = cleanupExpiredTokens;
// Run cleanup every hour
setInterval(exports.cleanupExpiredTokens, 60 * 60 * 1000);
//# sourceMappingURL=auth.js.map