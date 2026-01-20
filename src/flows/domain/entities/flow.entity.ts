export type FlowStepType = "TEXT" | "BUTTON" | "LIST" | "LOCATION_REQUEST" | "DYNAMIC_LIST";
export type FlowExpectedInput = "TEXT" | "BUTTON_REPLY" | "LIST_REPLY" | "LOCATION" | "ANY" | "NONE";

export interface FlowStepOptionProps {
  id?: string;
  stepId?: string;
  optionId: string;
  title: string;
  description?: string | null;
  section?: string | null;
  order: number;
}

export interface FlowStepTransitionProps {
  id?: string;
  stepId?: string;
  condition: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order: number;
}

export interface FlowStepProps {
  id?: string;
  flowId?: string;
  code: string;
  name: string;
  order: number;
  positionX?: number | null;
  positionY?: number | null;
  stepType: FlowStepType;
  expectedInput: FlowExpectedInput;
  messageBody: string;
  messageHeader?: string | null;
  messageFooter?: string | null;
  listButtonText?: string | null;
  validationRegex?: string | null;
  errorMessage?: string | null;
  saveResponseAs?: string | null;
  transferToAgent: boolean;
  switchToFlow?: string | null;
  dynamicDataSource?: string | null;
  defaultNextStepId?: string | null;
  options?: FlowStepOptionProps[];
  transitions?: FlowStepTransitionProps[];
}

export interface FlowDefinitionProps {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDefault: boolean;
  initialStepId?: string | null;
  timeoutMinutes: number;
  steps?: FlowStepProps[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class FlowStepOption {
  readonly id?: string;
  readonly stepId?: string;
  readonly optionId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly section?: string | null;
  readonly order: number;

  constructor(props: FlowStepOptionProps) {
    this.id = props.id;
    this.stepId = props.stepId;
    this.optionId = props.optionId;
    this.title = props.title;
    this.description = props.description;
    this.section = props.section;
    this.order = props.order;
  }
}

export class FlowStepTransition {
  readonly id?: string;
  readonly stepId?: string;
  readonly condition: string;
  readonly nextStepId?: string | null;
  readonly switchToFlow?: string | null;
  readonly order: number;

  constructor(props: FlowStepTransitionProps) {
    this.id = props.id;
    this.stepId = props.stepId;
    this.condition = props.condition;
    this.nextStepId = props.nextStepId;
    this.switchToFlow = props.switchToFlow;
    this.order = props.order;
  }
}

export class FlowStep {
  readonly id?: string;
  readonly flowId?: string;
  readonly code: string;
  readonly name: string;
  readonly order: number;
  readonly positionX?: number | null;
  readonly positionY?: number | null;
  readonly stepType: FlowStepType;
  readonly expectedInput: FlowExpectedInput;
  readonly messageBody: string;
  readonly messageHeader?: string | null;
  readonly messageFooter?: string | null;
  readonly listButtonText?: string | null;
  readonly validationRegex?: string | null;
  readonly errorMessage?: string | null;
  readonly saveResponseAs?: string | null;
  readonly transferToAgent: boolean;
  readonly switchToFlow?: string | null;
  readonly dynamicDataSource?: string | null;
  readonly defaultNextStepId?: string | null;
  readonly options: FlowStepOption[];
  readonly transitions: FlowStepTransition[];

  constructor(props: FlowStepProps) {
    this.id = props.id;
    this.flowId = props.flowId;
    this.code = props.code;
    this.name = props.name;
    this.order = props.order;
    this.positionX = props.positionX;
    this.positionY = props.positionY;
    this.stepType = props.stepType;
    this.expectedInput = props.expectedInput;
    this.messageBody = props.messageBody;
    this.messageHeader = props.messageHeader;
    this.messageFooter = props.messageFooter;
    this.listButtonText = props.listButtonText;
    this.validationRegex = props.validationRegex;
    this.errorMessage = props.errorMessage;
    this.saveResponseAs = props.saveResponseAs;
    this.transferToAgent = props.transferToAgent;
    this.switchToFlow = props.switchToFlow;
    this.dynamicDataSource = props.dynamicDataSource;
    this.defaultNextStepId = props.defaultNextStepId;
    this.options = (props.options || []).map(o => new FlowStepOption(o));
    this.transitions = (props.transitions || []).map(t => new FlowStepTransition(t));
  }

  getNextStepId(input: string): string | null {
    const sortedTransitions = [...this.transitions].sort((a, b) => a.order - b.order);

    for (const transition of sortedTransitions) {
      if (transition.condition === input || transition.condition === "*") {
        if (transition.switchToFlow) {
          return `FLOW:${transition.switchToFlow}`;
        }
        return transition.nextStepId || null;
      }
    }

    if (this.switchToFlow) {
      return `FLOW:${this.switchToFlow}`;
    }

    return this.defaultNextStepId || null;
  }

  validateInput(input: string): boolean {
    if (!this.validationRegex) {
      return true;
    }
    try {
      const regex = new RegExp(this.validationRegex);
      return regex.test(input);
    } catch {
      return true;
    }
  }
}

export class FlowDefinition {
  readonly id?: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly isActive: boolean;
  readonly isDefault: boolean;
  readonly initialStepId?: string | null;
  readonly timeoutMinutes: number;
  readonly steps: FlowStep[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private stepsMap: Map<string, FlowStep>;

  constructor(props: FlowDefinitionProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.description = props.description;
    this.isActive = props.isActive;
    this.isDefault = props.isDefault;
    this.initialStepId = props.initialStepId;
    this.timeoutMinutes = props.timeoutMinutes;
    this.steps = (props.steps || []).map(s => new FlowStep(s));
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    this.stepsMap = new Map();
    for (const step of this.steps) {
      this.stepsMap.set(step.code, step);
      if (step.id) {
        this.stepsMap.set(step.id, step);
      }
    }
  }

  getInitialStep(): FlowStep | undefined {
    if (this.initialStepId) {
      return this.stepsMap.get(this.initialStepId);
    }
    const sortedSteps = [...this.steps].sort((a, b) => a.order - b.order);
    return sortedSteps[0];
  }

  getStep(stepIdOrCode: string): FlowStep | undefined {
    return this.stepsMap.get(stepIdOrCode);
  }

  hasStep(stepIdOrCode: string): boolean {
    return this.stepsMap.has(stepIdOrCode);
  }
}
