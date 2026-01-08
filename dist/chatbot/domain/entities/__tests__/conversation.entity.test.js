"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conversation_entity_1 = require("../conversation.entity");
describe("Conversation Entity", () => {
    describe("constructor", () => {
        it("should create a conversation with all properties", () => {
            const props = {
                id: "conv-123",
                customerId: "customer-456",
                agentId: "agent-789",
                status: "BOT",
                context: { lastTopic: "horarios" },
                startedAt: new Date("2024-01-01"),
                resolvedAt: new Date("2024-01-02"),
                updatedAt: new Date("2024-01-02"),
            };
            const conversation = new conversation_entity_1.Conversation(props);
            expect(conversation.id).toBe("conv-123");
            expect(conversation.customerId).toBe("customer-456");
            expect(conversation.agentId).toBe("agent-789");
            expect(conversation.status).toBe("BOT");
            expect(conversation.context).toEqual({ lastTopic: "horarios" });
            expect(conversation.startedAt).toEqual(new Date("2024-01-01"));
            expect(conversation.resolvedAt).toEqual(new Date("2024-01-02"));
        });
        it("should create a conversation with only required properties", () => {
            const conversation = new conversation_entity_1.Conversation({
                customerId: "customer-456",
                status: "BOT",
            });
            expect(conversation.id).toBeUndefined();
            expect(conversation.customerId).toBe("customer-456");
            expect(conversation.status).toBe("BOT");
            expect(conversation.agentId).toBeUndefined();
        });
    });
    describe("createNew", () => {
        it("should create a new conversation with BOT status", () => {
            const conversation = conversation_entity_1.Conversation.createNew("customer-123");
            expect(conversation.customerId).toBe("customer-123");
            expect(conversation.status).toBe("BOT");
            expect(conversation.id).toBeUndefined();
            expect(conversation.agentId).toBeUndefined();
        });
    });
    describe("status methods", () => {
        describe("isHandledByBot", () => {
            it("should return true when status is BOT", () => {
                const conversation = new conversation_entity_1.Conversation({
                    customerId: "c1",
                    status: "BOT",
                });
                expect(conversation.isHandledByBot()).toBe(true);
            });
            it("should return false for other statuses", () => {
                const statuses = ["WAITING", "ASSIGNED", "RESOLVED"];
                statuses.forEach((status) => {
                    const conversation = new conversation_entity_1.Conversation({
                        customerId: "c1",
                        status,
                    });
                    expect(conversation.isHandledByBot()).toBe(false);
                });
            });
        });
        describe("isHandledByAgent", () => {
            it("should return true when status is ASSIGNED", () => {
                const conversation = new conversation_entity_1.Conversation({
                    customerId: "c1",
                    status: "ASSIGNED",
                });
                expect(conversation.isHandledByAgent()).toBe(true);
            });
            it("should return false for other statuses", () => {
                const statuses = ["BOT", "WAITING", "RESOLVED"];
                statuses.forEach((status) => {
                    const conversation = new conversation_entity_1.Conversation({
                        customerId: "c1",
                        status,
                    });
                    expect(conversation.isHandledByAgent()).toBe(false);
                });
            });
        });
        describe("isWaitingForAgent", () => {
            it("should return true when status is WAITING", () => {
                const conversation = new conversation_entity_1.Conversation({
                    customerId: "c1",
                    status: "WAITING",
                });
                expect(conversation.isWaitingForAgent()).toBe(true);
            });
            it("should return false for other statuses", () => {
                const statuses = ["BOT", "ASSIGNED", "RESOLVED"];
                statuses.forEach((status) => {
                    const conversation = new conversation_entity_1.Conversation({
                        customerId: "c1",
                        status,
                    });
                    expect(conversation.isWaitingForAgent()).toBe(false);
                });
            });
        });
        describe("isResolved", () => {
            it("should return true when status is RESOLVED", () => {
                const conversation = new conversation_entity_1.Conversation({
                    customerId: "c1",
                    status: "RESOLVED",
                });
                expect(conversation.isResolved()).toBe(true);
            });
            it("should return false for other statuses", () => {
                const statuses = ["BOT", "WAITING", "ASSIGNED"];
                statuses.forEach((status) => {
                    const conversation = new conversation_entity_1.Conversation({
                        customerId: "c1",
                        status,
                    });
                    expect(conversation.isResolved()).toBe(false);
                });
            });
        });
    });
});
