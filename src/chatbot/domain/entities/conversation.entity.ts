export type ConversationStatus = "BOT" | "WAITING" | "ASSIGNED" | "RESOLVED";

export interface ConversationProps {
  id?: string;
  customerId: string;
  agentId?: string;
  status: ConversationStatus;
  context?: Record<string, any>;
  startedAt?: Date;
  resolvedAt?: Date;
  updatedAt?: Date;
}

export class Conversation {
  readonly id?: string;
  readonly customerId: string;
  readonly agentId?: string;
  readonly status: ConversationStatus;
  readonly context?: Record<string, any>;
  readonly startedAt?: Date;
  readonly resolvedAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: ConversationProps) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.agentId = props.agentId;
    this.status = props.status;
    this.context = props.context;
    this.startedAt = props.startedAt;
    this.resolvedAt = props.resolvedAt;
    this.updatedAt = props.updatedAt;
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
}
