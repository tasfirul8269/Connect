"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
        }
    }
    catch (_) {
        // ignore invalid tokens for optional auth
    }
    finally {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=optionalAuth.js.map