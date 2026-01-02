import { Customer } from "../../domain/entities/customer.entity";
import { Conversation } from "../../domain/entities/conversation.entity";
import { CustomerRepositoryPort } from "../../domain/ports/customer.repository.port";
import { ConversationRepositoryPort } from "../../domain/ports/conversation.repository.port";
import { AutoResponseService } from "./auto-response.service";
import { IntentDetectorService } from "./intent-detector.service";
import { PrismaMessageRepository, SaveMessageParams } from "../../infrastructure/repositories/prisma-message.repository";

export interface IncomingMessageData {
  waId: string;
  waMessageId: string;
  senderName: string;
  messageType: string;
  content?: string;
  mediaId?: string;
  metadata?: Record<string, any>;
}

export interface BotResponse {
  shouldRespond: boolean;
  message?: string;
  transferToAgent?: boolean;
  conversationId: string;
  customerId: string;
}

// Mensajes predeterminados
const DEFAULT_MESSAGES = {
  WELCOME: "¡Hola! 👋 Bienvenido a Reino Cerámicos. ¿En qué podemos ayudarte hoy?",
  TRANSFER_TO_AGENT: "Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
  FALLBACK: "Gracias por tu mensaje. Si necesitas hablar con un vendedor, escribí *vendedor* o *cotizar*.",
  FAREWELL: "¡Gracias por contactarnos! Si necesitas algo más, no dudes en escribirnos. ¡Hasta pronto! 👋",
  THANKS: "¡De nada! Estamos para ayudarte. 😊",
};

export class BotService {
  private readonly intentDetector: IntentDetectorService;

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly autoResponseService: AutoResponseService,
    private readonly messageRepository: PrismaMessageRepository
  ) {
    this.intentDetector = new IntentDetectorService();
  }

  async processMessage(data: IncomingMessageData): Promise<BotResponse> {
    // 1. Obtener o crear cliente
    const customer = await this.getOrCreateCustomer(data.waId, data.senderName);

    // 2. Obtener o crear conversación
    const conversation = await this.getOrCreateConversation(customer.id!);

    // 3. Guardar mensaje entrante
    await this.saveIncomingMessage(data, conversation.id!, customer.id!);

    // 4. Si la conversación está asignada a un agente, no responder
    if (conversation.isHandledByAgent() || conversation.isWaitingForAgent()) {
      return {
        shouldRespond: false,
        conversationId: conversation.id!,
        customerId: customer.id!,
      };
    }

    // 5. Procesar el mensaje y generar respuesta
    return this.generateResponse(data, conversation, customer);
  }

  private async getOrCreateCustomer(waId: string, name: string): Promise<Customer> {
    let customer = await this.customerRepository.findByWaId(waId);

    if (!customer) {
      customer = await this.customerRepository.create(Customer.create(waId, name));
    } else if (name && customer.name !== name) {
      // Actualizar nombre si cambió
      customer = await this.customerRepository.update(customer.id!, { name });
    }

    return customer;
  }

  private async getOrCreateConversation(customerId: string): Promise<Conversation> {
    let conversation = await this.conversationRepository.findActiveByCustomerId(customerId);

    if (!conversation) {
      conversation = await this.conversationRepository.create(
        Conversation.createNew(customerId)
      );
    }

    return conversation;
  }

  private async saveIncomingMessage(
    data: IncomingMessageData,
    conversationId: string,
    customerId: string
  ): Promise<void> {
    await this.messageRepository.save({
      conversationId,
      customerId,
      waMessageId: data.waMessageId,
      direction: "INBOUND",
      type: data.messageType,
      content: data.content,
      mediaId: data.mediaId,
      metadata: data.metadata,
      sentByBot: false,
    });
  }

  private async generateResponse(
    data: IncomingMessageData,
    conversation: Conversation,
    customer: Customer
  ): Promise<BotResponse> {
    const baseResponse = {
      conversationId: conversation.id!,
      customerId: customer.id!,
    };

    // Solo procesar mensajes de texto
    if (data.messageType !== "text" || !data.content) {
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    const messageText = data.content;

    // Detectar intención
    const intent = this.intentDetector.detect(messageText);

    // Si es intención de venta, transferir a agente
    if (intent.intent === "SALE_INTEREST") {
      await this.conversationRepository.updateStatus(conversation.id!, "WAITING");
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.TRANSFER_TO_AGENT,
        transferToAgent: true,
      };
    }

    // Buscar respuesta automática
    const autoMatch = await this.autoResponseService.findMatch(messageText);
    if (autoMatch.matched && autoMatch.response) {
      return {
        ...baseResponse,
        shouldRespond: true,
        message: autoMatch.response,
      };
    }

    // Respuestas por intención
    switch (intent.intent) {
      case "GREETING":
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.WELCOME,
        };

      case "FAREWELL":
        await this.conversationRepository.resolve(conversation.id!);
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.FAREWELL,
        };

      case "THANKS":
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.THANKS,
        };

      default:
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.FALLBACK,
        };
    }
  }

  async saveOutgoingMessage(
    conversationId: string,
    customerId: string,
    content: string
  ): Promise<void> {
    await this.messageRepository.save({
      conversationId,
      customerId,
      direction: "OUTBOUND",
      type: "TEXT",
      content,
      sentByBot: true,
    });
  }
}
