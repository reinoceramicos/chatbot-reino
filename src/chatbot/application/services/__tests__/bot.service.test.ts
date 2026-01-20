import { BotService, IncomingMessageData } from "../bot.service";
import { AutoResponseService } from "../auto-response.service";
import { Customer } from "../../../domain/entities/customer.entity";
import { Conversation } from "../../../domain/entities/conversation.entity";
import { CustomerRepositoryPort } from "../../../domain/ports/customer.repository.port";
import { ConversationRepositoryPort } from "../../../domain/ports/conversation.repository.port";
import { PrismaMessageRepository } from "../../../infrastructure/repositories/prisma-message.repository";

const createMockCustomerRepository =
  (): jest.Mocked<CustomerRepositoryPort> => ({
    findByWaId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    confirmName: jest.fn(),
  });

const createMockConversationRepository =
  (): jest.Mocked<ConversationRepositoryPort> => ({
    findById: jest.fn(),
    findActiveByCustomerId: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateStoreId: jest.fn(),
    resolve: jest.fn(),
    updateFlow: jest.fn(),
    clearFlow: jest.fn(),
  });

const createMockAutoResponseService = (): jest.Mocked<AutoResponseService> =>
  ({
    findMatch: jest.fn().mockResolvedValue({ matched: false }),
    reloadCache: jest.fn(),
  }) as any;

const createMockMessageRepository = (): jest.Mocked<PrismaMessageRepository> =>
  ({
    save: jest.fn().mockResolvedValue(undefined),
    findByConversationId: jest.fn(),
  }) as any;

