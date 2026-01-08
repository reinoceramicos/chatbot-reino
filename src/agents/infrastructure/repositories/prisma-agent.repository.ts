import { PrismaClient, AgentStatus as PrismaAgentStatus, AgentRole as PrismaAgentRole } from "@prisma/client";
import { Agent, AgentStatus, AgentRole } from "../../domain/entities/agent.entity";
import {
  AgentRepository,
  CreateAgentData,
  UpdateAgentData,
} from "../../domain/ports/agent.repository.port";

export class PrismaAgentRepository implements AgentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToEntity(data: any): Agent {
    return new Agent({
      id: data.id,
      storeId: data.storeId,
      zoneId: data.zoneId,
      role: data.role as AgentRole,
      name: data.name,
      waId: data.waId,
      email: data.email,
      password: data.password,
      status: data.status as AgentStatus,
      maxConversations: data.maxConversations,
      activeConversations: data.activeConversations,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findById(id: string): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    return agent ? this.mapToEntity(agent) : null;
  }

  async findByEmail(email: string): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { email },
    });

    return agent ? this.mapToEntity(agent) : null;
  }

  async findByStoreId(storeId: string): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany({
      where: { storeId },
    });

    return agents.map((a) => this.mapToEntity(a));
  }

  async findAvailableByStoreId(storeId: string): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        storeId,
        status: "AVAILABLE",
      },
    });

    return agents
      .map((a) => this.mapToEntity(a))
      .filter((a) => a.activeConversations < a.maxConversations);
  }

  async findByZoneId(zoneId: string): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany({
      where: { zoneId },
    });

    return agents.map((a) => this.mapToEntity(a));
  }

  async findByRole(role: AgentRole): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany({
      where: { role: role as PrismaAgentRole },
    });

    return agents.map((a) => this.mapToEntity(a));
  }

  async findAll(): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany();
    return agents.map((a) => this.mapToEntity(a));
  }

  async create(data: CreateAgentData): Promise<Agent> {
    const created = await this.prisma.agent.create({
      data: {
        storeId: data.storeId,
        zoneId: data.zoneId,
        role: data.role as PrismaAgentRole,
        name: data.name,
        waId: data.waId,
        email: data.email,
        password: data.password,
        status: data.status as PrismaAgentStatus,
        maxConversations: data.maxConversations,
        activeConversations: data.activeConversations,
      },
    });

    return this.mapToEntity(created);
  }

  async update(id: string, data: UpdateAgentData): Promise<Agent> {
    const updated = await this.prisma.agent.update({
      where: { id },
      data: {
        storeId: data.storeId,
        zoneId: data.zoneId,
        role: data.role as PrismaAgentRole | undefined,
        name: data.name,
        waId: data.waId,
        email: data.email,
        password: data.password,
        maxConversations: data.maxConversations,
      },
    });

    return this.mapToEntity(updated);
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    const updated = await this.prisma.agent.update({
      where: { id },
      data: { status: status as PrismaAgentStatus },
    });

    return this.mapToEntity(updated);
  }

  async incrementActiveConversations(id: string): Promise<Agent> {
    const updated = await this.prisma.agent.update({
      where: { id },
      data: {
        activeConversations: { increment: 1 },
      },
    });

    // Actualizar status a BUSY si alcanzó el máximo
    if (updated.activeConversations >= updated.maxConversations) {
      return this.updateStatus(id, "BUSY");
    }

    return this.mapToEntity(updated);
  }

  async decrementActiveConversations(id: string): Promise<Agent> {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new Error("Agent not found");

    const updated = await this.prisma.agent.update({
      where: { id },
      data: {
        activeConversations: Math.max(0, agent.activeConversations - 1),
      },
    });

    // Si estaba BUSY y ahora tiene espacio, volver a AVAILABLE
    if (agent.status === "BUSY" && updated.activeConversations < updated.maxConversations) {
      return this.updateStatus(id, "AVAILABLE");
    }

    return this.mapToEntity(updated);
  }

  async updateLastLogin(id: string): Promise<Agent> {
    const updated = await this.prisma.agent.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });

    return this.mapToEntity(updated);
  }
}
