import { PrismaClient } from "@prisma/client";
import { Customer } from "../../domain/entities/customer.entity";
import {
  Conversation,
  FlowType,
} from "../../domain/entities/conversation.entity";
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
import { onboardingFlow } from "../flows/onboarding.flow";

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

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
  // Para mensajes de ubicación
  location?: LocationData;
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
  TRANSFER_TO_AGENT:
    "Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
  FALLBACK:
    "No pude procesar tu mensaje. Por favor, usá las opciones del menú.",
};

export class BotService {
  private readonly flowManager: FlowManagerService;
  private readonly dynamicFlowLoader?: DynamicFlowLoaderService;
  private readonly storeService?: StoreService;
  private flowsInitialized: boolean = false;

  constructor(
    private readonly customerRepository: CustomerRepositoryPort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly autoResponseService: AutoResponseService,
    private readonly messageRepository: PrismaMessageRepository,
    private readonly prisma?: PrismaClient,
    flowManager?: FlowManagerService,
    flowRepository?: FlowRepositoryPort,
    storeService?: StoreService,
  ) {
    this.flowManager = flowManager || new FlowManagerService();
    this.storeService = storeService;

    // If a flow repository is provided, use dynamic flow loading
    if (flowRepository && storeService) {
      this.dynamicFlowLoader = new DynamicFlowLoaderService(
        flowRepository,
        storeService,
      );
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
    this.flowManager.registerFlow("onboarding", onboardingFlow);
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
      console.error(
        "Error loading flows from database, using defaults:",
        error,
      );
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
    customer: Customer,
  ): Promise<BotResponse> {
    const baseResponse = {
      conversationId: conversation.id!,
      customerId: customer.id!,
    };

    // Asegurar que el customerName esté en el flowData si el usuario ya confirmó su nombre
    if (
      customer.isReturningUser() &&
      customer.name &&
      !conversation.flowData?.customerName
    ) {
      conversation = new Conversation({
        id: conversation.id,
        customerId: conversation.customerId,
        agentId: conversation.agentId,
        storeId: conversation.storeId,
        status: conversation.status,
        context: conversation.context,
        startedAt: conversation.startedAt,
        resolvedAt: conversation.resolvedAt,
        updatedAt: conversation.updatedAt,
        flowType: conversation.flowType,
        flowStep: conversation.flowStep,
        flowData: {
          ...conversation.flowData,
          customerName: customer.name,
        },
        flowStartedAt: conversation.flowStartedAt,
      });
    }

    // Determinar el input y su tipo
    let input: string;
    let inputType: "text" | "button_reply" | "list_reply";

    // Manejar mensaje de ubicación GPS
    if (
      data.messageType === "location" ||
      data.location ||
      data.metadata?.location
    ) {
      const locationResult = await this.handleLocationMessage(
        data,
        conversation,
      );
      if (locationResult) {
        // Actualizar flowData con la tienda encontrada
        const updatedFlowData = {
          ...(conversation.flowData || {}),
          ...locationResult.flowData,
        };

        // Asignar storeId a la conversación si encontramos tienda
        if (locationResult.storeId) {
          await this.conversationRepository.updateStoreId(
            conversation.id!,
            locationResult.storeId,
          );

          // Log de asignación
          console.log(
            "═══════════════════════════════════════════════════════",
          );
          console.log("📍 UBICACIÓN RECIBIDA - ASIGNACIÓN DE TIENDA");
          console.log(
            "═══════════════════════════════════════════════════════",
          );
          console.log(`   Usuario: ${data.waId}`);
          console.log(
            `   Coordenadas: ${locationResult.flowData.userLatitude}, ${locationResult.flowData.userLongitude}`,
          );
          console.log(
            `   ➜ Asignado a: ${locationResult.flowData.selectedStoreName}`,
          );
          console.log(
            `   ➜ Dirección: ${locationResult.flowData.selectedStoreAddress}`,
          );
          console.log(
            `   ➜ Distancia: ${locationResult.flowData.locationDistance} km`,
          );
          console.log(`   ➜ Store ID: ${locationResult.storeId}`);
          console.log(`   ➜ Conversación: ${conversation.id}`);
          console.log(
            "═══════════════════════════════════════════════════════",
          );
        }

        // Actualizar el flujo con los datos de ubicación
        await this.conversationRepository.updateFlow(conversation.id!, {
          flowData: updatedFlowData,
        });

        // Continuar procesando con el input "location_received"
        input = "location_received";
        inputType = "text";

        // Actualizar conversation para el siguiente paso
        conversation = {
          ...conversation,
          flowData: updatedFlowData,
        } as Conversation;
      } else {
        input = data.content || "location";
        inputType = "text";
      }
    } else if (data.interactiveReplyId) {
      input = data.interactiveReplyId;
      // Determinar tipo de interacción desde metadata
      const interactiveType =
        data.metadata?.interactiveType || data.metadata?.interactive?.type;
      inputType =
        data.messageType === "interactive"
          ? interactiveType === "list_reply"
            ? "list_reply"
            : "button_reply"
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
      data.waId,
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

    // Si el flujo indica que se debe confirmar el nombre, hacerlo
    if (result.confirmName && result.newFlowData?.userName) {
      await this.customerRepository.confirmName(
        customer.id!,
        result.newFlowData.userName,
      );
      console.log(
        `✅ Nombre confirmado: ${result.newFlowData.userName} para cliente ${customer.id}`,
      );
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
            await this.conversationRepository.updateStoreId(
              conversation.id!,
              store.id,
            );
          }
        }

        await this.conversationRepository.updateStatus(
          conversation.id!,
          "WAITING",
        );
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

  private async getOrCreateCustomer(
    waId: string,
    name: string,
  ): Promise<Customer> {
    let customer = await this.customerRepository.findByWaId(waId);

    if (!customer) {
      customer = await this.customerRepository.create(
        Customer.create(waId, name),
      );
    } else if (name && customer.name !== name) {
      // Actualizar nombre si cambió
      customer = await this.customerRepository.update(customer.id!, { name });
    }

    return customer;
  }

  private async getOrCreateConversation(
    customerId: string,
  ): Promise<Conversation> {
    let conversation =
      await this.conversationRepository.findActiveByCustomerId(customerId);

    if (!conversation) {
      conversation = await this.conversationRepository.create(
        Conversation.createNew(customerId),
      );
    }

    return conversation;
  }

  private async saveIncomingMessage(
    data: IncomingMessageData,
    conversationId: string,
    customerId: string,
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
    customer: Customer,
  ): Promise<BotResponse> {
    const baseResponse = {
      conversationId: conversation.id!,
      customerId: customer.id!,
    };

    // Determinar qué flujo iniciar basado en si es usuario nuevo o recurrente
    let flowToStart: FlowType;
    let flowData: Record<string, any> = {};

    if (customer.isNewUser()) {
      // Usuario nuevo: iniciar onboarding para pedir nombre
      flowToStart = "onboarding";
      console.log(
        `🆕 Usuario nuevo detectado: ${data.waId} - iniciando onboarding`,
      );
    } else {
      // Usuario recurrente: personalizar el saludo e ir directo al menú
      flowToStart = "main_menu";
      flowData = { customerName: customer.name };
      console.log(
        `👋 Usuario recurrente: ${customer.name} (${data.waId}) - mostrando menú`,
      );
    }

    const flowResult = await this.flowManager.startFlow(
      flowToStart!,
      data.waId,
    );

    if (!flowResult) {
      return {
        ...baseResponse,
        shouldRespond: true,
        message: DEFAULT_MESSAGES.FALLBACK,
      };
    }

    await this.conversationRepository.updateFlow(conversation.id!, {
      flowType: flowToStart,
      flowStep: flowResult.newFlowStep,
      flowData: { ...flowResult.newFlowData, ...flowData },
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
    content: string,
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

  /**
   * Handles location messages by finding the nearest store
   * and returning the store info to save in flowData
   */
  private async handleLocationMessage(
    data: IncomingMessageData,
    conversation: Conversation,
  ): Promise<{ flowData: Record<string, any>; storeId?: string } | null> {
    // Extract location from various sources
    const location = data.location || data.metadata?.location;

    if (
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      console.log("Invalid location data received:", location);
      return null;
    }

    console.log("Processing location:", {
      lat: location.latitude,
      lng: location.longitude,
    });

    // Find nearest store using database
    if (!this.prisma) {
      console.log("No database connection for location lookup");
      return null;
    }

    try {
      // Get all active stores with coordinates
      const stores = await this.prisma.store.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          zoneName: true,
        },
      });

      if (stores.length === 0) {
        console.log("No active stores found");
        return null;
      }

      // Calculate distance to each store and find nearest
      let nearestStore: (typeof stores)[0] | null = null;
      let minDistance = Infinity;

      for (const store of stores) {
        if (store.latitude && store.longitude) {
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            store.latitude,
            store.longitude,
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestStore = store;
          }
        }
      }

      if (!nearestStore) {
        console.log("Could not find nearest store");
        return null;
      }

      console.log(
        `Nearest store: ${nearestStore.name} (${minDistance.toFixed(2)} km)`,
      );

      // Return flow data with store info
      return {
        flowData: {
          selectedStoreCode: nearestStore.code,
          selectedStoreName: nearestStore.name,
          selectedStoreAddress: nearestStore.address,
          storeName: nearestStore.name,
          storeAddress: nearestStore.address,
          locationDistance: Math.round(minDistance * 100) / 100,
          userLatitude: location.latitude,
          userLongitude: location.longitude,
        },
        storeId: nearestStore.id,
      };
    } catch (error) {
      console.error("Error finding nearest store:", error);
      return null;
    }
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
