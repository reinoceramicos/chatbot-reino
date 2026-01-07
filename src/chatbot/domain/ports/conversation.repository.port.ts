import { Conversation, ConversationStatus, FlowType, FlowData } from "../entities/conversation.entity";

export interface UpdateFlowParams {
  flowType?: FlowType;
  flowStep?: string | null;
  flowData?: FlowData;
  flowStartedAt?: Date | null;
}

export interface ConversationRepositoryPort {
  findActiveByCustomerId(customerId: string): Promise<Conversation | null>;
  findById(id: string): Promise<Conversation | null>;
  create(conversation: Conversation): Promise<Conversation>;
  updateStatus(id: string, status: ConversationStatus, agentId?: string): Promise<Conversation>;
  resolve(id: string): Promise<Conversation>;
  // Métodos para flujos
  updateFlow(id: string, params: UpdateFlowParams): Promise<Conversation>;
  clearFlow(id: string): Promise<Conversation>;
}
