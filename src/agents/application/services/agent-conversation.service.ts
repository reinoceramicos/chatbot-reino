import { PrismaClient, Prisma } from "@prisma/client";
import { AgentRepository } from "../../domain/ports/agent.repository.port";

export interface ConversationSummary {
  id: string;
  customerId: string;
  customerName?: string;
  customerWaId: string;
  status: string;
  storeId?: string;
  storeName?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  startedAt: Date;
  unreadCount: number;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageSummary[];
  flowType?: string;
  flowData?: Record<string, any>;
}

export interface MessageSummary {
  id: string;
  content?: string;
  type: string;
  direction: string;
  sentByBot: boolean;
  sentByAgentId?: string;
  createdAt: Date;
}

export class AgentConversationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly agentRepository: AgentRepository
  ) {}

  async getWaitingConversations(storeId?: string): Promise<ConversationSummary[]> {
    const whereClause: any = { status: "WAITING" };

    if (storeId) {
      whereClause.storeId = storeId;
    }

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

  async getAgentConversations(agentId: string): Promise<ConversationSummary[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        agentId,
        status: "ASSIGNED",
      },
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

  async getConversationDetail(conversationId: string): Promise<ConversationDetail | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        store: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100, // Últimos 100 mensajes
        },
      },
    });

    if (!conversation) return null;

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
      flowData: conversation.flowData as Record<string, any> | undefined,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        content: m.content || undefined,
        type: m.type,
        direction: m.direction,
        sentByBot: m.sentByBot,
        sentByAgentId: m.sentByAgentId || undefined,
        createdAt: m.createdAt,
      })),
    };
  }

  async assignConversation(conversationId: string, agentId: string): Promise<boolean> {
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

  async resolveConversation(conversationId: string, agentId: string): Promise<boolean> {
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

  async transferToBot(conversationId: string, agentId: string): Promise<boolean> {
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
        flowData: Prisma.JsonNull,
      },
    });

    await this.agentRepository.decrementActiveConversations(agentId);

    return true;
  }

  async saveAgentMessage(
    conversationId: string,
    agentId: string,
    content: string,
    waMessageId?: string
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return;

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
