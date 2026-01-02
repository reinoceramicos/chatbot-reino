import { PrismaClient } from "@prisma/client";
import { Conversation, ConversationStatus } from "../../domain/entities/conversation.entity";
import { ConversationRepositoryPort } from "../../domain/ports/conversation.repository.port";

export class PrismaConversationRepository implements ConversationRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveByCustomerId(customerId: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        customerId,
        status: { in: ["BOT", "WAITING", "ASSIGNED"] },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!conversation) return null;

    return this.mapToEntity(conversation);
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) return null;

    return this.mapToEntity(conversation);
  }

  async create(conversation: Conversation): Promise<Conversation> {
    const created = await this.prisma.conversation.create({
      data: {
        customerId: conversation.customerId,
        status: conversation.status,
        context: conversation.context || undefined,
      },
    });

    return this.mapToEntity(created);
  }

  async updateStatus(
    id: string,
    status: ConversationStatus,
    agentId?: string
  ): Promise<Conversation> {
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status,
        agentId,
      },
    });

    return this.mapToEntity(updated);
  }

  async resolve(id: string): Promise<Conversation> {
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    return this.mapToEntity(updated);
  }

  private mapToEntity(data: any): Conversation {
    return new Conversation({
      id: data.id,
      customerId: data.customerId,
      agentId: data.agentId || undefined,
      status: data.status as ConversationStatus,
      context: data.context as Record<string, any> | undefined,
      startedAt: data.startedAt,
      resolvedAt: data.resolvedAt || undefined,
      updatedAt: data.updatedAt,
    });
  }
}
