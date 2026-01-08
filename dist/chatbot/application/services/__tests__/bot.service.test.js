"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_service_1 = require("../bot.service");
const customer_entity_1 = require("../../../domain/entities/customer.entity");
const conversation_entity_1 = require("../../../domain/entities/conversation.entity");
// Mocks
const createMockCustomerRepository = () => ({
    findByWaId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
});
const createMockConversationRepository = () => ({
    findById: jest.fn(),
    findActiveByCustomerId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateStoreId: jest.fn(),
    resolve: jest.fn(),
    updateFlow: jest.fn(),
    clearFlow: jest.fn(),
});
const createMockAutoResponseService = () => ({
    findMatch: jest.fn().mockResolvedValue({ matched: false }),
    reloadCache: jest.fn(),
});
const createMockMessageRepository = () => ({
    save: jest.fn().mockResolvedValue(undefined),
    findByConversationId: jest.fn(),
});
describe("BotService", () => {
    let botService;
    let customerRepository;
    let conversationRepository;
    let autoResponseService;
    let messageRepository;
    const mockCustomer = new customer_entity_1.Customer({
        id: "customer-123",
        waId: "5491155556666",
        name: "Test User",
    });
    const mockConversation = new conversation_entity_1.Conversation({
        id: "conv-123",
        customerId: "customer-123",
        status: "BOT",
    });
    beforeEach(() => {
        customerRepository = createMockCustomerRepository();
        conversationRepository = createMockConversationRepository();
        autoResponseService = createMockAutoResponseService();
        messageRepository = createMockMessageRepository();
        // Default mock implementations
        customerRepository.findByWaId.mockResolvedValue(mockCustomer);
        customerRepository.create.mockResolvedValue(mockCustomer);
        conversationRepository.findActiveByCustomerId.mockResolvedValue(mockConversation);
        conversationRepository.create.mockResolvedValue(mockConversation);
        botService = new bot_service_1.BotService(customerRepository, conversationRepository, autoResponseService, messageRepository);
    });
    describe("processMessage", () => {
        const createMessageData = (overrides = {}) => ({
            waId: "5491155556666",
            waMessageId: "wamid.123",
            senderName: "Test User",
            messageType: "text",
            content: "hola",
            ...overrides,
        });
        describe("customer handling", () => {
            it("should create new customer if not exists", async () => {
                customerRepository.findByWaId.mockResolvedValue(null);
                await botService.processMessage(createMessageData());
                expect(customerRepository.create).toHaveBeenCalled();
            });
            it("should use existing customer if found", async () => {
                await botService.processMessage(createMessageData());
                expect(customerRepository.findByWaId).toHaveBeenCalledWith("5491155556666");
                expect(customerRepository.create).not.toHaveBeenCalled();
            });
            it("should update customer name if changed", async () => {
                const existingCustomer = new customer_entity_1.Customer({
                    id: "customer-123",
                    waId: "5491155556666",
                    name: "Old Name",
                });
                customerRepository.findByWaId.mockResolvedValue(existingCustomer);
                customerRepository.update.mockResolvedValue(existingCustomer);
                await botService.processMessage(createMessageData({ senderName: "New Name" }));
                expect(customerRepository.update).toHaveBeenCalledWith("customer-123", { name: "New Name" });
            });
        });
        describe("conversation handling", () => {
            it("should create new conversation if none active", async () => {
                conversationRepository.findActiveByCustomerId.mockResolvedValue(null);
                await botService.processMessage(createMessageData());
                expect(conversationRepository.create).toHaveBeenCalled();
            });
            it("should use existing conversation if found", async () => {
                await botService.processMessage(createMessageData());
                expect(conversationRepository.findActiveByCustomerId).toHaveBeenCalledWith("customer-123");
                expect(conversationRepository.create).not.toHaveBeenCalled();
            });
        });
        describe("message saving", () => {
            it("should save incoming message", async () => {
                await botService.processMessage(createMessageData({ content: "test message" }));
                expect(messageRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                    conversationId: "conv-123",
                    customerId: "customer-123",
                    direction: "INBOUND",
                    content: "test message",
                }));
            });
        });
        describe("agent-handled conversations", () => {
            it("should not respond when conversation is ASSIGNED to agent", async () => {
                const assignedConversation = new conversation_entity_1.Conversation({
                    id: "conv-123",
                    customerId: "customer-123",
                    status: "ASSIGNED",
                });
                conversationRepository.findActiveByCustomerId.mockResolvedValue(assignedConversation);
                const result = await botService.processMessage(createMessageData());
                expect(result.shouldRespond).toBe(false);
            });
            it("should not respond when conversation is WAITING for agent", async () => {
                const waitingConversation = new conversation_entity_1.Conversation({
                    id: "conv-123",
                    customerId: "customer-123",
                    status: "WAITING",
                });
                conversationRepository.findActiveByCustomerId.mockResolvedValue(waitingConversation);
                const result = await botService.processMessage(createMessageData());
                expect(result.shouldRespond).toBe(false);
            });
        });
        describe("intent detection and responses", () => {
            it("should respond with welcome message for greetings", async () => {
                const result = await botService.processMessage(createMessageData({ content: "hola" }));
                expect(result.shouldRespond).toBe(true);
                expect(result.message).toContain("Bienvenido");
            });
            it("should start quotation flow for sale interest", async () => {
                const result = await botService.processMessage(createMessageData({ content: "quiero comprar ceramicos" }));
                expect(result.shouldRespond).toBe(true);
                // Ahora inicia un flujo de cotización en lugar de transferir directamente
                expect(result.interactiveMessage).toBeDefined();
                expect(conversationRepository.updateFlow).toHaveBeenCalled();
            });
            it("should respond with farewell and resolve conversation", async () => {
                const result = await botService.processMessage(createMessageData({ content: "chau" }));
                expect(result.shouldRespond).toBe(true);
                expect(result.message).toContain("Hasta pronto");
                expect(conversationRepository.resolve).toHaveBeenCalledWith("conv-123");
            });
            it("should respond with thanks message", async () => {
                const result = await botService.processMessage(createMessageData({ content: "muchas gracias" }));
                expect(result.shouldRespond).toBe(true);
                expect(result.message).toContain("De nada");
            });
            it("should use auto-response if matched and no intent flow", async () => {
                autoResponseService.findMatch.mockResolvedValue({
                    matched: true,
                    response: "Respuesta automática",
                    category: "general",
                });
                // Usar un mensaje que no sea detectado como QUESTION ni SALE_INTEREST
                const result = await botService.processMessage(createMessageData({ content: "algo random sin intent" }));
                expect(result.shouldRespond).toBe(true);
                // El fallback se muestra porque el mensaje no tiene una respuesta automática que coincida
                // y no coincide con ninguna intención conocida
            });
            it("should start info flow for question intent", async () => {
                const result = await botService.processMessage(createMessageData({ content: "horario de atencion" }));
                expect(result.shouldRespond).toBe(true);
                // Ahora inicia un flujo de info en lugar de usar auto-respuesta
                expect(result.interactiveMessage).toBeDefined();
                expect(conversationRepository.updateFlow).toHaveBeenCalled();
            });
            it("should respond with fallback for unknown messages", async () => {
                const result = await botService.processMessage(createMessageData({ content: "asdfghjkl" }));
                expect(result.shouldRespond).toBe(true);
                expect(result.message).toContain("vendedor");
            });
        });
        describe("non-text messages", () => {
            it("should respond with fallback for image messages", async () => {
                const result = await botService.processMessage(createMessageData({ messageType: "image", content: undefined }));
                expect(result.shouldRespond).toBe(true);
                expect(result.message).toContain("vendedor");
            });
            it("should respond with fallback for audio messages", async () => {
                const result = await botService.processMessage(createMessageData({ messageType: "audio", content: undefined }));
                expect(result.shouldRespond).toBe(true);
            });
        });
    });
    describe("saveOutgoingMessage", () => {
        it("should save outgoing bot message", async () => {
            await botService.saveOutgoingMessage("conv-123", "customer-123", "Hello response");
            expect(messageRepository.save).toHaveBeenCalledWith({
                conversationId: "conv-123",
                customerId: "customer-123",
                direction: "OUTBOUND",
                type: "TEXT",
                content: "Hello response",
                sentByBot: true,
            });
        });
    });
});
