import { BotService, IncomingMessageData } from "../bot.service";
import { AutoResponseService } from "../auto-response.service";
import { Customer } from "../../../domain/entities/customer.entity";
import { Conversation } from "../../../domain/entities/conversation.entity";
import { CustomerRepositoryPort } from "../../../domain/ports/customer.repository.port";
import { ConversationRepositoryPort } from "../../../domain/ports/conversation.repository.port";
import { PrismaMessageRepository } from "../../../infrastructure/repositories/prisma-message.repository";

// Mocks
const createMockCustomerRepository = (): jest.Mocked<CustomerRepositoryPort> => ({
  findByWaId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

const createMockConversationRepository = (): jest.Mocked<ConversationRepositoryPort> => ({
  findById: jest.fn(),
  findActiveByCustomerId: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  assignAgent: jest.fn(),
  resolve: jest.fn(),
});

const createMockAutoResponseService = (): jest.Mocked<AutoResponseService> => ({
  findMatch: jest.fn().mockResolvedValue({ matched: false }),
  reloadCache: jest.fn(),
} as any);

const createMockMessageRepository = (): jest.Mocked<PrismaMessageRepository> => ({
  save: jest.fn().mockResolvedValue(undefined),
  findByConversationId: jest.fn(),
} as any);

describe("BotService", () => {
  let botService: BotService;
  let customerRepository: jest.Mocked<CustomerRepositoryPort>;
  let conversationRepository: jest.Mocked<ConversationRepositoryPort>;
  let autoResponseService: jest.Mocked<AutoResponseService>;
  let messageRepository: jest.Mocked<PrismaMessageRepository>;

  const mockCustomer = new Customer({
    id: "customer-123",
    waId: "5491155556666",
    name: "Test User",
  });

  const mockConversation = new Conversation({
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

    botService = new BotService(
      customerRepository,
      conversationRepository,
      autoResponseService,
      messageRepository
    );
  });

  describe("processMessage", () => {
    const createMessageData = (overrides: Partial<IncomingMessageData> = {}): IncomingMessageData => ({
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
        const existingCustomer = new Customer({
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

        expect(messageRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationId: "conv-123",
            customerId: "customer-123",
            direction: "INBOUND",
            content: "test message",
          })
        );
      });
    });

    describe("agent-handled conversations", () => {
      it("should not respond when conversation is ASSIGNED to agent", async () => {
        const assignedConversation = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "ASSIGNED",
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(assignedConversation);

        const result = await botService.processMessage(createMessageData());

        expect(result.shouldRespond).toBe(false);
      });

      it("should not respond when conversation is WAITING for agent", async () => {
        const waitingConversation = new Conversation({
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

      it("should transfer to agent for sale interest", async () => {
        const result = await botService.processMessage(createMessageData({ content: "quiero comprar ceramicos" }));

        expect(result.shouldRespond).toBe(true);
        expect(result.transferToAgent).toBe(true);
        expect(conversationRepository.updateStatus).toHaveBeenCalledWith("conv-123", "WAITING");
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

      it("should use auto-response if matched", async () => {
        autoResponseService.findMatch.mockResolvedValue({
          matched: true,
          response: "Horario: 8 a 18hs",
          category: "horarios",
        });

        const result = await botService.processMessage(createMessageData({ content: "horario" }));

        expect(result.shouldRespond).toBe(true);
        expect(result.message).toBe("Horario: 8 a 18hs");
      });

      it("should respond with fallback for unknown messages", async () => {
        const result = await botService.processMessage(createMessageData({ content: "asdfghjkl" }));

        expect(result.shouldRespond).toBe(true);
        expect(result.message).toContain("vendedor");
      });
    });

    describe("non-text messages", () => {
      it("should respond with fallback for image messages", async () => {
        const result = await botService.processMessage(
          createMessageData({ messageType: "image", content: undefined })
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.message).toContain("vendedor");
      });

      it("should respond with fallback for audio messages", async () => {
        const result = await botService.processMessage(
          createMessageData({ messageType: "audio", content: undefined })
        );

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
