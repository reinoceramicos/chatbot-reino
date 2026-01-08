"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const webhook_routes_1 = require("./webhook/infrastructure/routes/webhook.routes");
const agent_routes_1 = require("./agents/infrastructure/routes/agent.routes");
const env_config_1 = require("./shared/config/env.config");
const socket_service_1 = require("./shared/infrastructure/websocket/socket.service");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = env_config_1.envConfig.server.port;
// Initialize WebSocket
exports.socketService = new socket_service_1.SocketService(httpServer);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Logging middleware
app.use((req, _res, next) => {
    if (req.path.startsWith("/webhook") || req.path.startsWith("/api/agents")) {
        console.log("IN", req.method, req.originalUrl, req.headers["user-agent"]);
    }
    next();
});
// Routes
app.use("/webhook", webhook_routes_1.webhookRouter);
app.use("/api/agents", agent_routes_1.agentRouter);
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
