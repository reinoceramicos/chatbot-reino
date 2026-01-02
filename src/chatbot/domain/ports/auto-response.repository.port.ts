export interface AutoResponse {
  id: string;
  trigger: string;
  triggerType: string;
  response: string;
  category?: string;
  priority: number;
  isActive: boolean;
}

export interface AutoResponseRepositoryPort {
  findAll(): Promise<AutoResponse[]>;
  findByCategory(category: string): Promise<AutoResponse[]>;
  findActive(): Promise<AutoResponse[]>;
}
