export type ConversationStatus = "BOT" | "WAITING" | "ASSIGNED" | "RESOLVED";
export type FlowType = "main_menu" | "quotation" | "info" | null;

export interface FlowData {
  [key: string]: any;
}

export interface ConversationProps {
  id?: string;
  customerId: string;
  agentId?: string;
  storeId?: string;
  status: ConversationStatus;
  context?: Record<string, any>;
  startedAt?: Date;
  resolvedAt?: Date;
  updatedAt?: Date;
  // Campos de flujo
  flowType?: FlowType;
  flowStep?: string;
  flowData?: FlowData;
  flowStartedAt?: Date;
}

export class Conversation {
  readonly id?: string;
  readonly customerId: string;
  readonly agentId?: string;
  readonly storeId?: string;
  readonly status: ConversationStatus;
  readonly context?: Record<string, any>;
  readonly startedAt?: Date;
  readonly resolvedAt?: Date;
  readonly updatedAt?: Date;
  // Campos de flujo
  readonly flowType?: FlowType;
  readonly flowStep?: string;
  readonly flowData?: FlowData;
  readonly flowStartedAt?: Date;

  constructor(props: ConversationProps) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.agentId = props.agentId;
    this.storeId = props.storeId;
    this.status = props.status;
    this.context = props.context;
    this.startedAt = props.startedAt;
    this.resolvedAt = props.resolvedAt;
    this.updatedAt = props.updatedAt;
    // Campos de flujo
    this.flowType = props.flowType;
    this.flowStep = props.flowStep;
    this.flowData = props.flowData;
    this.flowStartedAt = props.flowStartedAt;
  }

  static createNew(customerId: string): Conversation {
    return new Conversation({
      customerId,
      status: "BOT",
    });
  }

  isHandledByBot(): boolean {
    return this.status === "BOT";
  }

  isHandledByAgent(): boolean {
    return this.status === "ASSIGNED";
  }

  isWaitingForAgent(): boolean {
    return this.status === "WAITING";
  }

  isResolved(): boolean {
    return this.status === "RESOLVED";
  }

  // Métodos de flujo
  hasActiveFlow(): boolean {
    return this.flowType !== null && this.flowType !== undefined && this.flowStep !== null;
  }

  isInFlow(flowType: FlowType): boolean {
    return this.flowType === flowType;
  }

  getFlowData<T = FlowData>(): T | undefined {
    return this.flowData as T | undefined;
  }
}
