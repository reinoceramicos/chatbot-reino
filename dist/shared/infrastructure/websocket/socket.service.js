"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
exports.getSocketService = getSocketService;
const socket_io_1 = require("socket.io");
const jwt = __importStar(require("jsonwebtoken"));
const env_config_1 = require("../../config/env.config");
// Singleton para acceder al socket service desde cualquier parte
let socketServiceInstance = null;
class SocketService {
    io;
    // Map de agentId -> socketId para enviar mensajes a agentes específicos
    agentSockets = new Map();
    constructor(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        socketServiceInstance = this;
        console.log("WebSocket server initialized");
    }
    setupMiddleware() {
        // Middleware de autenticación
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error("Authentication required"));
            }
            try {
                const decoded = jwt.verify(token, env_config_1.envConfig.jwt.secret);
                socket.agent = decoded;
                next();
            }
            catch {
                next(new Error("Invalid token"));
            }
        });
    }
    setupEventHandlers() {
        this.io.on("connection", (socket) => {
            const agent = socket.agent;
            if (!agent) {
                socket.disconnect();
                return;
            }
            console.log(`Agent connected: ${agent.email} (${agent.agentId})`);
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
            socket.on("join:conversation", (conversationId) => {
                socket.join(`conversation:${conversationId}`);
                console.log(`Agent ${agent.email} joined conversation: ${conversationId}`);
            });
            // Evento para salir de una conversación
            socket.on("leave:conversation", (conversationId) => {
                socket.leave(`conversation:${conversationId}`);
                console.log(`Agent ${agent.email} left conversation: ${conversationId}`);
            });
            // Evento cuando el agente está escribiendo
            socket.on("typing:start", (conversationId) => {
                socket.to(`conversation:${conversationId}`).emit("agent:typing", {
                    conversationId,
                    agentId: agent.agentId,
                    agentName: agent.email,
                });
            });
            socket.on("typing:stop", (conversationId) => {
                socket.to(`conversation:${conversationId}`).emit("agent:stopped_typing", {
                    conversationId,
                    agentId: agent.agentId,
                });
            });
            // Desconexión
            socket.on("disconnect", () => {
                console.log(`Agent disconnected: ${agent.email}`);
                this.agentSockets.delete(agent.agentId);
            });
        });
    }
    // Emitir nuevo mensaje de cliente a los agentes de una tienda
    emitNewCustomerMessage(data) {
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
    emitAgentMessage(data) {
        this.io.to(`conversation:${data.conversationId}`).emit("message:sent", data);
    }
    // Emitir nueva conversación en espera
    emitNewWaitingConversation(data) {
        if (data.storeId) {
            this.io.to(`store:${data.storeId}`).emit("conversation:waiting", data);
        }
        this.io.to("agents").emit("conversation:waiting", data);
    }
    // Emitir cuando una conversación es asignada
    emitConversationAssigned(data) {
        this.io.to(`conversation:${data.conversationId}`).emit("conversation:assigned", data);
        if (data.storeId) {
            this.io.to(`store:${data.storeId}`).emit("conversation:assigned", data);
        }
        this.io.to("agents").emit("conversation:assigned", data);
    }
    // Emitir cuando una conversación es resuelta
    emitConversationResolved(data) {
        this.io.to(`conversation:${data.conversationId}`).emit("conversation:resolved", data);
        if (data.storeId) {
            this.io.to(`store:${data.storeId}`).emit("conversation:resolved", data);
        }
        this.io.to("agents").emit("conversation:resolved", data);
    }
    // Obtener la instancia del servidor Socket.IO
    getIO() {
        return this.io;
    }
}
exports.SocketService = SocketService;
// Función para obtener la instancia del socket service
function getSocketService() {
    return socketServiceInstance;
}
