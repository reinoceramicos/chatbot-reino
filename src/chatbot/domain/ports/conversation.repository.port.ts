import { Conversation, ConversationStatus } from "../entities/conversation.entity";

export interface ConversationRepositoryPort {
  findActiveByCustomerId(customerId: string): Promise<Conversation | null>;
  findById(id: string): Promise<Conversation | null>;
  create(conversation: Conversation): Promise<Conversation>;
  updateStatus(id: string, status: ConversationStatus, agentId?: string): Promise<Conversation>;
  resolve(id: string): Promise<Conversation>;
}
