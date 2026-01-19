import { PrismaClient } from "@prisma/client";
import { Customer } from "../../domain/entities/customer.entity";
import { Conversation, FlowType } from "../../domain/entities/conversation.entity";
import { CustomerRepositoryPort } from "../../domain/ports/customer.repository.port";
import { ConversationRepositoryPort } from "../../domain/ports/conversation.repository.port";
import { AutoResponseService } from "./auto-response.service";
import { FlowManagerService } from "./flow-manager.service";
import { PrismaMessageRepository } from "../../infrastructure/repositories/prisma-message.repository";
import { Message } from "../../../messaging/domain/entities/message.entity";
import { DynamicFlowLoaderService } from "./dynamic-flow-loader.service";
import { FlowRepositoryPort } from "../../../flows/domain/ports/flow.repository.port";
import { StoreService } from "./store.service";
// Fallback imports for when database flows are not available
import { quotationFlow } from "../flows/quotation.flow";
import { infoFlow } from "../flows/info.flow";
import { mainMenuFlow } from "../flows/main-menu.flow";

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

const DEFAULT_MESSAGES = {
  TRANSFER_TO_AGENT: "Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
  FALLBACK: "No pude procesar tu mensaje. Por favor, usá las opciones del menú.",
};

export class BotService {
  private readonly flowManager: FlowManagerService;
  private readonly dynamicFlowLoader?: DynamicFlowLoaderService;
  private flowsInitialized: boolean = false;

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly autoResponseService: AutoResponseService,
    private readonly messageRepository: PrismaMessageRepository,
    private readonly prisma?: PrismaClient,
    flowManager?: FlowManagerService,
    flowRepository?: FlowRepositoryPort,
    storeService?: StoreService
  ) {
    this.flowManager = flowManager || new FlowManagerService();

    // If a flow repository is provided, use dynamic flow loading
    if (flowRepository && storeService) {
      this.dynamicFlowLoader = new DynamicFlowLoaderService(flowRepository, storeService);
    } else {
      // Fallback: register hardcoded flows
      this.registerDefaultFlows();
      this.flowsInitialized = true;
    }
  }

  /**
   * Registers the default hardcoded flows as fallback
   */
  private registerDefaultFlows(): void {
    this.flowManager.registerFlow("main_menu", mainMenuFlow);
    this.flowManager.registerFlow("quotation", quotationFlow);
    this.flowManager.registerFlow("info", infoFlow);
  }

  /**
   * Initializes flows from the database. Call this at startup.
   */
  async initializeFlows(): Promise<void> {
    if (this.flowsInitialized) {
      return;
    }

    if (!this.dynamicFlowLoader) {
      this.registerDefaultFlows();
      this.flowsInitialized = true;
      return;
    }

    try {
      const flows = await this.dynamicFlowLoader.loadAllFlows();

      if (flows.size === 0) {
        console.log("No flows found in database, using default flows");
        this.registerDefaultFlows();
      } else {
        for (const [code, flow] of flows) {
          this.flowManager.registerFlow(code, flow);
        }
        console.log(`Loaded ${flows.size} flows from database`);
      }

      this.flowsInitialized = true;
    } catch (error) {
      console.error("Error loading flows from database, using defaults:", error);
      this.registerDefaultFlows();
      this.flowsInitialized = true;
    }
  }

  /**
   * Reloads flows from the database (useful when flows are updated via API)
   */
  async reloadFlows(): Promise<void> {
    if (!this.dynamicFlowLoader) {
      return;
    }

    try {
      const flows = await this.dynamicFlowLoader.loadAllFlows();

      // Clear existing flows and register new ones
      for (const [code, flow] of flows) {
        this.flowManager.registerFlow(code, flow);
      }

      console.log(`Reloaded ${flows.size} flows from database`);
    } catch (error) {
      console.error("Error reloading flows:", error);
    }
  }

  async processMessage(data: IncomingMessageData): Promise<BotResponse> {
    // 0. Ensure flows are initialized
    if (!this.flowsInitialized) {
      await this.initializeFlows();
    }

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
      // Determinar tipo de interacción desde metadata
      const interactiveType = data.metadata?.interactiveType || data.metadata?.interactive?.type;
      inputType = data.messageType === "interactive"
        ? (interactiveType === "list_reply" ? "list_reply" : "button_reply")
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
    const result = await this.flowManager.processFlowInput(
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

    // Manejar cambio de flujo (ej: FLOW:quotation)
    if (result.switchToFlow) {
      await this.conversationRepository.updateFlow(conversation.id!, {
        flowType: result.switchToFlow as FlowType,
        flowStep: result.newFlowStep,
        flowData: result.newFlowData,
        flowStartedAt: new Date(),
      });
      return {
        ...baseResponse,
        shouldRespond: true,
        interactiveMessage: result.message,
      };
    }

    // Actualizar estado del flujo
    if (result.flowCompleted) {
      await this.conversationRepository.clearFlow(conversation.id!);

      if (result.transferToAgent) {
        const storeCode = result.newFlowData?.selectedStoreCode;
        if (storeCode && this.prisma) {
          const store = await this.prisma.store.findFirst({
            where: { code: storeCode },
          });
          if (store) {
            await this.conversationRepository.updateStoreId(conversation.id!, store.id);
          }
        }

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
    // For interactive messages, use the button/list reply title as content
    let content = data.content;
    if (data.messageType === "interactive" && data.interactiveReplyTitle) {
      content = data.interactiveReplyTitle;
    }

    await this.messageRepository.save({
      conversationId,
      customerId,
      waMessageId: data.waMessageId,
      direction: "INBOUND",
      type: data.messageType,
      content,
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

    const flowResult = await this.flowManager.startFlow("main_menu", data.waId);

    if (!flowResult) {
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    await this.conversationRepository.updateFlow(conversation.id!, {
      flowType: "main_menu",
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
