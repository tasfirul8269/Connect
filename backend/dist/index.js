"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="./types/express.d.ts" />
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const profiles_1 = __importDefault(require("./routes/profiles"));
const uploads_1 = __importDefault(require("./routes/uploads"));
// Load .env from the backend root directory
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
// Debug environment variables
console.log('🔍 Environment check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('PORT:', process.env.PORT || 5000);
console.log('Working directory:', process.cwd());
console.log('Env file path:', path_1.default.resolve(__dirname, '../.env'));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-frontend-domain.com'
        : ['http://localhost:3000', 'https://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Create HTTP server and Socket.IO
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? 'https://your-frontend-domain.com'
            : ['http://localhost:3000', 'https://localhost:3000'],
        credentials: true,
    }
});
// Share io instance to routes/services
const socket_1 = require("./config/socket");
(0, socket_1.setIO)(io);
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/profiles', profiles_1.default);
app.use('/api/uploads', uploads_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Connections API is running' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
//# sourceMappingURL=index.js.map