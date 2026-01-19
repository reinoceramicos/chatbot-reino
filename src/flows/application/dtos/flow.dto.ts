export interface FlowStepOptionDto {
  id: string;
  optionId: string;
  title: string;
  description?: string | null;
  section?: string | null;
  order: number;
}

export interface FlowStepTransitionDto {
  id: string;
  condition: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order: number;
}

export interface FlowStepDto {
  id: string;
  code: string;
  name: string;
  order: number;
  stepType: string;
  expectedInput: string;
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
  options: FlowStepOptionDto[];
  transitions: FlowStepTransitionDto[];
}

export interface FlowDefinitionDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDefault: boolean;
  initialStepId?: string | null;
  timeoutMinutes: number;
  steps: FlowStepDto[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowDefinitionListDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isDefault: boolean;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowDto {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  timeoutMinutes?: number;
}

export interface UpdateFlowDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  initialStepId?: string | null;
  timeoutMinutes?: number;
}

export interface CreateStepDto {
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

export interface UpdateStepDto {
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

export interface CreateOptionDto {
  optionId: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
}

export interface UpdateOptionDto {
  optionId?: string;
  title?: string;
  description?: string | null;
  section?: string | null;
  order?: number;
}

export interface CreateTransitionDto {
  condition: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order?: number;
}

export interface UpdateTransitionDto {
  condition?: string;
  nextStepId?: string | null;
  switchToFlow?: string | null;
  order?: number;
}

export interface DuplicateFlowDto {
  newCode: string;
  newName: string;
}
