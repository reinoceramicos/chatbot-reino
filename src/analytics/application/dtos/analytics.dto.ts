// ============================================
// CONVERSATION METRICS DTOs
// ============================================

export interface ConversationMetricsDto {
  period: {
    from: Date;
    to: Date;
  };
  total: number;
  byStatus: {
    bot: number;
    waiting: number;
    assigned: number;
    resolved: number;
  };
  averageTimeInStatus: {
    botToWaiting: number | null; // minutos promedio
    waitingToAssigned: number | null;
    assignedToResolved: number | null;
  };
  byStore?: StoreConversationMetrics[];
  byZone?: ZoneConversationMetrics[];
  daily?: DailyMetrics[];
}

export interface StoreConversationMetrics {
  storeId: string;
  storeName: string;
  total: number;
  resolved: number;
  avgResolutionTime: number | null;
}

export interface ZoneConversationMetrics {
  zoneId: string;
  zoneName: string;
  total: number;
  resolved: number;
  avgResolutionTime: number | null;
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  total: number;
  resolved: number;
  transferredToAgent: number;
}

// ============================================
// AGENT METRICS DTOs
// ============================================

export interface AgentMetricsDto {
  period: {
    from: Date;
    to: Date;
  };
  agents: AgentPerformanceMetrics[];
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  storeId?: string;
  storeName?: string;
  conversationsHandled: number;
  conversationsResolved: number;
  avgResponseTime: number | null; // segundos promedio hasta primera respuesta
  avgResolutionTime: number | null; // minutos promedio hasta resolución
  currentLoad: number; // conversaciones activas actuales
  maxLoad: number; // máximo configurado
}

// ============================================
// BOT FUNNEL METRICS DTOs
// ============================================

export interface BotFunnelMetricsDto {
  period: {
    from: Date;
    to: Date;
  };
  flows: FlowMetrics[];
  abandonmentPoints: AbandonmentPoint[];
  transferRate: number; // % de conversaciones transferidas a vendedor
}

export interface FlowMetrics {
  flowType: string;
  started: number;
  completed: number;
  abandoned: number;
  completionRate: number;
  avgDuration: number | null; // minutos
}

export interface AbandonmentPoint {
  flowType: string;
  step: string;
  abandonments: number;
  percentage: number;
}

// ============================================
// DASHBOARD SUMMARY DTO
// ============================================

export interface DashboardSummaryDto {
  timestamp: Date;
  realtime: {
    waitingConversations: number;
    assignedConversations: number;
    onlineAgents: number;
    avgWaitingTime: number | null; // minutos
  };
  today: {
    totalConversations: number;
    resolvedConversations: number;
    transferredToAgent: number;
    avgResolutionTime: number | null;
  };
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  type: "LONG_WAIT" | "HIGH_LOAD" | "NO_AGENTS";
  severity: "warning" | "critical";
  message: string;
  metadata?: Record<string, any>;
}

// ============================================
// QUERY FILTERS
// ============================================

export interface AnalyticsQueryFilter {
  from: Date;
  to: Date;
  storeId?: string;
  zoneId?: string;
  agentId?: string;
  groupBy?: "day" | "week" | "month";
}