describe("BotService", () => {
  let botService: BotService;
  let customerRepository: jest.Mocked<CustomerRepositoryPort>;
  let conversationRepository: jest.Mocked<ConversationRepositoryPort>;
  let autoResponseService: jest.Mocked<AutoResponseService>;
  let messageRepository: jest.Mocked<PrismaMessageRepository>;

  // Mock customer with nameConfirmed: true (returning user) for most tests
  const mockCustomer = new Customer({
    id: "customer-123",
    waId: "5491155556666",
    name: "Test User",
    nameConfirmed: true,
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

    customerRepository.findByWaId.mockResolvedValue(mockCustomer);
    customerRepository.create.mockResolvedValue(mockCustomer);
    conversationRepository.findActiveByCustomerId.mockResolvedValue(
      mockConversation,
    );
    conversationRepository.create.mockResolvedValue(mockConversation);

    botService = new BotService(
      customerRepository,
      conversationRepository,
      autoResponseService,
      messageRepository,
    );
  });

  describe("processMessage", () => {
    const createMessageData = (
      overrides: Partial<IncomingMessageData> = {},
    ): IncomingMessageData => ({
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

        expect(customerRepository.findByWaId).toHaveBeenCalledWith(
          "5491155556666",
        );
        expect(customerRepository.create).not.toHaveBeenCalled();
      });

      it("should update customer name if changed", async () => {
        const existingCustomer = new Customer({
          id: "customer-123",
          waId: "5491155556666",
          name: "Old Name",
          nameConfirmed: true,
        });
        customerRepository.findByWaId.mockResolvedValue(existingCustomer);
        customerRepository.update.mockResolvedValue(existingCustomer);

        await botService.processMessage(
          createMessageData({ senderName: "New Name" }),
        );

        expect(customerRepository.update).toHaveBeenCalledWith("customer-123", {
          name: "New Name",
        });
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

        expect(
          conversationRepository.findActiveByCustomerId,
        ).toHaveBeenCalledWith("customer-123");
        expect(conversationRepository.create).not.toHaveBeenCalled();
      });
    });

    describe("message saving", () => {
      it("should save incoming message", async () => {
        await botService.processMessage(
          createMessageData({ content: "test message" }),
        );

        expect(messageRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationId: "conv-123",
            customerId: "customer-123",
            direction: "INBOUND",
            content: "test message",
          }),
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
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          assignedConversation,
        );

        const result = await botService.processMessage(createMessageData());

        expect(result.shouldRespond).toBe(false);
      });

      it("should not respond when conversation is WAITING for agent", async () => {
        const waitingConversation = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "WAITING",
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          waitingConversation,
        );

        const result = await botService.processMessage(createMessageData());

        expect(result.shouldRespond).toBe(false);
      });
    });

    describe("menu-driven flow", () => {
      it("should start main menu flow for any text message", async () => {
        const result = await botService.processMessage(
          createMessageData({ content: "hola" }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.interactiveMessage).toBeDefined();
        expect(conversationRepository.updateFlow).toHaveBeenCalledWith(
          "conv-123",
          expect.objectContaining({
            flowType: "main_menu",
          }),
        );
      });

      it("should start main menu flow regardless of message content", async () => {
        const result = await botService.processMessage(
          createMessageData({ content: "asdfghjkl" }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.interactiveMessage).toBeDefined();
        expect(conversationRepository.updateFlow).toHaveBeenCalledWith(
          "conv-123",
          expect.objectContaining({
            flowType: "main_menu",
          }),
        );
      });

      it("should return interactive message with buttons", async () => {
        const result = await botService.processMessage(createMessageData());

        expect(result.interactiveMessage).toBeDefined();
        expect(result.interactiveMessage?.type).toBe("interactive");
      });
    });

    describe("active flow processing", () => {
      it("should process flow when conversation has active flow", async () => {
        const conversationWithFlow = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "BOT",
          flowType: "main_menu",
          flowStep: "welcome",
          flowStartedAt: new Date(),
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          conversationWithFlow,
        );

        const result = await botService.processMessage(
          createMessageData({
            messageType: "interactive",
            interactiveReplyId: "menu_comprar",
            interactiveReplyTitle: "Quiero comprar",
          }),
        );

        expect(result.shouldRespond).toBe(true);
      });

      it("should switch to quotation flow when user selects buy option", async () => {
        const conversationWithFlow = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "BOT",
          flowType: "main_menu",
          flowStep: "welcome",
          flowStartedAt: new Date(),
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          conversationWithFlow,
        );

        const result = await botService.processMessage(
          createMessageData({
            messageType: "interactive",
            interactiveReplyId: "menu_comprar",
            interactiveReplyTitle: "Quiero comprar",
          }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(conversationRepository.updateFlow).toHaveBeenCalledWith(
          "conv-123",
          expect.objectContaining({
            flowType: "quotation",
          }),
        );
      });

      it("should switch to info flow when user selects consultation option", async () => {
        const conversationWithFlow = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "BOT",
          flowType: "main_menu",
          flowStep: "welcome",
          flowStartedAt: new Date(),
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          conversationWithFlow,
        );

        const result = await botService.processMessage(
          createMessageData({
            messageType: "interactive",
            interactiveReplyId: "menu_consultas",
            interactiveReplyTitle: "Consultas frecuentes",
          }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(conversationRepository.updateFlow).toHaveBeenCalledWith(
          "conv-123",
          expect.objectContaining({
            flowType: "info",
          }),
        );
      });

      it("should ask for location when user selects talk to seller option", async () => {
        const conversationWithFlow = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "BOT",
          flowType: "main_menu",
          flowStep: "welcome",
          flowStartedAt: new Date(),
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          conversationWithFlow,
        );

        const result = await botService.processMessage(
          createMessageData({
            messageType: "interactive",
            interactiveReplyId: "menu_vendedor",
            interactiveReplyTitle: "Hablar con vendedor",
          }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.interactiveMessage).toBeDefined();
        expect(conversationRepository.updateFlow).toHaveBeenCalledWith(
          "conv-123",
          expect.objectContaining({
            flowStep: "ask_location_method",
          }),
        );
      });

      it("should cancel flow when user sends cancel command", async () => {
        const conversationWithFlow = new Conversation({
          id: "conv-123",
          customerId: "customer-123",
          status: "BOT",
          flowType: "quotation",
          flowStep: "select_store",
          flowStartedAt: new Date(),
        });
        conversationRepository.findActiveByCustomerId.mockResolvedValue(
          conversationWithFlow,
        );

        const result = await botService.processMessage(
          createMessageData({ content: "cancelar" }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(conversationRepository.clearFlow).toHaveBeenCalledWith(
          "conv-123",
        );
      });
    });

    describe("non-text messages", () => {
      it("should start main menu for image messages", async () => {
        const result = await botService.processMessage(
          createMessageData({ messageType: "image", content: undefined }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.interactiveMessage).toBeDefined();
      });

      it("should start main menu for audio messages", async () => {
        const result = await botService.processMessage(
          createMessageData({ messageType: "audio", content: undefined }),
        );

        expect(result.shouldRespond).toBe(true);
        expect(result.interactiveMessage).toBeDefined();
      });
    });
  });

  describe("saveOutgoingMessage", () => {
    it("should save outgoing bot message", async () => {
      await botService.saveOutgoingMessage(
        "conv-123",
        "customer-123",
        "Hello response",
      );

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
