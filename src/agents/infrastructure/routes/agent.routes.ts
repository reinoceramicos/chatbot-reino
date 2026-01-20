import { Router } from "express";
import { AgentController } from "../controllers/agent.controller";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.middleware";
import { requireManagerOrAbove } from "../middleware/role.middleware";
import { LocalAuthAdapter } from "../adapters/local-auth.adapter";
import { AgentConversationService } from "../../application/services/agent-conversation.service";
import { PrismaAgentRepository } from "../repositories/prisma-agent.repository";
import { prisma } from "../../../shared/infrastructure/database/prisma.service";
import { flowRouter } from "../../../flows/infrastructure/routes/flow.routes";

// Inicializar dependencias
const agentRepository = new PrismaAgentRepository(prisma);

// Auth: usando LocalAuthAdapter por ahora
// Para migrar a microservicio: reemplazar por MicroserviceAuthAdapter
const authService = new LocalAuthAdapter(agentRepository);

const conversationService = new AgentConversationService(prisma, agentRepository);
const agentController = new AgentController(authService, conversationService, agentRepository);

const agentRouter = Router();

// Auth routes (públicas)
agentRouter.post("/auth/login", (req, res) => agentController.login(req, res));
agentRouter.post("/auth/register", (req, res) => agentController.register(req, res));

// Protected routes
agentRouter.use(authMiddleware);

// Auth routes (protegidas)
agentRouter.post("/auth/logout", (req: AuthenticatedRequest, res) =>
  agentController.logout(req, res)
);

// Profile routes
agentRouter.get("/profile", (req: AuthenticatedRequest, res) =>
  agentController.getProfile(req, res)
);
agentRouter.put("/profile/status", (req: AuthenticatedRequest, res) =>
  agentController.updateStatus(req, res)
);

// Conversation routes
agentRouter.get("/conversations/waiting", (req: AuthenticatedRequest, res) =>
  agentController.getWaitingConversations(req, res)
);
agentRouter.get("/conversations/mine", (req: AuthenticatedRequest, res) =>
  agentController.getMyConversations(req, res)
);
agentRouter.get("/conversations/resolved", (req: AuthenticatedRequest, res) =>
  agentController.getResolvedConversations(req, res)
);
// Solo supervisores y superiores pueden ver todas las conversaciones
agentRouter.get("/conversations/all", requireManagerOrAbove, (req: AuthenticatedRequest, res) =>
  agentController.getAllConversations(req, res)
);
// Specific routes MUST come before the generic /:conversationId route
agentRouter.get("/conversations/:conversationId/available-agents", (req: AuthenticatedRequest, res) =>
  agentController.getAvailableAgentsForTransfer(req, res)
);
agentRouter.post("/conversations/:conversationId/read", (req: AuthenticatedRequest, res) =>
  agentController.markAsRead(req, res)
);
agentRouter.post("/conversations/:conversationId/assign", (req: AuthenticatedRequest, res) =>
  agentController.assignConversation(req, res)
);
agentRouter.post("/conversations/:conversationId/resolve", (req: AuthenticatedRequest, res) =>
  agentController.resolveConversation(req, res)
);
agentRouter.post("/conversations/:conversationId/transfer-bot", (req: AuthenticatedRequest, res) =>
  agentController.transferToBot(req, res)
);
agentRouter.post("/conversations/:conversationId/messages", (req: AuthenticatedRequest, res) =>
  agentController.sendMessage(req, res)
);
agentRouter.post("/conversations/:conversationId/transfer", (req: AuthenticatedRequest, res) =>
  agentController.transferToAgent(req, res)
);
// Generic route MUST come last
agentRouter.get("/conversations/:conversationId", (req: AuthenticatedRequest, res) =>
  agentController.getConversation(req, res)
);

// Mount flow routes under /flows (for frontend compatibility at /api/agents/flows)
agentRouter.use("/flows", flowRouter);

export { agentRouter };
