import { PrismaClient } from "@prisma/client";
import { AnalyticsRepository } from "../../domain/ports/analytics.repository.port";
import {
  AnalyticsQueryFilter,
  ConversationMetricsDto,
  AgentMetricsDto,
  BotFunnelMetricsDto,
  DashboardSummaryDto,
  DashboardAlert,
  StoreConversationMetrics,
  ZoneConversationMetrics,
  DailyMetrics,
  AgentPerformanceMetrics,
  FlowMetrics,
  AbandonmentPoint,
} from "../../application/dtos/analytics.dto";

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getConversationMetrics(filter: AnalyticsQueryFilter): Promise<ConversationMetricsDto> {
    const whereClause: any = {
      startedAt: {
        gte: filter.from,
        lte: filter.to,
      },
    };

    if (filter.storeId) {
      whereClause.storeId = filter.storeId;
    }
    if (filter.zoneId) {
      whereClause.store = { zoneId: filter.zoneId };
    }

    // Get counts by status
    const [bot, waiting, assigned, resolved] = await Promise.all([
      this.prisma.conversation.count({ where: { ...whereClause, status: "BOT" } }),
      this.prisma.conversation.count({ where: { ...whereClause, status: "WAITING" } }),
      this.prisma.conversation.count({ where: { ...whereClause, status: "ASSIGNED" } }),
      this.prisma.conversation.count({ where: { ...whereClause, status: "RESOLVED" } }),
    ]);

    const total = bot + waiting + assigned + resolved;

    // Get average times for resolved conversations
    const resolvedConversations = await this.prisma.conversation.findMany({
      where: {
        ...whereClause,
        status: "RESOLVED",
        resolvedAt: { not: null },
      },
      select: {
        startedAt: true,
        resolvedAt: true,
        firstResponseAt: true,
      },
    });

    // Calculate average resolution time (assigned to resolved)
    let avgAssignedToResolved: number | null = null;
    const resolutionTimes = resolvedConversations
      .filter((c) => c.resolvedAt && c.firstResponseAt)
      .map((c) => {
        const diff = (c.resolvedAt!.getTime() - c.firstResponseAt!.getTime()) / (1000 * 60);
        return diff;
      });

    if (resolutionTimes.length > 0) {
      avgAssignedToResolved = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    // Get metrics by store
    const storeMetrics = await this.getStoreMetrics(whereClause);

    // Get metrics by zone
    const zoneMetrics = await this.getZoneMetrics(whereClause);

    // Get daily metrics if grouped by day
    let dailyMetrics: DailyMetrics[] | undefined;
    if (filter.groupBy === "day") {
      dailyMetrics = await this.getDailyMetrics(filter);
    }

    return {
      period: { from: filter.from, to: filter.to },
      total,
      byStatus: { bot, waiting, assigned, resolved },
      averageTimeInStatus: {
        botToWaiting: null, // Would need state change tracking
        waitingToAssigned: null, // Would need state change tracking
        assignedToResolved: avgAssignedToResolved,
      },
      byStore: storeMetrics,
      byZone: zoneMetrics,
      daily: dailyMetrics,
    };
  }

  private async getStoreMetrics(baseWhere: any): Promise<StoreConversationMetrics[]> {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      include: {
        conversations: {
          where: baseWhere,
          select: {
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    return stores.map((store) => {
      const resolved = store.conversations.filter((c) => c.status === "RESOLVED");
      const resolutionTimes = resolved
        .filter((c) => c.resolvedAt)
        .map((c) => (c.resolvedAt!.getTime() - c.startedAt.getTime()) / (1000 * 60));

      return {
        storeId: store.id,
        storeName: store.name,
        total: store.conversations.length,
        resolved: resolved.length,
        avgResolutionTime:
          resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : null,
      };
    });
  }

  private async getZoneMetrics(baseWhere: any): Promise<ZoneConversationMetrics[]> {
    const zones = await this.prisma.zone.findMany({
      include: {
        stores: {
          include: {
            conversations: {
              where: baseWhere,
              select: {
                status: true,
                startedAt: true,
                resolvedAt: true,
              },
            },
          },
        },
      },
    });

    return zones.map((zone) => {
      const allConversations = zone.stores.flatMap((s) => s.conversations);
      const resolved = allConversations.filter((c) => c.status === "RESOLVED");
      const resolutionTimes = resolved
        .filter((c) => c.resolvedAt)
        .map((c) => (c.resolvedAt!.getTime() - c.startedAt.getTime()) / (1000 * 60));

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        total: allConversations.length,
        resolved: resolved.length,
        avgResolutionTime:
          resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : null,
      };
    });
  }

  private async getDailyMetrics(filter: AnalyticsQueryFilter): Promise<DailyMetrics[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        startedAt: {
          gte: filter.from,
          lte: filter.to,
        },
        ...(filter.storeId ? { storeId: filter.storeId } : {}),
        ...(filter.zoneId ? { store: { zoneId: filter.zoneId } } : {}),
      },
      select: {
        startedAt: true,
        status: true,
        agentId: true,
      },
    });

    // Group by date
    const dailyMap = new Map<string, { total: number; resolved: number; transferred: number }>();

    conversations.forEach((c) => {
      const date = c.startedAt.toISOString().split("T")[0];
      const current = dailyMap.get(date) || { total: 0, resolved: 0, transferred: 0 };
      current.total++;
      if (c.status === "RESOLVED") current.resolved++;
      if (c.agentId) current.transferred++;
      dailyMap.set(date, current);
    });

    return Array.from(dailyMap.entries())
      .map(([date, metrics]) => ({
        date,
        total: metrics.total,
        resolved: metrics.resolved,
        transferredToAgent: metrics.transferred,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getAgentMetrics(filter: AnalyticsQueryFilter): Promise<AgentMetricsDto> {
    const agents = await this.prisma.agent.findMany({
      where: {
        ...(filter.storeId ? { storeId: filter.storeId } : {}),
        ...(filter.zoneId ? { zoneId: filter.zoneId } : {}),
        ...(filter.agentId ? { id: filter.agentId } : {}),
      },
      include: {
        store: true,
        conversations: {
          where: {
            startedAt: {
              gte: filter.from,
              lte: filter.to,
            },
          },
          select: {
            status: true,
            startedAt: true,
            resolvedAt: true,
            firstResponseAt: true,
          },
        },
      },
    });

    const agentMetrics: AgentPerformanceMetrics[] = agents.map((agent) => {
      const resolved = agent.conversations.filter((c) => c.status === "RESOLVED");

      // Calculate average response time (start to first response)
      const responseTimes = agent.conversations
        .filter((c) => c.firstResponseAt)
        .map((c) => (c.firstResponseAt!.getTime() - c.startedAt.getTime()) / 1000);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

      // Calculate average resolution time
      const resolutionTimes = resolved
        .filter((c) => c.resolvedAt)
        .map((c) => (c.resolvedAt!.getTime() - c.startedAt.getTime()) / (1000 * 60));

      const avgResolutionTime =
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          : null;

      return {
        agentId: agent.id,
        agentName: agent.name,
        storeId: agent.storeId || undefined,
        storeName: agent.store?.name,
        conversationsHandled: agent.conversations.length,
        conversationsResolved: resolved.length,
        avgResponseTime,
        avgResolutionTime,
        currentLoad: agent.activeConversations,
        maxLoad: agent.maxConversations,
      };
    });

    return {
      period: { from: filter.from, to: filter.to },
      agents: agentMetrics,
    };
  }

  async getBotFunnelMetrics(filter: AnalyticsQueryFilter): Promise<BotFunnelMetricsDto> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        startedAt: {
          gte: filter.from,
          lte: filter.to,
        },
        flowType: { not: null },
        ...(filter.storeId ? { storeId: filter.storeId } : {}),
        ...(filter.zoneId ? { store: { zoneId: filter.zoneId } } : {}),
      },
      select: {
        flowType: true,
        flowStep: true,
        flowStartedAt: true,
        status: true,
        agentId: true,
        resolvedAt: true,
      },
    });

    // Group by flow type
    const flowMap = new Map<
      string,
      {
        started: number;
        completed: number;
        abandoned: number;
        durations: number[];
        abandonmentSteps: Map<string, number>;
      }
    >();

    conversations.forEach((c) => {
      if (!c.flowType) return;

      const current = flowMap.get(c.flowType) || {
        started: 0,
        completed: 0,
        abandoned: 0,
        durations: [] as number[],
        abandonmentSteps: new Map<string, number>(),
      };

      current.started++;

      // A flow is "completed" if it reached the final step or was resolved
      // For now, we consider transferred to agent or resolved as completed
      if (c.status === "RESOLVED" || c.agentId) {
        current.completed++;
        if (c.flowStartedAt && c.resolvedAt) {
          current.durations.push(
            (c.resolvedAt.getTime() - c.flowStartedAt.getTime()) / (1000 * 60)
          );
        }
      } else if (c.status === "BOT" && c.flowStep) {
        // Still in bot state with a flow step = potentially abandoned
        current.abandoned++;
        const stepCount = current.abandonmentSteps.get(c.flowStep) || 0;
        current.abandonmentSteps.set(c.flowStep, stepCount + 1);
      }

      flowMap.set(c.flowType, current);
    });

    const flows: FlowMetrics[] = Array.from(flowMap.entries()).map(([flowType, data]) => ({
      flowType,
      started: data.started,
      completed: data.completed,
      abandoned: data.abandoned,
      completionRate: data.started > 0 ? (data.completed / data.started) * 100 : 0,
      avgDuration:
        data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : null,
    }));

    // Collect abandonment points
    const abandonmentPoints: AbandonmentPoint[] = [];
    flowMap.forEach((data, flowType) => {
      data.abandonmentSteps.forEach((count, step) => {
        abandonmentPoints.push({
          flowType,
          step,
          abandonments: count,
          percentage: data.started > 0 ? (count / data.started) * 100 : 0,
        });
      });
    });

    // Sort by number of abandonments
    abandonmentPoints.sort((a, b) => b.abandonments - a.abandonments);

    // Calculate overall transfer rate
    const totalConversations = conversations.length;
    const transferredToAgent = conversations.filter((c) => c.agentId).length;
    const transferRate = totalConversations > 0 ? (transferredToAgent / totalConversations) * 100 : 0;

    return {
      period: { from: filter.from, to: filter.to },
      flows,
      abandonmentPoints: abandonmentPoints.slice(0, 10), // Top 10
      transferRate,
    };
  }

  async getDashboardSummary(storeId?: string, zoneId?: string): Promise<DashboardSummaryDto> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const whereClause: any = {};
    if (storeId) {
      whereClause.storeId = storeId;
    }
    if (zoneId) {
      whereClause.store = { zoneId };
    }

    // Real-time metrics
    const [waitingCount, assignedCount, onlineAgentsCount] = await Promise.all([
      this.prisma.conversation.count({
        where: { ...whereClause, status: "WAITING" },
      }),
      this.prisma.conversation.count({
        where: { ...whereClause, status: "ASSIGNED" },
      }),
      this.prisma.agent.count({
        where: {
          status: { in: ["AVAILABLE", "BUSY"] },
          ...(storeId ? { storeId } : {}),
          ...(zoneId ? { zoneId } : {}),
        },
      }),
    ]);

    // Calculate average waiting time for waiting conversations
    const waitingConversations = await this.prisma.conversation.findMany({
      where: { ...whereClause, status: "WAITING" },
      select: { startedAt: true },
    });

    let avgWaitingTime: number | null = null;
    if (waitingConversations.length > 0) {
      const waitingTimes = waitingConversations.map(
        (c) => (now.getTime() - c.startedAt.getTime()) / (1000 * 60)
      );
      avgWaitingTime = waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length;
    }

    // Today's metrics
    const todayWhere = {
      ...whereClause,
      startedAt: { gte: todayStart },
    };

    const [todayTotal, todayResolved, todayTransferred] = await Promise.all([
      this.prisma.conversation.count({ where: todayWhere }),
      this.prisma.conversation.count({ where: { ...todayWhere, status: "RESOLVED" } }),
      this.prisma.conversation.count({ where: { ...todayWhere, agentId: { not: null } } }),
    ]);

    // Average resolution time for today
    const todayResolvedConversations = await this.prisma.conversation.findMany({
      where: {
        ...todayWhere,
        status: "RESOLVED",
        resolvedAt: { not: null },
      },
      select: { startedAt: true, resolvedAt: true },
    });

    let avgResolutionTime: number | null = null;
    if (todayResolvedConversations.length > 0) {
      const resolutionTimes = todayResolvedConversations.map(
        (c) => (c.resolvedAt!.getTime() - c.startedAt.getTime()) / (1000 * 60)
      );
      avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    // Generate alerts
    const alerts: DashboardAlert[] = [];

    // Alert: Long waiting conversations (> 10 minutes)
    const longWaitingConversations = await this.getConversationsWaitingLongerThan(10);
    if (longWaitingConversations.length > 0) {
      alerts.push({
        type: "LONG_WAIT",
        severity: longWaitingConversations.some((c) => c.waitingMinutes > 20) ? "critical" : "warning",
        message: `${longWaitingConversations.length} conversaciones esperando más de 10 minutos`,
        metadata: { count: longWaitingConversations.length },
      });
    }

    // Alert: High load
    if (waitingCount > 5) {
      alerts.push({
        type: "HIGH_LOAD",
        severity: waitingCount > 10 ? "critical" : "warning",
        message: `${waitingCount} conversaciones en espera`,
        metadata: { waitingCount },
      });
    }

    // Alert: No agents online
    if (onlineAgentsCount === 0 && waitingCount > 0) {
      alerts.push({
        type: "NO_AGENTS",
        severity: "critical",
        message: "No hay agentes disponibles y hay conversaciones en espera",
        metadata: { waitingCount },
      });
    }

    return {
      timestamp: now,
      realtime: {
        waitingConversations: waitingCount,
        assignedConversations: assignedCount,
        onlineAgents: onlineAgentsCount,
        avgWaitingTime,
      },
      today: {
        totalConversations: todayTotal,
        resolvedConversations: todayResolved,
        transferredToAgent: todayTransferred,
        avgResolutionTime,
      },
      alerts,
    };
  }

  async getConversationsWaitingLongerThan(
    minutes: number
  ): Promise<
    Array<{
      conversationId: string;
      storeId?: string;
      zoneId?: string;
      waitingMinutes: number;
      customerName?: string;
      customerWaId: string;
    }>
  > {
    const threshold = new Date(Date.now() - minutes * 60 * 1000);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        status: "WAITING",
        startedAt: { lt: threshold },
      },
      include: {
        customer: true,
        store: {
          include: { zone: true },
        },
      },
    });

    return conversations.map((c) => ({
      conversationId: c.id,
      storeId: c.storeId || undefined,
      zoneId: c.store?.zoneId || undefined,
      waitingMinutes: Math.floor((Date.now() - c.startedAt.getTime()) / (1000 * 60)),
      customerName: c.customer.name || undefined,
      customerWaId: c.customer.waId,
    }));
  }
}
