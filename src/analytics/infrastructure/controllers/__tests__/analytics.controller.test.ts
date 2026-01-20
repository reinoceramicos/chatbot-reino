import { Response } from "express";
import { AnalyticsController } from "../analytics.controller";
import { AnalyticsService } from "../../../application/services/analytics.service";
import { AuthenticatedRequest } from "../../../../agents/infrastructure/middleware/auth.middleware";
import { AgentMetricsDto, DashboardSummaryDto } from "../../../application/dtos/analytics.dto";

const createMockService = (): jest.Mocked<AnalyticsService> => ({
  getConversationMetrics: jest.fn(),
  getAgentMetrics: jest.fn(),
  getBotFunnelMetrics: jest.fn(),
  getDashboardSummary: jest.fn(),
  startAlertMonitoring: jest.fn(),
  stopAlertMonitoring: jest.fn(),
} as any);

const createMockResponse = (): jest.Mocked<Response> => {
  const res: Partial<jest.Mocked<Response>> = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res as jest.Mocked<Response>;
};

const createMockRequest = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest => ({
  agent: {
    agentId: "agent-1",
    email: "test@test.com",
    role: "SELLER",
    storeId: "store-1",
    zoneId: "zone-1",
  },
  query: {},
  params: {},
  ...overrides,
} as AuthenticatedRequest);

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;
  let res: jest.Mocked<Response>;

  const mockAgentMetrics: AgentMetricsDto = {
    period: { from: new Date(), to: new Date() },
    agents: [
      {
        agentId: "agent-1",
        agentName: "Test Agent",
        conversationsHandled: 10,
        conversationsResolved: 8,
        avgResponseTime: 60,
        avgResolutionTime: 10,
        currentLoad: 2,
        maxLoad: 5,
      },
    ],
  };

  const mockDashboard: DashboardSummaryDto = {
    timestamp: new Date(),
    realtime: {
      waitingConversations: 3,
      assignedConversations: 5,
      onlineAgents: 2,
      avgWaitingTime: 5,
    },
    today: {
      totalConversations: 20,
      resolvedConversations: 15,
      transferredToAgent: 10,
      avgResolutionTime: 8,
    },
    alerts: [],
  };

  beforeEach(() => {
    service = createMockService();
    controller = new AnalyticsController(service);
    res = createMockResponse();
  });

  describe("getMyMetrics", () => {
    it("should return 401 if not authenticated", async () => {
      const req = createMockRequest({ agent: undefined });

      await controller.getMyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "No autenticado" });
    });

    it("should return agent own metrics", async () => {
      const req = createMockRequest();
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getMyMetrics(req, res);

      expect(service.getAgentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: "agent-1" })
      );
      expect(res.json).toHaveBeenCalledWith({
        period: mockAgentMetrics.period,
        metrics: mockAgentMetrics.agents[0],
      });
    });

    it("should return null metrics if agent not found in results", async () => {
      const req = createMockRequest();
      service.getAgentMetrics.mockResolvedValue({ ...mockAgentMetrics, agents: [] });

      await controller.getMyMetrics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        period: mockAgentMetrics.period,
        metrics: null,
      });
    });
  });

  describe("getAgentMetrics", () => {
    it("should filter to own metrics for SELLER role", async () => {
      const req = createMockRequest({ agent: { ...createMockRequest().agent!, role: "SELLER" } });
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getAgentMetrics(req, res);

      expect(service.getAgentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: "agent-1" })
      );
    });

    it("should filter by store for MANAGER role", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "MANAGER", storeId: "store-1" },
      });
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getAgentMetrics(req, res);

      expect(service.getAgentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: "store-1" })
      );
    });

    it("should filter by zone for ZONE_SUPERVISOR role", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "ZONE_SUPERVISOR", zoneId: "zone-1" },
      });
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getAgentMetrics(req, res);

      expect(service.getAgentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ zoneId: "zone-1" })
      );
    });

    it("should allow all filters for REGIONAL_MANAGER", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "REGIONAL_MANAGER" },
        query: { storeId: "any-store", zoneId: "any-zone" },
      });
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getAgentMetrics(req, res);

      expect(service.getAgentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: "any-store", zoneId: "any-zone" })
      );
    });
  });

  describe("getAgentMetricsById", () => {
    it("should allow access to own metrics", async () => {
      const req = createMockRequest({ params: { agentId: "agent-1" } });
      service.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      await controller.getAgentMetricsById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        period: mockAgentMetrics.period,
        metrics: mockAgentMetrics.agents[0],
      });
    });

    it("should deny SELLER access to other agent metrics", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "SELLER" },
        params: { agentId: "other-agent" },
      });

      await controller.getAgentMetricsById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "No tienes permiso para ver estas métricas" });
    });

    it("should allow MANAGER access to other agent metrics", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "MANAGER" },
        params: { agentId: "other-agent" },
      });
      const metricsWithOther = {
        ...mockAgentMetrics,
        agents: [{ ...mockAgentMetrics.agents[0], agentId: "other-agent" }],
      };
      service.getAgentMetrics.mockResolvedValue(metricsWithOther);

      await controller.getAgentMetricsById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        period: metricsWithOther.period,
        metrics: metricsWithOther.agents[0],
      });
    });

    it("should return 404 if agent not found", async () => {
      const req = createMockRequest({
        agent: { ...createMockRequest().agent!, role: "MANAGER" },
        params: { agentId: "non-existent" },
      });
      service.getAgentMetrics.mockResolvedValue({ ...mockAgentMetrics, agents: [] });

      await controller.getAgentMetricsById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Agente no encontrado" });
    });
  });

  describe("getDashboardSummary", () => {
    it("should return dashboard summary", async () => {
      const req = createMockRequest();
      service.getDashboardSummary.mockResolvedValue(mockDashboard);

      await controller.getDashboardSummary(req, res);

      expect(service.getDashboardSummary).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDashboard);
    });

    it("should pass store and zone filters", async () => {
      const req = createMockRequest({ query: { storeId: "store-1", zoneId: "zone-1" } });
      service.getDashboardSummary.mockResolvedValue(mockDashboard);

      await controller.getDashboardSummary(req, res);

      expect(service.getDashboardSummary).toHaveBeenCalledWith("store-1", "zone-1");
    });
  });

  describe("error handling", () => {
    it("should return 500 on service error", async () => {
      const req = createMockRequest();
      service.getAgentMetrics.mockRejectedValue(new Error("DB error"));

      await controller.getMyMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error al obtener tus métricas" });
    });
  });
});
