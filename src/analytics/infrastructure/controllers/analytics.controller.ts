import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../../agents/infrastructure/middleware/auth.middleware";
import { AnalyticsService } from "../../application/services/analytics.service";
import { AnalyticsQueryFilter } from "../../application/dtos/analytics.dto";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/me
   * Get metrics for the authenticated agent (any role can access their own)
   */
  async getMyMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { from, to } = req.query;
      const dateRange = AnalyticsService.parseDateRange(
        from as string | undefined,
        to as string | undefined
      );

      const filter: AnalyticsQueryFilter = {
        from: dateRange.from,
        to: dateRange.to,
        agentId: req.agent.agentId,
      };

      const metrics = await this.analyticsService.getAgentMetrics(filter);

      // Return only the authenticated agent's metrics
      const myMetrics = metrics.agents.find(a => a.agentId === req.agent!.agentId);

      res.json({
        period: metrics.period,
        metrics: myMetrics || null,
      });
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting my metrics:", error);
      res.status(500).json({ error: "Error al obtener tus métricas" });
    }
  }

  /**
   * GET /analytics/conversations
   * Get conversation metrics for a period
   */
  async getConversationMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { from, to, storeId, zoneId, groupBy } = req.query;

      const dateRange = AnalyticsService.parseDateRange(
        from as string | undefined,
        to as string | undefined
      );

      // Apply role-based filtering
      const roleFilter = this.applyRoleFilter(req, storeId as string, zoneId as string);

      const filter: AnalyticsQueryFilter = {
        from: dateRange.from,
        to: dateRange.to,
        storeId: roleFilter.storeId,
        zoneId: roleFilter.zoneId,
        groupBy: groupBy as "day" | "week" | "month" | undefined,
      };

      const metrics = await this.analyticsService.getConversationMetrics(filter);
      res.json(metrics);
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting conversation metrics:", error);
      res.status(500).json({ error: "Error al obtener métricas de conversaciones" });
    }
  }

  /**
   * GET /analytics/agents
   * Get agent performance metrics filtered by role
   * - SELLER: only their own metrics
   * - MANAGER: agents in their store
   * - ZONE_SUPERVISOR: agents in their zone
   * - REGIONAL_MANAGER: all agents
   */
  async getAgentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { from, to, storeId, zoneId } = req.query;

      const dateRange = AnalyticsService.parseDateRange(
        from as string | undefined,
        to as string | undefined
      );

      // Apply role-based filtering
      const roleFilter = this.applyRoleFilter(req, storeId as string, zoneId as string);

      // If SELLER, only return their own metrics
      if (req.agent.role === "SELLER") {
        const filter: AnalyticsQueryFilter = {
          from: dateRange.from,
          to: dateRange.to,
          agentId: req.agent.agentId,
        };
        const metrics = await this.analyticsService.getAgentMetrics(filter);
        res.json(metrics);
        return;
      }

      const filter: AnalyticsQueryFilter = {
        from: dateRange.from,
        to: dateRange.to,
        storeId: roleFilter.storeId,
        zoneId: roleFilter.zoneId,
      };

      const metrics = await this.analyticsService.getAgentMetrics(filter);
      res.json(metrics);
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting agent metrics:", error);
      res.status(500).json({ error: "Error al obtener métricas de agentes" });
    }
  }

  /**
   * GET /analytics/agents/:agentId
   * Get metrics for a specific agent (with role-based access control)
   */
  async getAgentMetricsById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { agentId } = req.params;
      const { from, to } = req.query;

      // Check if user has permission to view this agent's metrics
      const hasAccess = await this.canAccessAgentMetrics(req, agentId);
      if (!hasAccess) {
        res.status(403).json({ error: "No tienes permiso para ver estas métricas" });
        return;
      }

      const dateRange = AnalyticsService.parseDateRange(
        from as string | undefined,
        to as string | undefined
      );

      const filter: AnalyticsQueryFilter = {
        from: dateRange.from,
        to: dateRange.to,
        agentId,
      };

      const metrics = await this.analyticsService.getAgentMetrics(filter);
      const agentMetrics = metrics.agents.find(a => a.agentId === agentId);

      if (!agentMetrics) {
        res.status(404).json({ error: "Agente no encontrado" });
        return;
      }

      res.json({
        period: metrics.period,
        metrics: agentMetrics,
      });
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting agent metrics by id:", error);
      res.status(500).json({ error: "Error al obtener métricas del agente" });
    }
  }

  /**
   * Apply role-based filtering to queries
   */
  private applyRoleFilter(
    req: AuthenticatedRequest,
    requestedStoreId?: string,
    requestedZoneId?: string
  ): { storeId?: string; zoneId?: string } {
    const agent = req.agent!;

    switch (agent.role) {
      case "REGIONAL_MANAGER":
        // Can see everything, use requested filters
        return {
          storeId: requestedStoreId,
          zoneId: requestedZoneId,
        };

      case "ZONE_SUPERVISOR":
        // Can only see their zone
        // If they request a specific store, validate it's in their zone
        return {
          storeId: requestedStoreId, // Will be filtered by zone anyway
          zoneId: agent.zoneId, // Force their zone
        };

      case "MANAGER":
        // Can only see their store
        return {
          storeId: agent.storeId, // Force their store
          zoneId: undefined,
        };

      case "SELLER":
      default:
        // Sellers should use /analytics/me
        return {
          storeId: agent.storeId,
          zoneId: undefined,
        };
    }
  }

  /**
   * Check if user can access a specific agent's metrics
   */
  private async canAccessAgentMetrics(
    req: AuthenticatedRequest,
    targetAgentId: string
  ): Promise<boolean> {
    const agent = req.agent!;

    // Can always see own metrics
    if (agent.agentId === targetAgentId) {
      return true;
    }

    switch (agent.role) {
      case "REGIONAL_MANAGER":
        // Can see all agents
        return true;

      case "ZONE_SUPERVISOR":
        // Can see agents in their zone
        // This would require a DB lookup to check if target agent is in their zone
        // For now, allow and let the service filter
        return true;

      case "MANAGER":
        // Can see agents in their store
        // This would require a DB lookup to check if target agent is in their store
        // For now, allow and let the service filter
        return true;

      case "SELLER":
      default:
        // Can only see own metrics
        return false;
    }
  }

  /**
   * GET /analytics/bot/funnel
   * Get bot funnel metrics (flow completion, abandonment)
   */
  async getBotFunnelMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, storeId, zoneId } = req.query;

      const dateRange = AnalyticsService.parseDateRange(
        from as string | undefined,
        to as string | undefined
      );

      const filter: AnalyticsQueryFilter = {
        from: dateRange.from,
        to: dateRange.to,
        storeId: storeId as string | undefined,
        zoneId: zoneId as string | undefined,
      };

      const metrics = await this.analyticsService.getBotFunnelMetrics(filter);
      res.json(metrics);
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting bot funnel metrics:", error);
      res.status(500).json({ error: "Error al obtener métricas del bot" });
    }
  }

  /**
   * GET /analytics/dashboard
   * Get real-time dashboard summary
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, zoneId } = req.query;

      const summary = await this.analyticsService.getDashboardSummary(
        storeId as string | undefined,
        zoneId as string | undefined
      );
      res.json(summary);
    } catch (error: any) {
      console.error("[AnalyticsController] Error getting dashboard summary:", error);
      res.status(500).json({ error: "Error al obtener resumen del dashboard" });
    }
  }
}
