"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowManagerService = void 0;
const message_entity_1 = require("../../../messaging/domain/entities/message.entity");
const FLOW_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos por defecto
class FlowManagerService {
    flows = {};
    /**
     * Registra un flujo disponible
     */
    registerFlow(flowType, flow) {
        this.flows[flowType] = flow;
    }
    /**
     * Obtiene un flujo registrado
     */
    getFlow(flowType) {
        return this.flows[flowType];
    }
    /**
     * Verifica si hay un flujo activo y no ha expirado
     */
    hasActiveFlow(conversation) {
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
    startFlow(flowType, to, phoneNumberId) {
        if (!flowType)
            return null;
        const flow = this.flows[flowType];
        if (!flow) {
            return null;
        }
        const initialStep = flow.getInitialStep();
        if (!initialStep) {
            return null;
        }
        const message = flow.createMessageForStep(initialStep, to, phoneNumberId);
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
    processFlowInput(conversation, input, inputType, to, phoneNumberId) {
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
            const message = flow.createMessageForStep(currentStep, to, phoneNumberId);
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
            const errorMsg = message_entity_1.Message.createText(to, errorMessage, false, phoneNumberId);
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
        // Si no hay siguiente step, el flujo terminó
        if (!nextStepId || nextStepId === "END") {
            return this.handleFlowCompletion(flow, newFlowData, to, phoneNumberId);
        }
        // Si el siguiente step es "TRANSFER", transferir a agente
        if (nextStepId === "TRANSFER") {
            const transferMessage = message_entity_1.Message.createText(to, "Perfecto, un vendedor te contactará en breve. 🙌", false, phoneNumberId);
            return {
                message: transferMessage,
                flowCompleted: true,
                newFlowStep: undefined,
                newFlowData: newFlowData,
                transferToAgent: true,
            };
        }
        // Obtener el siguiente step y crear su mensaje
        const nextStep = flow.getStep(nextStepId);
        if (!nextStep) {
            // Step no encontrado, terminar flujo
            return this.handleFlowCompletion(flow, newFlowData, to, phoneNumberId);
        }
        const message = flow.createMessageForStep(nextStep, to, phoneNumberId);
        return {
            message,
            flowCompleted: false,
            newFlowStep: nextStepId,
            newFlowData: newFlowData,
        };
    }
    /**
     * Maneja la finalización de un flujo
     */
    handleFlowCompletion(flow, flowData, to, phoneNumberId) {
        // Mensaje de finalización genérico
        const completionMessage = message_entity_1.Message.createText(to, "¡Gracias! Hemos registrado tu consulta. ¿Hay algo más en que pueda ayudarte?", false, phoneNumberId);
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
    cancelFlow(to, phoneNumberId) {
        return message_entity_1.Message.createText(to, "Entendido, he cancelado el proceso. ¿En qué más puedo ayudarte?", false, phoneNumberId);
    }
    /**
     * Detecta si el mensaje es un comando para cancelar el flujo
     */
    isCancelCommand(input) {
        const cancelCommands = ["cancelar", "salir", "menu", "inicio", "volver", "atras"];
        const normalizedInput = input.toLowerCase().trim();
        return cancelCommands.some((cmd) => normalizedInput === cmd || normalizedInput.startsWith(cmd + " "));
    }
}
exports.FlowManagerService = FlowManagerService;
