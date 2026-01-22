import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { webhookRouter } from "./webhook/infrastructure/routes/webhook.routes";
import { agentRouter } from "./agents/infrastructure/routes/agent.routes";
import { analyticsRouter, analyticsService } from "./analytics";
import { flowRouter } from "./flows";
import { envConfig } from "./shared/config/env.config";
import { corsConfig } from "./shared/config/cors.config";
import { SocketService } from "./shared/infrastructure/websocket/socket.service";
import morgan from "morgan";

const app = express();
const httpServer = createServer(app);
const PORT = envConfig.server.port;

export const socketService = new SocketService(httpServer);

app.use(cors(corsConfig));
app.use(express.json());

app.use(morgan("dev"));

app.use("/webhook", webhookRouter);
app.use("/api/agents", agentRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/flows", flowRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  analyticsService.startAlertMonitoring(5);
});
