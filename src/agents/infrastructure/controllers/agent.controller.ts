import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AuthPort } from "../../domain/ports/auth.port";
import { AgentConversationService } from "../../application/services/agent-conversation.service";
import { AgentRepository } from "../../domain/ports/agent.repository.port";

// Use cases para enviar mensajes
import { SendTextUseCase } from "../../../messaging/application/use-cases/send-text.use-case";
import { WhatsAppCloudAdapter } from "../../../messaging/infrastructure/adapters/whatsapp-cloud.adapter";
import { envConfig } from "../../../shared/config/env.config";

// WebSocket
import { getSocketService } from "../../../shared/infrastructure/websocket/socket.service";

const messagingAdapter = new WhatsAppCloudAdapter();
const sendTextUseCase = new SendTextUseCase(messagingAdapter);

// Normaliza numeros argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone: string): string => {
  if (phone && phone.startsWith("549") && phone.length === 13) {
    return "54" + phone.slice(3);
  }
  return phone;
};

export class AgentController {
  constructor(
    private readonly authService: AuthPort,
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository
  ) {}

  // Auth endpoints
  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      await this.authService.logout(req.agent.agentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // Conversation endpoints
  async getWaitingConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getMyConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getResolvedConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const conversations = await this.conversationService.getResolvedConversations({
        agentId: req.agent.agentId,
        role: req.agent.role,
        storeId: req.agent.storeId,
        zoneId: req.agent.zoneId,
      });

      res.json({ conversations });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getAllConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;

      const success = await this.conversationService.markAsRead(
        conversationId,
        req.agent.agentId
      );

      if (!success) {
        res.status(400).json({ error: "No se pudo marcar como leída" });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async assignConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;

      const success = await this.conversationService.assignConversation(
        conversationId,
        req.agent.agentId
      );

      if (!success) {
        res.status(400).json({ error: "No se pudo asignar la conversación" });
        return;
      }

      // Emitir evento de asignación por WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitConversationAssigned({
          conversationId,
          agentId: req.agent.agentId,
          storeId: req.agent.storeId,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async resolveConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;

      const success = await this.conversationService.resolveConversation(
        conversationId,
        req.agent.agentId
      );

      if (!success) {
        res.status(400).json({ error: "No se pudo resolver la conversación" });
        return;
      }

      // Emitir evento de resolución por WebSocket
      const socketSvc = getSocketService();
      if (socketSvc) {
        socketSvc.emitConversationResolved({
          conversationId,
          storeId: req.agent.storeId,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async transferToBot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;

      const success = await this.conversationService.transferToBot(
        conversationId,
        req.agent.agentId
      );

      if (!success) {
        res.status(400).json({ error: "No se pudo transferir la conversación" });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        phoneNumberId: envConfig.meta.phoneNumberId,
      });

      // Guardar mensaje en la base de datos
      await this.conversationService.saveAgentMessage(
        conversationId,
        req.agent.agentId,
        message,
        result.messageId
      );

      // Emitir mensaje por WebSocket
      const socketService = getSocketService();
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
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Error al enviar el mensaje" });
    }
  }

  async getAvailableAgentsForTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;

      const agents = await this.conversationService.getAvailableAgentsForTransfer(
        conversationId,
        req.agent.agentId
      );

      res.json({ agents });
    } catch (error: any) {
      console.error("[getAvailableAgentsForTransfer] Error:", error.message, error.stack);
      res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
  }

  async transferToAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { conversationId } = req.params;
      const { targetAgentId } = req.body;

      if (!targetAgentId) {
        res.status(400).json({ error: "ID del agente destino requerido" });
        return;
      }

      const success = await this.conversationService.transferToAgent(
        conversationId,
        req.agent.agentId,
        targetAgentId
      );

      if (!success) {
        res.status(400).json({ error: "No se pudo transferir la conversación" });
        return;
      }

      // Emitir evento de transferencia por WebSocket
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitConversationTransferred({
          conversationId,
          fromAgentId: req.agent.agentId,
          toAgentId: targetAgentId,
          storeId: req.agent.storeId,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
