export type AgentStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface AgentProps {
  id?: string;
  storeId?: string;
  name: string;
  waId?: string;
  email?: string;
  password?: string;
  status: AgentStatus;
  maxConversations: number;
  activeConversations: number;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Agent {
  readonly id?: string;
  readonly storeId?: string;
  readonly name: string;
  readonly waId?: string;
  readonly email?: string;
  readonly password?: string;
  readonly status: AgentStatus;
  readonly maxConversations: number;
  readonly activeConversations: number;
  readonly lastLoginAt?: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: AgentProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.name = props.name;
    this.waId = props.waId;
    this.email = props.email;
    this.password = props.password;
    this.status = props.status;
    this.maxConversations = props.maxConversations;
    this.activeConversations = props.activeConversations;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isAvailable(): boolean {
    return this.status === "AVAILABLE" && this.activeConversations < this.maxConversations;
  }

  isOnline(): boolean {
    return this.status !== "OFFLINE";
  }

  canAcceptConversation(): boolean {
    return this.isAvailable();
  }
}
