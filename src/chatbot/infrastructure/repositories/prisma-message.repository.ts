import { PrismaClient, MessageDirection, MessageType } from "@prisma/client";

export interface SaveMessageParams {
  conversationId: string;
  customerId: string;
  waMessageId?: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content?: string;
  mediaUrl?: string;
  mediaId?: string;
  metadata?: Record<string, any>;
  sentByBot?: boolean;
  sentByAgentId?: string;
}

export class PrismaMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(params: SaveMessageParams): Promise<void> {
    await this.prisma.message.create({
      data: {
        conversationId: params.conversationId,
        customerId: params.customerId,
        waMessageId: params.waMessageId,
        direction: params.direction as MessageDirection,
        type: (params.type.toUpperCase() as MessageType) || "TEXT",
        content: params.content,
        mediaUrl: params.mediaUrl,
        mediaId: params.mediaId,
        metadata: params.metadata || undefined,
        sentByBot: params.sentByBot || false,
        sentByAgentId: params.sentByAgentId,
      },
    });
  }

  async findByConversationId(conversationId: string, limit = 50): Promise<any[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }
}
