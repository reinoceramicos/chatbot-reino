import "dotenv/config";
import express from "express";
import cors from "cors";
import { webhookRouter } from "./webhook/infrastructure/routes/webhook.routes";
import { agentRouter } from "./agents/infrastructure/routes/agent.routes";
import { envConfig } from "./shared/config/env.config";

const app = express();
const PORT = envConfig.server.port;

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
