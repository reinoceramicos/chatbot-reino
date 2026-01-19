import {
  AnalyticsQueryFilter,
  ConversationMetricsDto,
  AgentMetricsDto,
  BotFunnelMetricsDto,
  DashboardSummaryDto,
} from "../../application/dtos/analytics.dto";

export interface AnalyticsRepository {
  /**
   * Get conversation metrics for the specified period
   */
  getConversationMetrics(filter: AnalyticsQueryFilter): Promise<ConversationMetricsDto>;

  /**
   * Get agent performance metrics for the specified period
   */
  getAgentMetrics(filter: AnalyticsQueryFilter): Promise<AgentMetricsDto>;

  /**
   * Get bot funnel metrics (flow completion rates, abandonment points)
   */
  getBotFunnelMetrics(filter: AnalyticsQueryFilter): Promise<BotFunnelMetricsDto>;

  /**
   * Get real-time dashboard summary
   */
  getDashboardSummary(storeId?: string, zoneId?: string): Promise<DashboardSummaryDto>;

  /**
   * Get count of conversations waiting longer than specified minutes
   */
  getConversationsWaitingLongerThan(minutes: number): Promise<
    Array<{
      conversationId: string;
      storeId?: string;
      zoneId?: string;
      waitingMinutes: number;
      customerName?: string;
      customerWaId: string;
    }>
  >;
}
