import { AnalyticsService } from "../analytics.service";
import { AnalyticsRepository } from "../../../domain/ports/analytics.repository.port";
import {
  AnalyticsQueryFilter,
  ConversationMetricsDto,
  AgentMetricsDto,
  BotFunnelMetricsDto,
  DashboardSummaryDto,
} from "../../dtos/analytics.dto";

const createMockRepository = (): jest.Mocked<AnalyticsRepository> => ({
  getConversationMetrics: jest.fn(),
  getAgentMetrics: jest.fn(),
  getBotFunnelMetrics: jest.fn(),
  getDashboardSummary: jest.fn(),
  getConversationsWaitingLongerThan: jest.fn(),
});

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let repository: jest.Mocked<AnalyticsRepository>;

  const mockFilter: AnalyticsQueryFilter = {
    from: new Date("2026-01-01"),
    to: new Date("2026-01-31"),
  };

  const mockConversationMetrics: ConversationMetricsDto = {
    period: { from: mockFilter.from, to: mockFilter.to },
    total: 100,
    byStatus: { bot: 20, waiting: 10, assigned: 30, resolved: 40 },
    averageTimeInStatus: {
      botToWaiting: null,
      waitingToAssigned: null,
      assignedToResolved: 15.5,
    },
  };

  const mockAgentMetrics: AgentMetricsDto = {
    period: { from: mockFilter.from, to: mockFilter.to },
    agents: [
      {
        agentId: "agent-1",
        agentName: "Juan",
        conversationsHandled: 50,
        conversationsResolved: 45,
        avgResponseTime: 120,
        avgResolutionTime: 15,
        currentLoad: 3,
        maxLoad: 5,
      },
    ],
  };

  const mockBotFunnelMetrics: BotFunnelMetricsDto = {
    period: { from: mockFilter.from, to: mockFilter.to },
    flows: [
      {
        flowType: "quotation",
        started: 100,
        completed: 60,
        abandoned: 40,
        completionRate: 60,
        avgDuration: 5,
      },
    ],
    abandonmentPoints: [
      { flowType: "quotation", step: "select_product", abandonments: 25, percentage: 25 },
    ],
    transferRate: 30,
  };

  const mockDashboardSummary: DashboardSummaryDto = {
    timestamp: new Date(),
    realtime: {
      waitingConversations: 5,
      assignedConversations: 10,
      onlineAgents: 3,
      avgWaitingTime: 8.5,
    },
    today: {
      totalConversations: 50,
      resolvedConversations: 35,
      transferredToAgent: 20,
      avgResolutionTime: 12,
    },
    alerts: [],
  };

  beforeEach(() => {
    repository = createMockRepository();
    service = new AnalyticsService(repository);
  });

  afterEach(() => {
    service.stopAlertMonitoring();
  });

  describe("getConversationMetrics", () => {
    it("should return conversation metrics from repository", async () => {
      repository.getConversationMetrics.mockResolvedValue(mockConversationMetrics);

      const result = await service.getConversationMetrics(mockFilter);

      expect(repository.getConversationMetrics).toHaveBeenCalledWith(mockFilter);
      expect(result).toEqual(mockConversationMetrics);
    });

    it("should pass filter parameters correctly", async () => {
      repository.getConversationMetrics.mockResolvedValue(mockConversationMetrics);
      const filterWithStore: AnalyticsQueryFilter = {
        ...mockFilter,
        storeId: "store-1",
        groupBy: "day",
      };

      await service.getConversationMetrics(filterWithStore);

      expect(repository.getConversationMetrics).toHaveBeenCalledWith(filterWithStore);
    });
  });

  describe("getAgentMetrics", () => {
    it("should return agent metrics from repository", async () => {
      repository.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      const result = await service.getAgentMetrics(mockFilter);

      expect(repository.getAgentMetrics).toHaveBeenCalledWith(mockFilter);
      expect(result).toEqual(mockAgentMetrics);
    });

    it("should filter by specific agent", async () => {
      repository.getAgentMetrics.mockResolvedValue(mockAgentMetrics);
      const filterWithAgent: AnalyticsQueryFilter = {
        ...mockFilter,
        agentId: "agent-1",
      };

      await service.getAgentMetrics(filterWithAgent);

      expect(repository.getAgentMetrics).toHaveBeenCalledWith(filterWithAgent);
    });
  });

  describe("getBotFunnelMetrics", () => {
    it("should return bot funnel metrics from repository", async () => {
      repository.getBotFunnelMetrics.mockResolvedValue(mockBotFunnelMetrics);

      const result = await service.getBotFunnelMetrics(mockFilter);

      expect(repository.getBotFunnelMetrics).toHaveBeenCalledWith(mockFilter);
      expect(result).toEqual(mockBotFunnelMetrics);
    });
  });

  describe("getDashboardSummary", () => {
    it("should return dashboard summary from repository", async () => {
      repository.getDashboardSummary.mockResolvedValue(mockDashboardSummary);

      const result = await service.getDashboardSummary();

      expect(repository.getDashboardSummary).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockDashboardSummary);
    });

    it("should pass store and zone filters", async () => {
      repository.getDashboardSummary.mockResolvedValue(mockDashboardSummary);

      await service.getDashboardSummary("store-1", "zone-1");

      expect(repository.getDashboardSummary).toHaveBeenCalledWith("store-1", "zone-1");
    });
  });

  describe("parseDateRange", () => {
    it("should parse valid date strings", () => {
      const result = AnalyticsService.parseDateRange("2026-01-01", "2026-01-31");

      expect(result.from).toEqual(new Date("2026-01-01"));
      expect(result.to).toEqual(new Date("2026-01-31"));
    });

    it("should use defaults when no dates provided", () => {
      const now = new Date();
      const result = AnalyticsService.parseDateRange();

      expect(result.to.getDate()).toBe(now.getDate());
      expect(result.from < result.to).toBe(true);
    });

    it("should handle only from date", () => {
      const result = AnalyticsService.parseDateRange("2026-01-15");

      expect(result.from).toEqual(new Date("2026-01-15"));
      expect(result.to).toBeDefined();
    });
  });

  describe("alert monitoring", () => {
    it("should start and stop monitoring without errors", () => {
      expect(() => service.startAlertMonitoring(1)).not.toThrow();
      expect(() => service.stopAlertMonitoring()).not.toThrow();
    });

    it("should not start multiple monitors", () => {
      service.startAlertMonitoring(1);
      service.startAlertMonitoring(1);
      service.stopAlertMonitoring();
    });
  });
});
