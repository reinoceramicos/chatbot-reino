import { AnalyticsRepository } from "../../domain/ports/analytics.repository.port";
import {
  AnalyticsQueryFilter,
  ConversationMetricsDto,
  AgentMetricsDto,
  BotFunnelMetricsDto,
  DashboardSummaryDto,
} from "../dtos/analytics.dto";
import { getSocketService } from "../../../shared/infrastructure/websocket/socket.service";

export class AnalyticsService {
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private readonly WAITING_ALERT_THRESHOLD_MINUTES = 10;
  private readonly HIGH_LOAD_THRESHOLD = 5;

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  /**
   * Get conversation metrics for the specified period
   */
  async getConversationMetrics(filter: AnalyticsQueryFilter): Promise<ConversationMetricsDto> {
    return this.analyticsRepository.getConversationMetrics(filter);
  }

  /**
   * Get agent performance metrics for the specified period
   */
  async getAgentMetrics(filter: AnalyticsQueryFilter): Promise<AgentMetricsDto> {
    return this.analyticsRepository.getAgentMetrics(filter);
  }

  /**
   * Get bot funnel metrics (flow completion rates, abandonment points)
   */
  async getBotFunnelMetrics(filter: AnalyticsQueryFilter): Promise<BotFunnelMetricsDto> {
    return this.analyticsRepository.getBotFunnelMetrics(filter);
  }

  /**
   * Get real-time dashboard summary
   */
  async getDashboardSummary(storeId?: string, zoneId?: string): Promise<DashboardSummaryDto> {
    return this.analyticsRepository.getDashboardSummary(storeId, zoneId);
  }

  /**
   * Start periodic check for waiting conversation alerts
   * Should be called once when the server starts
   */
  startAlertMonitoring(intervalMinutes: number = 5): void {
    if (this.alertCheckInterval) {
      return; // Already running
    }

    console.log(`[AnalyticsService] Starting alert monitoring every ${intervalMinutes} minutes`);

    this.alertCheckInterval = setInterval(
      () => this.checkAndEmitAlerts(),
      intervalMinutes * 60 * 1000
    );

    // Also run immediately
    this.checkAndEmitAlerts();
  }

  /**
   * Stop the alert monitoring
   */
  stopAlertMonitoring(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
      console.log("[AnalyticsService] Alert monitoring stopped");
    }
  }

  /**
   * Check for alerts and emit them via WebSocket
   */
  private async checkAndEmitAlerts(): Promise<void> {
    try {
      const socketService = getSocketService();
      if (!socketService) {
        return;
      }

      // Check for conversations waiting too long
      const longWaitingConversations = await this.analyticsRepository.getConversationsWaitingLongerThan(
        this.WAITING_ALERT_THRESHOLD_MINUTES
      );

      for (const conversation of longWaitingConversations) {
        socketService.emitConversationWaitingAlert({
          conversationId: conversation.conversationId,
          storeId: conversation.storeId,
          zoneId: conversation.zoneId,
          waitingMinutes: conversation.waitingMinutes,
          customer: {
            name: conversation.customerName,
            waId: conversation.customerWaId,
          },
        });
      }

      // Check for high load by store
      const dashboard = await this.analyticsRepository.getDashboardSummary();
      if (dashboard.realtime.waitingConversations >= this.HIGH_LOAD_THRESHOLD) {
        socketService.emitHighLoadAlert({
          waitingConversations: dashboard.realtime.waitingConversations,
          threshold: this.HIGH_LOAD_THRESHOLD,
        });
      }
    } catch (error) {
      console.error("[AnalyticsService] Error checking alerts:", error);
    }
  }

  /**
   * Parse date range from query parameters
   */
  static parseDateRange(
    from?: string,
    to?: string
  ): { from: Date; to: Date } {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30); // Default: last 30 days

    return {
      from: from ? new Date(from) : defaultFrom,
      to: to ? new Date(to) : now,
    };
  }
}
