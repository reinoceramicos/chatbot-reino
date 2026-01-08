"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaMessageRepository = void 0;
class PrismaMessageRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async save(params) {
        await this.prisma.message.create({
            data: {
                conversationId: params.conversationId,
                customerId: params.customerId,
                waMessageId: params.waMessageId,
                direction: params.direction,
                type: params.type.toUpperCase() || "TEXT",
                content: params.content,
                mediaUrl: params.mediaUrl,
                mediaId: params.mediaId,
                metadata: params.metadata || undefined,
                sentByBot: params.sentByBot || false,
                sentByAgentId: params.sentByAgentId,
            },
        });
    }
    async findByConversationId(conversationId, limit = 50) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "asc" },
            take: limit,
        });
    }
}
exports.PrismaMessageRepository = PrismaMessageRepository;
