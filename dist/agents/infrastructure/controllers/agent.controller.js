"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
// Use cases para enviar mensajes
const send_text_use_case_1 = require("../../../messaging/application/use-cases/send-text.use-case");
const whatsapp_cloud_adapter_1 = require("../../../messaging/infrastructure/adapters/whatsapp-cloud.adapter");
const env_config_1 = require("../../../shared/config/env.config");
// WebSocket
const socket_service_1 = require("../../../shared/infrastructure/websocket/socket.service");
const messagingAdapter = new whatsapp_cloud_adapter_1.WhatsAppCloudAdapter();
const sendTextUseCase = new send_text_use_case_1.SendTextUseCase(messagingAdapter);
// Normaliza numeros argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone) => {
    if (phone && phone.startsWith("549") && phone.length === 13) {
        return "54" + phone.slice(3);
    }
    return phone;
};
class AgentController {
    authService;
    conversationService;
    agentRepository;
    constructor(authService, conversationService, agentRepository) {
        this.authService = authService;
        this.conversationService = conversationService;
        this.agentRepository = agentRepository;
    }
    // Auth endpoints
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ error: "Email y contraseña son requeridos" });
                return;
            }
            const result = await this.authService.login(email, password);
            if (!result.success) {
                res.status(401).json({ error: result.error });
                return;
            }
            res.json({
                token: result.token,
                agent: result.agent,
            });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async logout(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            await this.authService.logout(req.agent.agentId);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async register(req, res) {
        try {
            const { name, email, password, storeId } = req.body;
            if (!name || !email || !password) {
                res.status(400).json({ error: "Nombre, email y contraseña son requeridos" });
                return;
            }
            const result = await this.authService.register({ name, email, password, storeId });
            if (!result.success) {
                res.status(400).json({ error: result.error });
                return;
            }
            res.status(201).json({
                token: result.token,
                agent: result.agent,
            });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async getProfile(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const agent = await this.agentRepository.findById(req.agent.agentId);
            if (!agent) {
                res.status(404).json({ error: "Agente no encontrado" });
                return;
            }
            res.json({
                id: agent.id,
                name: agent.name,
                email: agent.email,
                storeId: agent.storeId,
                status: agent.status,
                maxConversations: agent.maxConversations,
                activeConversations: agent.activeConversations,
            });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async updateStatus(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { status } = req.body;
            if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(status)) {
                res.status(400).json({ error: "Estado inválido" });
                return;
            }
            const agent = await this.agentRepository.updateStatus(req.agent.agentId, status);
            res.json({
                id: agent.id,
                status: agent.status,
            });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    // Conversation endpoints
    async getWaitingConversations(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const conversations = await this.conversationService.getWaitingConversations({
                agentId: req.agent.agentId,
                role: req.agent.role,
                storeId: req.agent.storeId,
                zoneId: req.agent.zoneId,
            });
            res.json({ conversations });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async getMyConversations(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const conversations = await this.conversationService.getAgentConversations({
                agentId: req.agent.agentId,
                role: req.agent.role,
                storeId: req.agent.storeId,
                zoneId: req.agent.zoneId,
            });
            res.json({ conversations });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async getAllConversations(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const conversations = await this.conversationService.getAllConversations({
                agentId: req.agent.agentId,
                role: req.agent.role,
                storeId: req.agent.storeId,
                zoneId: req.agent.zoneId,
            });
            res.json({ conversations });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async getConversation(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { conversationId } = req.params;
            const conversation = await this.conversationService.getConversationDetail(conversationId);
            if (!conversation) {
                res.status(404).json({ error: "Conversación no encontrada" });
                return;
            }
            res.json({ conversation });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async assignConversation(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { conversationId } = req.params;
            const success = await this.conversationService.assignConversation(conversationId, req.agent.agentId);
            if (!success) {
                res.status(400).json({ error: "No se pudo asignar la conversación" });
                return;
            }
            // Emitir evento de asignación por WebSocket
            const socketService = (0, socket_service_1.getSocketService)();
            if (socketService) {
                socketService.emitConversationAssigned({
                    conversationId,
                    agentId: req.agent.agentId,
                    storeId: req.agent.storeId,
                });
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async resolveConversation(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { conversationId } = req.params;
            const success = await this.conversationService.resolveConversation(conversationId, req.agent.agentId);
            if (!success) {
                res.status(400).json({ error: "No se pudo resolver la conversación" });
                return;
            }
            // Emitir evento de resolución por WebSocket
            const socketSvc = (0, socket_service_1.getSocketService)();
            if (socketSvc) {
                socketSvc.emitConversationResolved({
                    conversationId,
                    storeId: req.agent.storeId,
                });
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async transferToBot(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { conversationId } = req.params;
            const success = await this.conversationService.transferToBot(conversationId, req.agent.agentId);
            if (!success) {
                res.status(400).json({ error: "No se pudo transferir la conversación" });
                return;
            }
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
    async sendMessage(req, res) {
        try {
            if (!req.agent) {
                res.status(401).json({ error: "No autenticado" });
                return;
            }
            const { conversationId } = req.params;
            const { message } = req.body;
            if (!message) {
                res.status(400).json({ error: "Mensaje requerido" });
                return;
            }
            // Obtener la conversación para saber a quién enviar
            const conversation = await this.conversationService.getConversationDetail(conversationId);
            if (!conversation) {
                res.status(404).json({ error: "Conversación no encontrada" });
                return;
            }
            // Verificar que la conversación está asignada al agente
            if (conversation.status !== "ASSIGNED") {
                res.status(400).json({ error: "La conversación no está asignada" });
                return;
            }
            // Enviar mensaje por WhatsApp
            const result = await sendTextUseCase.execute({
                to: normalizePhoneNumber(conversation.customerWaId),
                body: message,
                phoneNumberId: env_config_1.envConfig.meta.phoneNumberId,
            });
            // Guardar mensaje en la base de datos
            await this.conversationService.saveAgentMessage(conversationId, req.agent.agentId, message, result.messageId);
            // Emitir mensaje por WebSocket
            const socketService = (0, socket_service_1.getSocketService)();
            if (socketService) {
                socketService.emitAgentMessage({
                    conversationId,
                    message: {
                        id: result.messageId,
                        content: message,
                        type: "TEXT",
                        direction: "OUTBOUND",
                        sentByAgentId: req.agent.agentId,
                        createdAt: new Date(),
                    },
                });
            }
            res.json({
                success: true,
                messageId: result.messageId,
            });
        }
        catch (error) {
            console.error("Error sending message:", error);
            res.status(500).json({ error: "Error al enviar el mensaje" });
        }
    }
}
exports.AgentController = AgentController;
