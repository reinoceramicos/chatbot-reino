import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../../agents/infrastructure/middleware/auth.middleware";
import { AnalyticsService } from "../../application/services/analytics.service";
import { AnalyticsQueryFilter } from "../../application/dtos/analytics.dto";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
      const roleFilter = this.applyRoleFilter(req, storeId as string, zoneId as string);

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

  async getAgentMetricsById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.agent) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { agentId } = req.params;
      const { from, to } = req.query;

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

  private applyRoleFilter(
    req: AuthenticatedRequest,
    requestedStoreId?: string,
    requestedZoneId?: string
  ): { storeId?: string; zoneId?: string } {
    const agent = req.agent!;

    switch (agent.role) {
      case "REGIONAL_MANAGER":
        return { storeId: requestedStoreId, zoneId: requestedZoneId };

      case "ZONE_SUPERVISOR":
        return { storeId: requestedStoreId, zoneId: agent.zoneId };

      case "MANAGER":
        return { storeId: agent.storeId, zoneId: undefined };

      case "SELLER":
      default:
        return { storeId: agent.storeId, zoneId: undefined };
    }
  }

  private async canAccessAgentMetrics(
    req: AuthenticatedRequest,
    targetAgentId: string
  ): Promise<boolean> {
    const agent = req.agent!;

    if (agent.agentId === targetAgentId) {
      return true;
    }

    switch (agent.role) {
      case "REGIONAL_MANAGER":
      case "ZONE_SUPERVISOR":
      case "MANAGER":
        return true;
      case "SELLER":
      default:
        return false;
    }
  }
}
