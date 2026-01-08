"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAgentRepository = void 0;
const agent_entity_1 = require("../../domain/entities/agent.entity");
class PrismaAgentRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapToEntity(data) {
        return new agent_entity_1.Agent({
            id: data.id,
            storeId: data.storeId,
            zoneId: data.zoneId,
            role: data.role,
            name: data.name,
            waId: data.waId,
            email: data.email,
            password: data.password,
            status: data.status,
            maxConversations: data.maxConversations,
            activeConversations: data.activeConversations,
            lastLoginAt: data.lastLoginAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
    }
    async findById(id) {
        const agent = await this.prisma.agent.findUnique({
            where: { id },
        });
        return agent ? this.mapToEntity(agent) : null;
    }
    async findByEmail(email) {
        const agent = await this.prisma.agent.findUnique({
            where: { email },
        });
        return agent ? this.mapToEntity(agent) : null;
    }
    async findByStoreId(storeId) {
        const agents = await this.prisma.agent.findMany({
            where: { storeId },
        });
        return agents.map((a) => this.mapToEntity(a));
    }
    async findAvailableByStoreId(storeId) {
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
    async findByZoneId(zoneId) {
        const agents = await this.prisma.agent.findMany({
            where: { zoneId },
        });
        return agents.map((a) => this.mapToEntity(a));
    }
    async findByRole(role) {
        const agents = await this.prisma.agent.findMany({
            where: { role: role },
        });
        return agents.map((a) => this.mapToEntity(a));
    }
    async findAll() {
        const agents = await this.prisma.agent.findMany();
        return agents.map((a) => this.mapToEntity(a));
    }
    async create(data) {
        const created = await this.prisma.agent.create({
            data: {
                storeId: data.storeId,
                zoneId: data.zoneId,
                role: data.role,
                name: data.name,
                waId: data.waId,
                email: data.email,
                password: data.password,
                status: data.status,
                maxConversations: data.maxConversations,
                activeConversations: data.activeConversations,
            },
        });
        return this.mapToEntity(created);
    }
    async update(id, data) {
        const updated = await this.prisma.agent.update({
            where: { id },
            data: {
                storeId: data.storeId,
                zoneId: data.zoneId,
                role: data.role,
                name: data.name,
                waId: data.waId,
                email: data.email,
                password: data.password,
                maxConversations: data.maxConversations,
            },
        });
        return this.mapToEntity(updated);
    }
    async updateStatus(id, status) {
        const updated = await this.prisma.agent.update({
            where: { id },
            data: { status: status },
        });
        return this.mapToEntity(updated);
    }
    async incrementActiveConversations(id) {
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
    async decrementActiveConversations(id) {
        const agent = await this.prisma.agent.findUnique({ where: { id } });
        if (!agent)
            throw new Error("Agent not found");
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
    async updateLastLogin(id) {
        const updated = await this.prisma.agent.update({
            where: { id },
            data: { lastLoginAt: new Date() },
        });
        return this.mapToEntity(updated);
    }
}
exports.PrismaAgentRepository = PrismaAgentRepository;
