"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConversationService = void 0;
const client_1 = require("@prisma/client");
class AgentConversationService {
    prisma;
    agentRepository;
    constructor(prisma, agentRepository) {
        this.prisma = prisma;
        this.agentRepository = agentRepository;
    }
    /**
     * Construye el filtro WHERE según el rol del agente
     */
    buildRoleFilter(filter, baseStatus) {
        const whereClause = {};
        if (baseStatus) {
            whereClause.status = baseStatus;
        }
        switch (filter.role) {
            case "REGIONAL_MANAGER":
                // Ve todas las conversaciones
                break;
            case "ZONE_SUPERVISOR":
                // Ve conversaciones de todas las tiendas de su zona
                if (filter.zoneId) {
                    whereClause.store = { zoneId: filter.zoneId };
                }
                break;
            case "MANAGER":
                // Ve conversaciones de su tienda
                if (filter.storeId) {
                    whereClause.storeId = filter.storeId;
                }
                break;
            case "SELLER":
            default:
                // Solo ve sus propias conversaciones asignadas
                if (baseStatus === "WAITING") {
                    // Para waiting, filtra por tienda
                    if (filter.storeId) {
                        whereClause.storeId = filter.storeId;
                    }
                }
                else {
                    // Para assigned, solo las suyas
                    whereClause.agentId = filter.agentId;
                }
                break;
        }
        return whereClause;
    }
    async getWaitingConversations(filter) {
        const whereClause = this.buildRoleFilter(filter, "WAITING");
        const conversations = await this.prisma.conversation.findMany({
            where: whereClause,
            include: {
                customer: true,
                store: true,
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "desc" },
        });
        return conversations.map((c) => ({
            id: c.id,
            customerId: c.customerId,
            customerName: c.customer.name || undefined,
            customerWaId: c.customer.waId,
            status: c.status,
            storeId: c.storeId || undefined,
            storeName: c.store?.name,
            lastMessage: c.messages[0]?.content || undefined,
            lastMessageAt: c.messages[0]?.createdAt,
            startedAt: c.startedAt,
            unreadCount: 0, // TODO: implementar conteo de no leídos
        }));
    }
    async getAgentConversations(filter) {
        const whereClause = this.buildRoleFilter(filter, "ASSIGNED");
        const conversations = await this.prisma.conversation.findMany({
            where: whereClause,
            include: {
                customer: true,
                store: true,
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "desc" },
        });
        return conversations.map((c) => ({
            id: c.id,
            customerId: c.customerId,
            customerName: c.customer.name || undefined,
            customerWaId: c.customer.waId,
            status: c.status,
            storeId: c.storeId || undefined,
            storeName: c.store?.name,
            lastMessage: c.messages[0]?.content || undefined,
            lastMessageAt: c.messages[0]?.createdAt,
            startedAt: c.startedAt,
            unreadCount: 0,
        }));
    }
    /**
     * Obtiene todas las conversaciones (waiting + assigned) según el rol
     * Útil para supervisores que quieren ver todo de un vistazo
     */
    async getAllConversations(filter) {
        const whereClause = this.buildRoleFilter(filter);
        whereClause.status = { in: ["WAITING", "ASSIGNED"] };
        const conversations = await this.prisma.conversation.findMany({
            where: whereClause,
            include: {
                customer: true,
                store: true,
                agent: true,
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "desc" },
        });
        return conversations.map((c) => ({
            id: c.id,
            customerId: c.customerId,
            customerName: c.customer.name || undefined,
            customerWaId: c.customer.waId,
            status: c.status,
            storeId: c.storeId || undefined,
            storeName: c.store?.name,
            agentId: c.agentId || undefined,
            agentName: c.agent?.name,
            lastMessage: c.messages[0]?.content || undefined,
            lastMessageAt: c.messages[0]?.createdAt,
            startedAt: c.startedAt,
            unreadCount: 0,
        }));
    }
    async getConversationDetail(conversationId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                customer: true,
                store: true,
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        if (!conversation)
            return null;
        return {
            id: conversation.id,
            customerId: conversation.customerId,
            customerName: conversation.customer.name || undefined,
            customerWaId: conversation.customer.waId,
            status: conversation.status,
            storeId: conversation.storeId || undefined,
            storeName: conversation.store?.name,
            lastMessage: conversation.messages[conversation.messages.length - 1]?.content || undefined,
            lastMessageAt: conversation.messages[conversation.messages.length - 1]?.createdAt,
            startedAt: conversation.startedAt,
            unreadCount: 0,
            flowType: conversation.flowType || undefined,
            flowData: conversation.flowData,
            messages: conversation.messages.map((m) => ({
                id: m.id,
                content: m.content || undefined,
                type: m.type,
                direction: m.direction,
                sentByBot: m.sentByBot,
                sentByAgentId: m.sentByAgentId || undefined,
                mediaUrl: m.mediaUrl || undefined,
                createdAt: m.createdAt,
            })),
        };
    }
    async assignConversation(conversationId, agentId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation || conversation.status !== "WAITING") {
            return false;
        }
        const agent = await this.agentRepository.findById(agentId);
        if (!agent || !agent.canAcceptConversation()) {
            return false;
        }
        await this.prisma.$transaction([
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    agentId,
                    status: "ASSIGNED",
                },
            }),
        ]);
        await this.agentRepository.incrementActiveConversations(agentId);
        return true;
    }
    async resolveConversation(conversationId, agentId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation || conversation.agentId !== agentId) {
            return false;
        }
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date(),
            },
        });
        await this.agentRepository.decrementActiveConversations(agentId);
        return true;
    }
    async transferToBot(conversationId, agentId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation || conversation.agentId !== agentId) {
            return false;
        }
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: "BOT",
                agentId: null,
                flowType: null,
                flowStep: null,
                flowData: client_1.Prisma.JsonNull,
            },
        });
        await this.agentRepository.decrementActiveConversations(agentId);
        return true;
    }
    async saveAgentMessage(conversationId, agentId, content, waMessageId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation)
            return;
        await this.prisma.message.create({
            data: {
                conversationId,
                customerId: conversation.customerId,
                waMessageId,
                direction: "OUTBOUND",
                type: "TEXT",
                content,
                sentByBot: false,
                sentByAgentId: agentId,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
    }
}
exports.AgentConversationService = AgentConversationService;
