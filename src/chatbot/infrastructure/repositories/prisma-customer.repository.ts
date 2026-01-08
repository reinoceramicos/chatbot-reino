import { PrismaClient } from "@prisma/client";
import { Customer } from "../../domain/entities/customer.entity";
import { CustomerRepositoryPort } from "../../domain/ports/customer.repository.port";

export class PrismaCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findByWaId(waId: string): Promise<Customer | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { waId },
    });

    if (!customer) return null;

    return new Customer({
      id: customer.id,
      waId: customer.waId,
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      email: customer.email || undefined,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }

  async create(customer: Customer): Promise<Customer> {
    const created = await this.prisma.customer.create({
      data: {
        waId: customer.waId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    });

    return new Customer({
      id: created.id,
      waId: created.waId,
      name: created.name || undefined,
      phone: created.phone || undefined,
      email: created.email || undefined,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });

    return new Customer({
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
