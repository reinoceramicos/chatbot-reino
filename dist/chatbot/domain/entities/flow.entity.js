"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flow = void 0;
const message_entity_1 = require("../../../messaging/domain/entities/message.entity");
class Flow {
    name;
    description;
    steps;
    initialStep;
    timeoutMinutes;
    constructor(definition) {
        this.name = definition.name;
        this.description = definition.description;
        this.steps = definition.steps;
        this.initialStep = definition.initialStep;
        this.timeoutMinutes = definition.timeoutMinutes;
    }
    getStep(stepId) {
        return this.steps.get(stepId);
    }
    getInitialStep() {
        return this.steps.get(this.initialStep);
    }
    hasStep(stepId) {
        return this.steps.has(stepId);
    }
    /**
     * Crea el mensaje para un step del flujo
     */
    createMessageForStep(step, to, phoneNumberId) {
        const { prompt } = step;
        if (prompt.type === "button" && prompt.buttons) {
            return message_entity_1.Message.createButtonMessage(to, prompt.body, prompt.buttons, {
                header: prompt.header,
                footer: prompt.footer,
                phoneNumberId,
            });
        }
        if (prompt.type === "list" && prompt.sections && prompt.buttonText) {
            return message_entity_1.Message.createListMessage(to, prompt.body, prompt.buttonText, prompt.sections, {
                header: prompt.header,
                footer: prompt.footer,
                phoneNumberId,
            });
        }
        // Default: mensaje de texto
        return message_entity_1.Message.createText(to, prompt.body, false, phoneNumberId);
    }
    /**
     * Determina el siguiente step basado en la entrada
     */
    getNextStepId(currentStep, input, flowData) {
        if (typeof currentStep.nextStep === "function") {
            return currentStep.nextStep(input, flowData);
        }
        return currentStep.nextStep;
    }
    /**
     * Valida la entrada para un step
     */
    validateInput(step, input) {
        if (!step.validation) {
            return true;
        }
        return step.validation(input);
    }
}
exports.Flow = Flow;
