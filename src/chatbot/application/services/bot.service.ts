import { Customer } from "../../domain/entities/customer.entity";
import { Conversation, FlowType } from "../../domain/entities/conversation.entity";
import { CustomerRepositoryPort } from "../../domain/ports/customer.repository.port";
import { ConversationRepositoryPort } from "../../domain/ports/conversation.repository.port";
import { AutoResponseService } from "./auto-response.service";
import { IntentDetectorService } from "./intent-detector.service";
import { FlowManagerService } from "./flow-manager.service";
import { PrismaMessageRepository, SaveMessageParams } from "../../infrastructure/repositories/prisma-message.repository";
import { Message } from "../../../messaging/domain/entities/message.entity";
import { quotationFlow } from "../flows/quotation.flow";
import { infoFlow } from "../flows/info.flow";

export interface IncomingMessageData {
  waId: string;
  waMessageId: string;
  senderName: string;
  messageType: string;
  content?: string;
  mediaId?: string;
  metadata?: Record<string, any>;
  // Para respuestas interactivas
  interactiveReplyId?: string;
  interactiveReplyTitle?: string;
}

export interface BotResponse {
  shouldRespond: boolean;
  message?: string;
  interactiveMessage?: Message;
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
  private readonly flowManager: FlowManagerService;

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly autoResponseService: AutoResponseService,
    private readonly messageRepository: PrismaMessageRepository,
    flowManager?: FlowManagerService
  ) {
    this.intentDetector = new IntentDetectorService();
    this.flowManager = flowManager || new FlowManagerService();

    // Registrar flujos disponibles
    this.flowManager.registerFlow("quotation", quotationFlow);
    this.flowManager.registerFlow("info", infoFlow);
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

    // 5. Si hay un flujo activo, procesarlo
    if (this.flowManager.hasActiveFlow(conversation)) {
      return this.processFlowMessage(data, conversation, customer);
    }

    // 6. Procesar el mensaje y generar respuesta
    return this.generateResponse(data, conversation, customer);
  }

  private async processFlowMessage(
    data: IncomingMessageData,
    conversation: Conversation,
    customer: Customer
  ): Promise<BotResponse> {
    const baseResponse = {
      conversationId: conversation.id!,
      customerId: customer.id!,
    };

    // Determinar el input y su tipo
    let input: string;
    let inputType: "text" | "button_reply" | "list_reply";

    if (data.interactiveReplyId) {
      input = data.interactiveReplyId;
      inputType = data.messageType === "interactive"
        ? (data.metadata?.interactiveType === "list_reply" ? "list_reply" : "button_reply")
        : "button_reply";
    } else {
      input = data.content || "";
      inputType = "text";
    }

    // Verificar si es comando de cancelación
    if (this.flowManager.isCancelCommand(input)) {
      await this.conversationRepository.clearFlow(conversation.id!);
      const cancelMessage = this.flowManager.cancelFlow(data.waId);
      return {
        ...baseResponse,
        shouldRespond: true,
        interactiveMessage: cancelMessage,
      };
    }

    // Procesar el flujo
    const result = this.flowManager.processFlowInput(
      conversation,
      input,
      inputType,
      data.waId
    );

    if (!result) {
      // Error en el flujo, limpiar y responder con fallback
      await this.conversationRepository.clearFlow(conversation.id!);
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    // Actualizar estado del flujo
    if (result.flowCompleted) {
      await this.conversationRepository.clearFlow(conversation.id!);

      if (result.transferToAgent) {
        await this.conversationRepository.updateStatus(conversation.id!, "WAITING");
        return {
          ...baseResponse,
          shouldRespond: true,
          interactiveMessage: result.message,
          transferToAgent: true,
        };
      }
    } else {
      await this.conversationRepository.updateFlow(conversation.id!, {
        flowStep: result.newFlowStep,
        flowData: result.newFlowData,
      });
    }

    return {
      ...baseResponse,
      shouldRespond: true,
      interactiveMessage: result.message,
    };
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

    // Si es intención de venta, iniciar flujo de cotización
    if (intent.intent === "SALE_INTEREST") {
      return this.startFlowForIntent("quotation", data.waId, conversation, baseResponse);
    }

    // Si es pregunta (QUESTION), iniciar flujo de información
    if (intent.intent === "QUESTION") {
      return this.startFlowForIntent("info", data.waId, conversation, baseResponse);
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

      case "COMPLAINT":
        // Para quejas, transferir directamente a un agente
        await this.conversationRepository.updateStatus(conversation.id!, "WAITING");
        return {
          ...baseResponse,
          shouldRespond: true,
          message: "Lamentamos que hayas tenido un problema. Un vendedor te contactará para ayudarte. 🙏",
          transferToAgent: true,
        };

      default:
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.FALLBACK,
        };
    }
  }

  private async startFlowForIntent(
    flowType: FlowType,
    waId: string,
    conversation: Conversation,
    baseResponse: { conversationId: string; customerId: string }
  ): Promise<BotResponse> {
    if (!flowType) {
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    const flowResult = this.flowManager.startFlow(flowType, waId);

    if (!flowResult) {
      // No se pudo iniciar el flujo, usar respuesta legacy
      if (flowType === "quotation") {
        await this.conversationRepository.updateStatus(conversation.id!, "WAITING");
        return {
          ...baseResponse,
          shouldRespond: true,
          message: DEFAULT_MESSAGES.TRANSFER_TO_AGENT,
          transferToAgent: true,
        };
      }
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    // Guardar estado del flujo
    await this.conversationRepository.updateFlow(conversation.id!, {
      flowType,
      flowStep: flowResult.newFlowStep,
      flowData: flowResult.newFlowData,
      flowStartedAt: new Date(),
    });

    return {
      ...baseResponse,
      shouldRespond: true,
      interactiveMessage: flowResult.message,
    };
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
