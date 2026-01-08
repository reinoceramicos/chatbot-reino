import { Customer } from "../entities/customer.entity";

export interface CustomerRepositoryPort {
  findByWaId(waId: string): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(id: string, data: Partial<Customer>): Promise<Customer>;
}
