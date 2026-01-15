import { PrismaClient, Prisma } from "@prisma/client";
import { AgentRepository } from "../../domain/ports/agent.repository.port";
import { Agent, AgentRole } from "../../domain/entities/agent.entity";

export interface ConversationFilter {
  agentId: string;
  role: AgentRole;
  storeId?: string;
  zoneId?: string;
}

export interface ConversationSummary {
  id: string;
  customerId: string;
  customerName?: string;
  customerWaId: string;
  status: string;
  storeId?: string;
  storeName?: string;
  agentId?: string;
  agentName?: string;
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
  status?: string;
  sentByBot: boolean;
  sentByAgentId?: string;
  mediaUrl?: string;
  createdAt: Date;
}

export class AgentConversationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly agentRepository: AgentRepository
  ) {}

  /**
   * Construye el filtro WHERE según el rol del agente
   */
  private buildRoleFilter(filter: ConversationFilter, baseStatus?: string): any {
    const whereClause: any = {};

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
        } else {
          // Para assigned, solo las suyas
          whereClause.agentId = filter.agentId;
        }
        break;
    }

    return whereClause;
  }

  async getWaitingConversations(filter: ConversationFilter): Promise<ConversationSummary[]> {
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
        _count: {
          select: {
            messages: {
              where: {
                direction: "INBOUND",
              },
            },
          },
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
      unreadCount: c._count.messages, // All inbound messages are "unread" for waiting conversations
    }));
  }

  async getAgentConversations(filter: ConversationFilter): Promise<ConversationSummary[]> {
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

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (c) => {
        // Count inbound messages after lastReadAt
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            direction: "INBOUND",
            ...(c.lastReadAt ? { createdAt: { gt: c.lastReadAt } } : {}),
          },
        });

        return {
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
          unreadCount,
        };
      })
    );

    return conversationsWithUnread;
  }

  /**
   * Obtiene todas las conversaciones (waiting + assigned) según el rol
   * Útil para supervisores que quieren ver todo de un vistazo
   */
  async getAllConversations(filter: ConversationFilter): Promise<ConversationSummary[]> {
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

  /**
   * Obtiene el historial de conversaciones resueltas según el rol
   */
  async getResolvedConversations(filter: ConversationFilter): Promise<ConversationSummary[]> {
    const whereClause = this.buildRoleFilter(filter);
    whereClause.status = "RESOLVED";

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
      orderBy: { resolvedAt: "desc" },
      take: 50, // Limit to last 50 resolved conversations
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

  async getConversationDetail(conversationId: string): Promise<ConversationDetail | null> {
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
        status: m.status || undefined,
        sentByBot: m.sentByBot,
        sentByAgentId: m.sentByAgentId || undefined,
        mediaUrl: m.mediaUrl || undefined,
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

  async markAsRead(conversationId: string, agentId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return false;

    // For assigned conversations, only the assigned agent can mark as read
    // For waiting conversations, any agent with access can mark as read
    if (conversation.status === "ASSIGNED" && conversation.agentId !== agentId) {
      return false;
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastReadAt: new Date() },
    });

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
        status: "SENT",
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

  /**
   * Get agents available for transfer (excluding current agent)
   */
  async getAvailableAgentsForTransfer(
    conversationId: string,
    currentAgentId: string
  ): Promise<{ id: string; name: string; activeConversations: number; maxConversations: number }[]> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.storeId) {
      return [];
    }

    // Get available agents in the same store
    const agents = await this.agentRepository.findAvailableByStoreId(conversation.storeId);

    // Filter out current agent and agents without id, then return simplified data
    return agents
      .filter((a): a is Agent & { id: string } => !!a.id && a.id !== currentAgentId)
      .map((a) => ({
        id: a.id,
        name: a.name,
        activeConversations: a.activeConversations,
        maxConversations: a.maxConversations,
      }));
  }

  /**
   * Transfer conversation to another agent
   */
  async transferToAgent(
    conversationId: string,
    fromAgentId: string,
    toAgentId: string
  ): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.agentId !== fromAgentId) {
      return false;
    }

    const targetAgent = await this.agentRepository.findById(toAgentId);
    if (!targetAgent || !targetAgent.canAcceptConversation()) {
      return false;
    }

    // Update conversation to new agent
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        agentId: toAgentId,
        updatedAt: new Date(),
      },
    });

    // Decrement from source agent, increment for target agent
    await this.agentRepository.decrementActiveConversations(fromAgentId);
    await this.agentRepository.incrementActiveConversations(toAgentId);

    return true;
  }
}
