import { PrismaClient } from "@prisma/client";
import { PrismaAnalyticsRepository } from "../prisma-analytics.repository";
import { AnalyticsQueryFilter } from "../../../application/dtos/analytics.dto";

const createMockPrisma = () => ({
  conversation: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  agent: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  store: {
    findMany: jest.fn(),
  },
  zone: {
    findMany: jest.fn(),
  },
});

describe("PrismaAnalyticsRepository", () => {
  let repository: PrismaAnalyticsRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const mockFilter: AnalyticsQueryFilter = {
    from: new Date("2026-01-01"),
    to: new Date("2026-01-31"),
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new PrismaAnalyticsRepository(mockPrisma as unknown as PrismaClient);
  });

  describe("getConversationMetrics", () => {
    beforeEach(() => {
      mockPrisma.conversation.count.mockResolvedValue(10);
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.store.findMany.mockResolvedValue([]);
      mockPrisma.zone.findMany.mockResolvedValue([]);
    });

    it("should count conversations by status", async () => {
      mockPrisma.conversation.count
        .mockResolvedValueOnce(20) // BOT
        .mockResolvedValueOnce(10) // WAITING
        .mockResolvedValueOnce(30) // ASSIGNED
        .mockResolvedValueOnce(40); // RESOLVED

      const result = await repository.getConversationMetrics(mockFilter);

      expect(result.byStatus).toEqual({
        bot: 20,
        waiting: 10,
        assigned: 30,
        resolved: 40,
      });
      expect(result.total).toBe(100);
    });

    it("should include period in response", async () => {
      const result = await repository.getConversationMetrics(mockFilter);

      expect(result.period.from).toEqual(mockFilter.from);
      expect(result.period.to).toEqual(mockFilter.to);
    });

    it("should filter by storeId when provided", async () => {
      const filterWithStore = { ...mockFilter, storeId: "store-1" };

      await repository.getConversationMetrics(filterWithStore);

      expect(mockPrisma.conversation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: "store-1" }),
        })
      );
    });

    it("should calculate average resolution time", async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      mockPrisma.conversation.findMany.mockResolvedValueOnce([
        {
          startedAt: twoHoursAgo,
          resolvedAt: now,
          firstResponseAt: twoHoursAgo,
        },
      ]);

      const result = await repository.getConversationMetrics(mockFilter);

      expect(result.averageTimeInStatus.assignedToResolved).toBeCloseTo(120, 0);
    });
  });

  describe("getAgentMetrics", () => {
    const mockAgents = [
      {
        id: "agent-1",
        name: "Juan",
        storeId: "store-1",
        store: { name: "Reino 1" },
        activeConversations: 2,
        maxConversations: 5,
        conversations: [
          {
            status: "RESOLVED",
            startedAt: new Date("2026-01-15T10:00:00"),
            resolvedAt: new Date("2026-01-15T10:30:00"),
            firstResponseAt: new Date("2026-01-15T10:02:00"),
          },
          {
            status: "ASSIGNED",
            startedAt: new Date("2026-01-15T11:00:00"),
            resolvedAt: null,
            firstResponseAt: new Date("2026-01-15T11:01:00"),
          },
        ],
      },
    ];

    beforeEach(() => {
      mockPrisma.agent.findMany.mockResolvedValue(mockAgents);
    });

    it("should return agent performance metrics", async () => {
      const result = await repository.getAgentMetrics(mockFilter);

      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].agentId).toBe("agent-1");
      expect(result.agents[0].agentName).toBe("Juan");
      expect(result.agents[0].conversationsHandled).toBe(2);
      expect(result.agents[0].conversationsResolved).toBe(1);
    });

    it("should calculate average response time in seconds", async () => {
      const result = await repository.getAgentMetrics(mockFilter);

      expect(result.agents[0].avgResponseTime).toBeGreaterThan(0);
    });

    it("should include current and max load", async () => {
      const result = await repository.getAgentMetrics(mockFilter);

      expect(result.agents[0].currentLoad).toBe(2);
      expect(result.agents[0].maxLoad).toBe(5);
    });

    it("should filter by agentId when provided", async () => {
      const filterWithAgent = { ...mockFilter, agentId: "agent-1" };

      await repository.getAgentMetrics(filterWithAgent);

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "agent-1" }),
        })
      );
    });
  });

  describe("getBotFunnelMetrics", () => {
    const mockConversationsWithFlows = [
      { flowType: "quotation", flowStep: null, flowStartedAt: new Date(), status: "RESOLVED", agentId: "agent-1", resolvedAt: new Date() },
      { flowType: "quotation", flowStep: "select_product", flowStartedAt: new Date(), status: "BOT", agentId: null, resolvedAt: null },
      { flowType: "info", flowStep: null, flowStartedAt: new Date(), status: "RESOLVED", agentId: null, resolvedAt: new Date() },
    ];

    beforeEach(() => {
      mockPrisma.conversation.findMany.mockResolvedValue(mockConversationsWithFlows);
    });

    it("should group metrics by flow type", async () => {
      const result = await repository.getBotFunnelMetrics(mockFilter);

      expect(result.flows.length).toBeGreaterThan(0);
      const quotationFlow = result.flows.find(f => f.flowType === "quotation");
      expect(quotationFlow).toBeDefined();
      expect(quotationFlow?.started).toBe(2);
    });

    it("should calculate completion rate", async () => {
      const result = await repository.getBotFunnelMetrics(mockFilter);

      const quotationFlow = result.flows.find(f => f.flowType === "quotation");
      expect(quotationFlow?.completionRate).toBe(50);
    });

    it("should identify abandonment points", async () => {
      const result = await repository.getBotFunnelMetrics(mockFilter);

      const abandonments = result.abandonmentPoints.filter(a => a.flowType === "quotation");
      expect(abandonments.length).toBeGreaterThan(0);
    });

    it("should calculate transfer rate", async () => {
      const result = await repository.getBotFunnelMetrics(mockFilter);

      expect(result.transferRate).toBeGreaterThan(0);
    });
  });

  describe("getDashboardSummary", () => {
    beforeEach(() => {
      mockPrisma.conversation.count.mockResolvedValue(5);
      mockPrisma.agent.count.mockResolvedValue(3);
      mockPrisma.conversation.findMany.mockResolvedValue([]);
    });

    it("should return realtime waiting and assigned counts", async () => {
      mockPrisma.conversation.count
        .mockResolvedValueOnce(5) // waiting
        .mockResolvedValueOnce(10) // assigned
        .mockResolvedValueOnce(20) // today total
        .mockResolvedValueOnce(15) // today resolved
        .mockResolvedValueOnce(12); // today transferred

      const result = await repository.getDashboardSummary();

      expect(result.realtime.waitingConversations).toBe(5);
      expect(result.realtime.assignedConversations).toBe(10);
    });

    it("should return online agents count", async () => {
      mockPrisma.agent.count.mockResolvedValue(3);

      const result = await repository.getDashboardSummary();

      expect(result.realtime.onlineAgents).toBe(3);
    });

    it("should include timestamp", async () => {
      const result = await repository.getDashboardSummary();

      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should generate alerts for long waiting", async () => {
      mockPrisma.conversation.count
        .mockResolvedValueOnce(5) // waiting
        .mockResolvedValueOnce(10) // assigned
        .mockResolvedValueOnce(20) // today total
        .mockResolvedValueOnce(15) // today resolved
        .mockResolvedValueOnce(12); // today transferred

      mockPrisma.conversation.findMany
        .mockResolvedValueOnce([{ startedAt: new Date() }]) // waiting conversations for avg
        .mockResolvedValueOnce([]) // today resolved for avg resolution
        .mockResolvedValueOnce([ // conversations waiting > 10 min
          {
            id: "conv-1",
            storeId: "store-1",
            startedAt: new Date(Date.now() - 15 * 60 * 1000),
            customer: { name: "Test", waId: "123" },
            store: { zoneId: "zone-1" },
          },
        ]);

      const result = await repository.getDashboardSummary();

      const longWaitAlert = result.alerts.find(a => a.type === "LONG_WAIT");
      expect(longWaitAlert).toBeDefined();
    });
  });

  describe("getConversationsWaitingLongerThan", () => {
    it("should return conversations waiting longer than threshold", async () => {
      const oldConversation = {
        id: "conv-1",
        storeId: "store-1",
        startedAt: new Date(Date.now() - 20 * 60 * 1000),
        customer: { name: "Test", waId: "123456" },
        store: { zoneId: "zone-1", zone: { id: "zone-1" } },
      };

      mockPrisma.conversation.findMany.mockResolvedValue([oldConversation]);

      const result = await repository.getConversationsWaitingLongerThan(10);

      expect(result).toHaveLength(1);
      expect(result[0].conversationId).toBe("conv-1");
      expect(result[0].waitingMinutes).toBeGreaterThanOrEqual(10);
    });

    it("should include customer info", async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        {
          id: "conv-1",
          storeId: "store-1",
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
          customer: { name: "Juan", waId: "5491155556666" },
          store: null,
        },
      ]);

      const result = await repository.getConversationsWaitingLongerThan(10);

      expect(result[0].customerName).toBe("Juan");
      expect(result[0].customerWaId).toBe("5491155556666");
    });
  });
});
