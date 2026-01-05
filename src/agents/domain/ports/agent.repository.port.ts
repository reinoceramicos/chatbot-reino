import { Agent, AgentStatus } from "../entities/agent.entity";

export interface CreateAgentData {
  storeId?: string;
  name: string;
  waId?: string;
  email?: string;
  password?: string;
  status: AgentStatus;
  maxConversations: number;
  activeConversations: number;
}

export interface UpdateAgentData {
  storeId?: string;
  name?: string;
  waId?: string;
  email?: string;
  password?: string;
  maxConversations?: number;
}

export interface AgentRepository {
  findById(id: string): Promise<Agent | null>;
  findByEmail(email: string): Promise<Agent | null>;
  findByStoreId(storeId: string): Promise<Agent[]>;
  findAvailableByStoreId(storeId: string): Promise<Agent[]>;
  findAll(): Promise<Agent[]>;
  create(data: CreateAgentData): Promise<Agent>;
  update(id: string, data: UpdateAgentData): Promise<Agent>;
  updateStatus(id: string, status: AgentStatus): Promise<Agent>;
  incrementActiveConversations(id: string): Promise<Agent>;
  decrementActiveConversations(id: string): Promise<Agent>;
  updateLastLogin(id: string): Promise<Agent>;
}
