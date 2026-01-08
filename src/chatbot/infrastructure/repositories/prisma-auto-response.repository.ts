import { PrismaClient } from "@prisma/client";
import { AutoResponse, AutoResponseRepositoryPort } from "../../domain/ports/auto-response.repository.port";

export class PrismaAutoResponseRepository implements AutoResponseRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<AutoResponse[]> {
    const responses = await this.prisma.autoResponse.findMany({
      orderBy: { priority: "desc" },
    });

    return responses.map(this.mapToEntity);
  }

  async findByCategory(category: string): Promise<AutoResponse[]> {
    const responses = await this.prisma.autoResponse.findMany({
      where: { category, isActive: true },
      orderBy: { priority: "desc" },
    });

    return responses.map(this.mapToEntity);
  }

  async findActive(): Promise<AutoResponse[]> {
    const responses = await this.prisma.autoResponse.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });

    return responses.map(this.mapToEntity);
  }

  private mapToEntity(data: any): AutoResponse {
    return {
      id: data.id,
      trigger: data.trigger,
      triggerType: data.triggerType,
      response: data.response,
      category: data.category || undefined,
      priority: data.priority,
      isActive: data.isActive,
    };
  }
}
