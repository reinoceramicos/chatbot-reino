"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaConversationRepository = void 0;
const client_1 = require("@prisma/client");
const conversation_entity_1 = require("../../domain/entities/conversation.entity");
class PrismaConversationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findActiveByCustomerId(customerId) {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                customerId,
                status: { in: ["BOT", "WAITING", "ASSIGNED"] },
            },
            orderBy: { startedAt: "desc" },
        });
        if (!conversation)
            return null;
        return this.mapToEntity(conversation);
    }
    async findById(id) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id },
        });
        if (!conversation)
            return null;
        return this.mapToEntity(conversation);
    }
    async create(conversation) {
        const created = await this.prisma.conversation.create({
            data: {
                customerId: conversation.customerId,
                status: conversation.status,
                context: conversation.context || undefined,
            },
        });
        return this.mapToEntity(created);
    }
    async updateStatus(id, status, agentId) {
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: {
                status,
                agentId,
            },
        });
        return this.mapToEntity(updated);
    }
    async updateStoreId(id, storeId) {
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: { storeId },
        });
        return this.mapToEntity(updated);
    }
    async resolve(id) {
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date(),
            },
        });
        return this.mapToEntity(updated);
    }
    async updateFlow(id, params) {
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: {
                flowType: params.flowType,
                flowStep: params.flowStep,
                flowData: params.flowData || undefined,
                flowStartedAt: params.flowStartedAt,
            },
        });
        return this.mapToEntity(updated);
    }
    async clearFlow(id) {
        const updated = await this.prisma.conversation.update({
            where: { id },
            data: {
                flowType: null,
                flowStep: null,
                flowData: client_1.Prisma.JsonNull,
                flowStartedAt: null,
            },
        });
        return this.mapToEntity(updated);
    }
    mapToEntity(data) {
        return new conversation_entity_1.Conversation({
            id: data.id,
            customerId: data.customerId,
            agentId: data.agentId || undefined,
            status: data.status,
            context: data.context,
            startedAt: data.startedAt,
            resolvedAt: data.resolvedAt || undefined,
            updatedAt: data.updatedAt,
            // Campos de flujo
            flowType: data.flowType,
            flowStep: data.flowStep || undefined,
            flowData: data.flowData,
            flowStartedAt: data.flowStartedAt || undefined,
        });
    }
}
exports.PrismaConversationRepository = PrismaConversationRepository;
