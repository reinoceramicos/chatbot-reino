import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { AnalyticsService } from "../../application/services/analytics.service";
import { PrismaAnalyticsRepository } from "../repositories/prisma-analytics.repository";
import { authMiddleware, AuthenticatedRequest } from "../../../agents/infrastructure/middleware/auth.middleware";
import { requireManagerOrAbove } from "../../../agents/infrastructure/middleware/role.middleware";
import { prisma } from "../../../shared/infrastructure/database/prisma.service";

// Initialize dependencies
const analyticsRepository = new PrismaAnalyticsRepository(prisma);
const analyticsService = new AnalyticsService(analyticsRepository);
const analyticsController = new AnalyticsController(analyticsService);

const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get("/me", (req: AuthenticatedRequest, res) =>
  analyticsController.getMyMetrics(req, res)
);

analyticsRouter.get("/agents", (req: AuthenticatedRequest, res) =>
  analyticsController.getAgentMetrics(req, res)
);

analyticsRouter.get("/agents/:agentId", (req: AuthenticatedRequest, res) =>
  analyticsController.getAgentMetricsById(req, res)
);

analyticsRouter.use(requireManagerOrAbove);

analyticsRouter.get("/conversations", (req: AuthenticatedRequest, res) =>
  analyticsController.getConversationMetrics(req, res)
);

analyticsRouter.get("/bot/funnel", (req: AuthenticatedRequest, res) =>
  analyticsController.getBotFunnelMetrics(req, res)
);

analyticsRouter.get("/dashboard", (req: AuthenticatedRequest, res) =>
  analyticsController.getDashboardSummary(req, res)
);

// Export the service for starting alert monitoring
export { analyticsRouter, analyticsService };
