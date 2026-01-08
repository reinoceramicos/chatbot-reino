"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAutoResponseRepository = void 0;
class PrismaAutoResponseRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const responses = await this.prisma.autoResponse.findMany({
            orderBy: { priority: "desc" },
        });
        return responses.map(this.mapToEntity);
    }
    async findByCategory(category) {
        const responses = await this.prisma.autoResponse.findMany({
            where: { category, isActive: true },
            orderBy: { priority: "desc" },
        });
        return responses.map(this.mapToEntity);
    }
    async findActive() {
        const responses = await this.prisma.autoResponse.findMany({
            where: { isActive: true },
            orderBy: { priority: "desc" },
        });
        return responses.map(this.mapToEntity);
    }
    mapToEntity(data) {
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
exports.PrismaAutoResponseRepository = PrismaAutoResponseRepository;
