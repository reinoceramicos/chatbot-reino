"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaCustomerRepository = void 0;
const customer_entity_1 = require("../../domain/entities/customer.entity");
class PrismaCustomerRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByWaId(waId) {
        const customer = await this.prisma.customer.findUnique({
            where: { waId },
        });
        if (!customer)
            return null;
        return new customer_entity_1.Customer({
            id: customer.id,
            waId: customer.waId,
            name: customer.name || undefined,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
        });
    }
    async create(customer) {
        const created = await this.prisma.customer.create({
            data: {
                waId: customer.waId,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
            },
        });
        return new customer_entity_1.Customer({
            id: created.id,
            waId: created.waId,
            name: created.name || undefined,
            phone: created.phone || undefined,
            email: created.email || undefined,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
        });
    }
    async update(id, data) {
        const updated = await this.prisma.customer.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email,
            },
        });
        return new customer_entity_1.Customer({
            id: updated.id,
            waId: updated.waId,
            name: updated.name || undefined,
            phone: updated.phone || undefined,
            email: updated.email || undefined,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        });
    }
}
exports.PrismaCustomerRepository = PrismaCustomerRepository;
