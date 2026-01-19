import { Message, InteractiveButton, InteractiveListSection } from "../../../messaging/domain/entities/message.entity";

export type FlowStepType = "text" | "button" | "list";
export type ExpectedInputType = "text" | "button_reply" | "list_reply" | "any" | "none";

export interface FlowStepPrompt {
  type: FlowStepType;
  body: string;
  header?: string;
  footer?: string;
  // Para botones
  buttons?: InteractiveButton[];
  // Para listas
  buttonText?: string;
  sections?: InteractiveListSection[];
}

export interface FlowStep {
  id: string;
  prompt?: FlowStepPrompt;
  dynamicPrompt?: (flowData: Record<string, any>) => Promise<FlowStepPrompt>;
  expectedInput: ExpectedInputType;
  validation?: (input: string) => boolean;
  errorMessage?: string;
  nextStep: string | ((input: string, flowData: Record<string, any>) => string);
  saveAs?: string;
  onTimeout?: string;
  transferToAgent?: boolean;
  confirmName?: boolean; // Flag para confirmar el nombre del usuario
}

export interface FlowDefinition {
  name: string;
  description: string;
  steps: Map<string, FlowStep>;
  initialStep: string;
  timeoutMinutes: number;
  onComplete?: (flowData: Record<string, any>) => void;
}

export class Flow {
  readonly name: string;
  readonly description: string;
  readonly steps: Map<string, FlowStep>;
  readonly initialStep: string;
  readonly timeoutMinutes: number;

  constructor(definition: FlowDefinition) {
    this.name = definition.name;
    this.description = definition.description;
    this.steps = definition.steps;
    this.initialStep = definition.initialStep;
    this.timeoutMinutes = definition.timeoutMinutes;
  }

  getStep(stepId: string): FlowStep | undefined {
    return this.steps.get(stepId);
  }

  getInitialStep(): FlowStep | undefined {
    return this.steps.get(this.initialStep);
  }

  hasStep(stepId: string): boolean {
    return this.steps.has(stepId);
  }

  /**
   * Crea el mensaje para un step del flujo
   * Supports both static prompts and dynamic prompts (async)
   */
  async createMessageForStep(
    step: FlowStep,
    to: string,
    phoneNumberId?: string,
    flowData?: Record<string, any>
  ): Promise<Message> {
    // Get prompt - either static or dynamic
    let prompt: FlowStepPrompt;

    if (step.dynamicPrompt) {
      prompt = await step.dynamicPrompt(flowData || {});
    } else if (step.prompt) {
      prompt = step.prompt;
    } else {
      // Fallback if no prompt defined
      return Message.createText(to, "Error: Step sin prompt definido", false, phoneNumberId);
    }

    if (prompt.type === "button" && prompt.buttons) {
      return Message.createButtonMessage(to, prompt.body, prompt.buttons, {
        header: prompt.header,
        footer: prompt.footer,
        phoneNumberId,
      });
    }

    if (prompt.type === "list" && prompt.sections && prompt.buttonText) {
      return Message.createListMessage(to, prompt.body, prompt.buttonText, prompt.sections, {
        header: prompt.header,
        footer: prompt.footer,
        phoneNumberId,
      });
    }

    // Default: mensaje de texto
    return Message.createText(to, prompt.body, false, phoneNumberId);
  }

  /**
   * Determina el siguiente step basado en la entrada
   */
  getNextStepId(currentStep: FlowStep, input: string, flowData: Record<string, any>): string | null {
    if (typeof currentStep.nextStep === "function") {
      return currentStep.nextStep(input, flowData);
    }
    return currentStep.nextStep;
  }

  /**
   * Valida la entrada para un step
   */
  validateInput(step: FlowStep, input: string): boolean {
    if (!step.validation) {
      return true;
    }
    return step.validation(input);
  }
}
