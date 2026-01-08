import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { webhookRouter } from "./webhook/infrastructure/routes/webhook.routes";
import { agentRouter } from "./agents/infrastructure/routes/agent.routes";
import { envConfig } from "./shared/config/env.config";
import { SocketService } from "./shared/infrastructure/websocket/socket.service";

const app = express();
const httpServer = createServer(app);
const PORT = envConfig.server.port;

// Initialize WebSocket
export const socketService = new SocketService(httpServer);

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, _res, next) => {
  if (req.path.startsWith("/webhook") || req.path.startsWith("/api/agents")) {
    console.log("IN", req.method, req.originalUrl, req.headers["user-agent"]);
  }
  next();
});

// Routes
app.use("/webhook", webhookRouter);
app.use("/api/agents", agentRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
