"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRouter = void 0;
const express_1 = require("express");
const agent_controller_1 = require("../controllers/agent.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const local_auth_adapter_1 = require("../adapters/local-auth.adapter");
const agent_conversation_service_1 = require("../../application/services/agent-conversation.service");
const prisma_agent_repository_1 = require("../repositories/prisma-agent.repository");
const prisma_service_1 = require("../../../shared/infrastructure/database/prisma.service");
// Inicializar dependencias
const agentRepository = new prisma_agent_repository_1.PrismaAgentRepository(prisma_service_1.prisma);
// Auth: usando LocalAuthAdapter por ahora
// Para migrar a microservicio: reemplazar por MicroserviceAuthAdapter
const authService = new local_auth_adapter_1.LocalAuthAdapter(agentRepository);
const conversationService = new agent_conversation_service_1.AgentConversationService(prisma_service_1.prisma, agentRepository);
const agentController = new agent_controller_1.AgentController(authService, conversationService, agentRepository);
const agentRouter = (0, express_1.Router)();
exports.agentRouter = agentRouter;
// Auth routes (públicas)
agentRouter.post("/auth/login", (req, res) => agentController.login(req, res));
agentRouter.post("/auth/register", (req, res) => agentController.register(req, res));
// Protected routes
agentRouter.use(auth_middleware_1.authMiddleware);
// Auth routes (protegidas)
agentRouter.post("/auth/logout", (req, res) => agentController.logout(req, res));
// Profile routes
agentRouter.get("/profile", (req, res) => agentController.getProfile(req, res));
agentRouter.put("/profile/status", (req, res) => agentController.updateStatus(req, res));
// Conversation routes
agentRouter.get("/conversations/waiting", (req, res) => agentController.getWaitingConversations(req, res));
agentRouter.get("/conversations/mine", (req, res) => agentController.getMyConversations(req, res));
// Solo supervisores y superiores pueden ver todas las conversaciones
agentRouter.get("/conversations/all", role_middleware_1.requireManagerOrAbove, (req, res) => agentController.getAllConversations(req, res));
agentRouter.get("/conversations/:conversationId", (req, res) => agentController.getConversation(req, res));
agentRouter.post("/conversations/:conversationId/assign", (req, res) => agentController.assignConversation(req, res));
agentRouter.post("/conversations/:conversationId/resolve", (req, res) => agentController.resolveConversation(req, res));
agentRouter.post("/conversations/:conversationId/transfer-bot", (req, res) => agentController.transferToBot(req, res));
agentRouter.post("/conversations/:conversationId/messages", (req, res) => agentController.sendMessage(req, res));
