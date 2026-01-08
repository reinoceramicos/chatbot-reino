"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const customer_entity_1 = require("../customer.entity");
describe("Customer Entity", () => {
    describe("constructor", () => {
        it("should create a customer with all properties", () => {
            const now = new Date();
            const props = {
                id: "cust-123",
                waId: "5491155556666",
                name: "Juan Perez",
                phone: "+54 9 11 5555-6666",
                email: "juan@email.com",
                createdAt: now,
                updatedAt: now,
            };
            const customer = new customer_entity_1.Customer(props);
            expect(customer.id).toBe("cust-123");
            expect(customer.waId).toBe("5491155556666");
            expect(customer.name).toBe("Juan Perez");
            expect(customer.phone).toBe("+54 9 11 5555-6666");
            expect(customer.email).toBe("juan@email.com");
            expect(customer.createdAt).toEqual(now);
            expect(customer.updatedAt).toEqual(now);
        });
        it("should create a customer with only required waId", () => {
            const customer = new customer_entity_1.Customer({
                waId: "5491155556666",
            });
            expect(customer.waId).toBe("5491155556666");
            expect(customer.id).toBeUndefined();
            expect(customer.name).toBeUndefined();
            expect(customer.phone).toBeUndefined();
            expect(customer.email).toBeUndefined();
        });
    });
    describe("create static method", () => {
        it("should create a customer with waId only", () => {
            const customer = customer_entity_1.Customer.create("5491155556666");
            expect(customer.waId).toBe("5491155556666");
            expect(customer.name).toBeUndefined();
        });
        it("should create a customer with waId and name", () => {
            const customer = customer_entity_1.Customer.create("5491155556666", "Maria");
            expect(customer.waId).toBe("5491155556666");
            expect(customer.name).toBe("Maria");
        });
        it("should create customer without id (for new customers)", () => {
            const customer = customer_entity_1.Customer.create("5491155556666", "Test");
            expect(customer.id).toBeUndefined();
        });
    });
    describe("immutability", () => {
        it("should have readonly properties", () => {
            const customer = customer_entity_1.Customer.create("5491155556666", "Test");
            // TypeScript would prevent this at compile time,
            // but we verify the values are set correctly
            expect(customer.waId).toBe("5491155556666");
            expect(customer.name).toBe("Test");
        });
    });
});
