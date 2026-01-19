import { Flow, FlowStep } from "../../domain/entities/flow.entity";
import { Conversation, FlowType, FlowData } from "../../domain/entities/conversation.entity";
import { Message } from "../../../messaging/domain/entities/message.entity";

export interface FlowProcessResult {
  message: Message;
  flowCompleted: boolean;
  newFlowStep?: string;
  newFlowData?: FlowData;
  transferToAgent?: boolean;
  switchToFlow?: string;
}

export interface FlowRegistry {
  [key: string]: Flow;
}

const FLOW_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos por defecto

export class FlowManagerService {
  private flows: FlowRegistry = {};

  /**
   * Registra un flujo disponible
   */
  registerFlow(flowType: string, flow: Flow): void {
    this.flows[flowType] = flow;
  }

  /**
   * Obtiene un flujo registrado
   */
  getFlow(flowType: string): Flow | undefined {
    return this.flows[flowType];
  }

  /**
   * Verifica si hay un flujo activo y no ha expirado
   */
  hasActiveFlow(conversation: Conversation): boolean {
    if (!conversation.flowType || !conversation.flowStep) {
      return false;
    }

    // Verificar timeout
    if (conversation.flowStartedAt) {
      const flow = this.flows[conversation.flowType];
      const timeoutMs = flow ? flow.timeoutMinutes * 60 * 1000 : FLOW_TIMEOUT_MS;
      const elapsed = Date.now() - conversation.flowStartedAt.getTime();

      if (elapsed > timeoutMs) {
        return false; // Flujo expirado
      }
    }

    return true;
  }

  /**
   * Inicia un nuevo flujo
   */
  async startFlow(
    flowType: FlowType,
    to: string,
    phoneNumberId?: string
  ): Promise<FlowProcessResult | null> {
    if (!flowType) return null;

    const flow = this.flows[flowType];
    if (!flow) {
      return null;
    }

    const initialStep = flow.getInitialStep();
    if (!initialStep) {
      return null;
    }

    const message = await flow.createMessageForStep(initialStep, to, phoneNumberId, {});

    return {
      message,
      flowCompleted: false,
      newFlowStep: initialStep.id,
      newFlowData: {},
    };
  }

  /**
   * Procesa la entrada del usuario en un flujo activo
   */
  async processFlowInput(
    conversation: Conversation,
    input: string,
    inputType: "text" | "button_reply" | "list_reply",
    to: string,
    phoneNumberId?: string
  ): Promise<FlowProcessResult | null> {
    if (!conversation.flowType || !conversation.flowStep) {
      return null;
    }

    const flow = this.flows[conversation.flowType];
    if (!flow) {
      return null;
    }

    const currentStep = flow.getStep(conversation.flowStep);
    if (!currentStep) {
      return null;
    }

    // Verificar que el tipo de entrada es el esperado
    if (currentStep.expectedInput !== "any" && currentStep.expectedInput !== inputType) {
      // Tipo de entrada incorrecto, reenviar el prompt
      const message = await flow.createMessageForStep(currentStep, to, phoneNumberId, conversation.flowData);
      return {
        message,
        flowCompleted: false,
        newFlowStep: currentStep.id,
        newFlowData: conversation.flowData,
      };
    }

    // Validar la entrada
    if (!flow.validateInput(currentStep, input)) {
      // Entrada inválida, mostrar mensaje de error y reenviar prompt
      const errorMessage = currentStep.errorMessage || "Respuesta no válida. Por favor, intenta de nuevo.";
      const errorMsg = Message.createText(to, errorMessage, false, phoneNumberId);

      return {
        message: errorMsg,
        flowCompleted: false,
        newFlowStep: currentStep.id,
        newFlowData: conversation.flowData,
      };
    }

    // Guardar la respuesta en flowData si es necesario
    const newFlowData = { ...(conversation.flowData || {}) };
    if (currentStep.saveAs) {
      newFlowData[currentStep.saveAs] = input;
    }

    // Determinar el siguiente step
    const nextStepId = flow.getNextStepId(currentStep, input, newFlowData);

    if (!nextStepId || nextStepId === "END") {
      return this.handleFlowCompletion(flow, newFlowData, to, phoneNumberId);
    }

    if (nextStepId === "TRANSFER") {
      const transferMessage = Message.createText(
        to,
        "Perfecto, un vendedor te contactará en breve. 🙌",
        false,
        phoneNumberId
      );
      return {
        message: transferMessage,
        flowCompleted: true,
        newFlowStep: undefined,
        newFlowData: newFlowData,
        transferToAgent: true,
      };
    }

    if (nextStepId.startsWith("FLOW:")) {
      const targetFlowType = nextStepId.replace("FLOW:", "");
      return this.switchToFlow(targetFlowType, to, phoneNumberId, newFlowData);
    }

    const nextStep = flow.getStep(nextStepId);
    if (!nextStep) {
      return this.handleFlowCompletion(flow, newFlowData, to, phoneNumberId);
    }

    if (nextStep.transferToAgent) {
      const message = await flow.createMessageForStep(nextStep, to, phoneNumberId, newFlowData);
      return {
        message,
        flowCompleted: true,
        newFlowStep: undefined,
        newFlowData: newFlowData,
        transferToAgent: true,
      };
    }

    const message = await flow.createMessageForStep(nextStep, to, phoneNumberId, newFlowData);

    return {
      message,
      flowCompleted: false,
      newFlowStep: nextStepId,
      newFlowData: newFlowData,
    };
  }

  private async switchToFlow(
    flowType: string,
    to: string,
    phoneNumberId?: string,
    previousFlowData?: FlowData
  ): Promise<FlowProcessResult | null> {
    const flow = this.flows[flowType];
    if (!flow) {
      return null;
    }

    const initialStep = flow.getInitialStep();
    if (!initialStep) {
      return null;
    }

    const newFlowData = { ...previousFlowData, _previousFlow: true };
    const message = await flow.createMessageForStep(initialStep, to, phoneNumberId, newFlowData);

    return {
      message,
      flowCompleted: false,
      newFlowStep: initialStep.id,
      newFlowData: newFlowData,
      switchToFlow: flowType,
    };
  }

  /**
   * Maneja la finalización de un flujo
   */
  private handleFlowCompletion(
    flow: Flow,
    flowData: FlowData,
    to: string,
    phoneNumberId?: string
  ): FlowProcessResult {
    // Mensaje de finalización genérico
    const completionMessage = Message.createText(
      to,
      "¡Gracias! Hemos registrado tu consulta. ¿Hay algo más en que pueda ayudarte?",
      false,
      phoneNumberId
    );

    return {
      message: completionMessage,
      flowCompleted: true,
      newFlowStep: undefined,
      newFlowData: flowData,
    };
  }

  /**
   * Cancela un flujo activo
   */
  cancelFlow(to: string, phoneNumberId?: string): Message {
    return Message.createText(
      to,
      "Entendido, he cancelado el proceso. ¿En qué más puedo ayudarte?",
      false,
      phoneNumberId
    );
  }

  /**
   * Detecta si el mensaje es un comando para cancelar el flujo
   */
  isCancelCommand(input: string): boolean {
    const cancelCommands = ["cancelar", "salir", "menu", "inicio", "volver", "atras"];
    const normalizedInput = input.toLowerCase().trim();
    return cancelCommands.some((cmd) => normalizedInput === cmd || normalizedInput.startsWith(cmd + " "));
  }
}
