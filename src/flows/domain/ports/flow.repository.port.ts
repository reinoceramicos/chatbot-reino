import { FlowDefinition, FlowStep, FlowStepOption, FlowStepTransition } from "../entities/flow.entity";

export interface CreateFlowInput {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  timeoutMinutes?: number;
}

export interface UpdateFlowInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  initialStepId?: string | null;
  timeoutMinutes?: number;
}

export interface CreateStepInput {
  flowId: string;
  code: string;
  name: string;
  order?: number;
  stepType: string;
  expectedInput: string;
  messageBody: string;
  messageHeader?: string;
  messageFooter?: string;
  listButtonText?: string;
  validationRegex?: string;
  errorMessage?: string;
  saveResponseAs?: string;
  transferToAgent?: boolean;
  switchToFlow?: string;
  dynamicDataSource?: string;
  defaultNextStepId?: string | null;
}

export interface UpdateStepInput {
  code?: string;
  name?: string;
  order?: number;
  stepType?: string;
  expectedInput?: string;
  messageBody?: string;
  messageHeader?: string | null;
  messageFooter?: string | null;
  listButtonText?: string | null;
  validationRegex?: string | null;
  errorMessage?: string | null;
  saveResponseAs?: string | null;
  transferToAgent?: boolean;
  switchToFlow?: string | null;
  dynamicDataSource?: string | null;
  defaultNextStepId?: string | null;
}

export interface CreateOptionInput {
  stepId: string;
  optionId: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
}

export interface UpdateOptionInput {
  optionId?: string;
  title?: string;
  description?: string | null;
  section?: string | null;
  order?: number;
}

export interface CreateTransitionInput {
  stepId: string;
  condition: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order?: number;
}

export interface UpdateTransitionInput {
  condition?: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order?: number;
}

export interface FlowRepositoryPort {
  findAll(): Promise<FlowDefinition[]>;
  findByCode(code: string): Promise<FlowDefinition | null>;
  findById(id: string): Promise<FlowDefinition | null>;
  findDefault(): Promise<FlowDefinition | null>;
  findActive(): Promise<FlowDefinition[]>;

  createFlow(input: CreateFlowInput): Promise<FlowDefinition>;
  updateFlow(id: string, input: UpdateFlowInput): Promise<FlowDefinition>;
  deleteFlow(id: string): Promise<void>;

  createStep(input: CreateStepInput): Promise<FlowStep>;
  updateStep(id: string, input: UpdateStepInput): Promise<FlowStep>;
  deleteStep(id: string): Promise<void>;
  getStepById(id: string): Promise<FlowStep | null>;

  createOption(input: CreateOptionInput): Promise<FlowStepOption>;
  updateOption(id: string, input: UpdateOptionInput): Promise<FlowStepOption>;
  deleteOption(id: string): Promise<void>;

  createTransition(input: CreateTransitionInput): Promise<FlowStepTransition>;
  updateTransition(id: string, input: UpdateTransitionInput): Promise<FlowStepTransition>;
  deleteTransition(id: string): Promise<void>;

  setInitialStep(flowId: string, stepId: string): Promise<FlowDefinition>;
  duplicateFlow(flowId: string, newCode: string, newName: string): Promise<FlowDefinition>;
}
