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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);

    // Permitir orígenes de la lista o cualquier ngrok
    if (allowedOrigins.includes(origin) || origin.includes('ngrok')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin', 'ngrok-skip-browser-warning'],
}));
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
