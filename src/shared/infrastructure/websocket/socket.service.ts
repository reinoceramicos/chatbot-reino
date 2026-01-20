import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { envConfig } from "../../config/env.config";
import { TokenPayload } from "../../../agents/domain/ports/auth.port";
import { log } from "../../../webhook/application/handlers/base.handler";

interface AuthenticatedSocket extends Socket {
  agent?: TokenPayload;
}

// Singleton para acceder al socket service desde cualquier parte
let socketServiceInstance: SocketService | null = null;

export class SocketService {
  private io: Server;
  // Map de agentId -> socketId para enviar mensajes a agentes específicos
  private agentSockets: Map<string, string> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    socketServiceInstance = this;
    log("WEBSOCKET_INITIALIZED", { status: "ready" });
  }

  private setupMiddleware(): void {
    // Middleware de autenticación
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      try {
        const decoded = jwt.verify(token, envConfig.jwt.secret) as TokenPayload;
        socket.agent = decoded;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const agent = socket.agent;

      if (!agent) {
        socket.disconnect();
        return;
      }

      log("AGENT_CONNECTED", { email: agent.email, agentId: agent.agentId });

      // Registrar el socket del agente
      this.agentSockets.set(agent.agentId, socket.id);

      // Unir al agente a rooms según su rol y tienda/zona
      socket.join(`agent:${agent.agentId}`);

      if (agent.storeId) {
        socket.join(`store:${agent.storeId}`);
      }

      if (agent.zoneId) {
        socket.join(`zone:${agent.zoneId}`);
      }

      // Room general para todos los agentes
      socket.join("agents");

      // Evento para unirse a una conversación específica
      socket.on("join:conversation", (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        log("AGENT_JOINED_CONVERSATION", { email: agent.email, conversationId });
      });

      // Evento para salir de una conversación
      socket.on("leave:conversation", (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        log("AGENT_LEFT_CONVERSATION", { email: agent.email, conversationId });
      });

      // Evento cuando el agente está escribiendo
      socket.on("typing:start", (conversationId: string) => {
        socket.to(`conversation:${conversationId}`).emit("agent:typing", {
          conversationId,
          agentId: agent.agentId,
          agentName: agent.email,
        });
      });

      socket.on("typing:stop", (conversationId: string) => {
        socket.to(`conversation:${conversationId}`).emit("agent:stopped_typing", {
          conversationId,
          agentId: agent.agentId,
        });
      });

      // Desconexión
      socket.on("disconnect", () => {
        log("AGENT_DISCONNECTED", { email: agent.email, agentId: agent.agentId });
        this.agentSockets.delete(agent.agentId);
      });
    });
  }

  // Emitir nuevo mensaje de cliente a los agentes de una tienda
  emitNewCustomerMessage(data: {
    conversationId: string;
    storeId?: string;
    message: {
      id: string;
      content?: string;
      type: string;
      direction: string;
      createdAt: Date;
    };
    customer: {
      id: string;
      name?: string;
      waId: string;
    };
  }): void {
    // Emitir a la conversación específica
    this.io.to(`conversation:${data.conversationId}`).emit("message:new", data);

    // Si tiene tienda, emitir a los agentes de esa tienda
    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("message:new", data);
    }

    // También emitir a todos los agentes (para supervisores/gerentes)
    this.io.to("agents").emit("message:new", data);
  }

  // Emitir mensaje enviado por agente
  emitAgentMessage(data: {
    conversationId: string;
    message: {
      id?: string;
      content: string;
      type: string;
      direction: string;
      sentByAgentId: string;
      createdAt: Date;
    };
  }): void {
    this.io.to(`conversation:${data.conversationId}`).emit("message:sent", data);
  }

  // Emitir nueva conversación en espera
  emitNewWaitingConversation(data: {
    conversationId: string;
    storeId?: string;
    customer: {
      id: string;
      name?: string;
      waId: string;
    };
  }): void {
    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("conversation:waiting", data);
    }
    this.io.to("agents").emit("conversation:waiting", data);
  }

  // Emitir cuando una conversación es asignada
  emitConversationAssigned(data: {
    conversationId: string;
    agentId: string;
    storeId?: string;
  }): void {
    this.io.to(`conversation:${data.conversationId}`).emit("conversation:assigned", data);
    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("conversation:assigned", data);
    }
    this.io.to("agents").emit("conversation:assigned", data);
  }

  // Emitir cuando una conversación es resuelta
  emitConversationResolved(data: {
    conversationId: string;
    storeId?: string;
  }): void {
    this.io.to(`conversation:${data.conversationId}`).emit("conversation:resolved", data);
    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("conversation:resolved", data);
    }
    this.io.to("agents").emit("conversation:resolved", data);
  }

  // Emitir cuando una conversación es transferida a otro agente
  emitConversationTransferred(data: {
    conversationId: string;
    fromAgentId: string;
    toAgentId: string;
    storeId?: string;
  }): void {
    // Notificar al agente que recibe la conversación
    this.io.to(`agent:${data.toAgentId}`).emit("conversation:transferred", data);
    // Notificar a la conversación específica
    this.io.to(`conversation:${data.conversationId}`).emit("conversation:transferred", data);
    // Notificar a la tienda
    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("conversation:transferred", data);
    }
    this.io.to("agents").emit("conversation:transferred", data);
  }

  // Emitir actualización de estado de mensaje (enviado, entregado, leído)
  emitMessageStatusUpdate(data: {
    conversationId: string;
    messageId: string;
    waMessageId: string;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  }): void {
    this.io.to(`conversation:${data.conversationId}`).emit("message:status", data);
  }

  getIO(): Server {
    return this.io;
  }

  emitToStore(storeId: string, event: string, data: any): void {
    this.io.to(`store:${storeId}`).emit(event, data);
  }

  emitToZone(zoneId: string, event: string, data: any): void {
    this.io.to(`zone:${zoneId}`).emit(event, data);
  }

  emitToAgent(agentId: string, event: string, data: any): void {
    this.io.to(`agent:${agentId}`).emit(event, data);
  }

  emitConversationWaitingAlert(data: {
    conversationId: string;
    storeId?: string;
    zoneId?: string;
    waitingMinutes: number;
    customer: {
      name?: string;
      waId: string;
    };
  }): void {
    const payload = {
      type: "WAITING_ALERT",
      ...data,
      timestamp: new Date(),
    };

    if (data.storeId) {
      this.io.to(`store:${data.storeId}`).emit("notification:alert", payload);
    }
    if (data.zoneId) {
      this.io.to(`zone:${data.zoneId}`).emit("notification:alert", payload);
    }
    this.io.to("agents").emit("notification:alert", payload);
  }

  emitHighLoadAlert(data: {
    storeId?: string;
    zoneId?: string;
    waitingConversations: number;
    threshold: number;
  }): void {
    const payload = {
      type: "HIGH_LOAD_ALERT",
      ...data,
      timestamp: new Date(),
    };

    if (data.zoneId) {
      this.io.to(`zone:${data.zoneId}`).emit("notification:alert", payload);
    }
    this.io.to("agents").emit("notification:alert", payload);
  }

  emitNewMessageNotification(data: {
    conversationId: string;
    agentId: string;
    customerName?: string;
    messagePreview?: string;
  }): void {
    this.io.to(`agent:${data.agentId}`).emit("notification:new_message", {
      type: "NEW_MESSAGE",
      ...data,
      timestamp: new Date(),
    });
  }
}

// Función para obtener la instancia del socket service
export function getSocketService(): SocketService | null {
  return socketServiceInstance;
}
