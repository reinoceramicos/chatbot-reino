import { FlowRepositoryPort } from "../../domain/ports/flow.repository.port";
import { FlowDefinition, FlowStep, FlowStepOption, FlowStepTransition } from "../../domain/entities/flow.entity";
import {
  FlowDefinitionDto,
  FlowDefinitionListDto,
  FlowStepDto,
  CreateFlowDto,
  UpdateFlowDto,
  CreateStepDto,
  UpdateStepDto,
  CreateOptionDto,
  UpdateOptionDto,
  CreateTransitionDto,
  UpdateTransitionDto,
  DuplicateFlowDto,
} from "../dtos/flow.dto";

export class FlowService {
  constructor(private readonly flowRepository: FlowRepositoryPort) {}

  private toFlowDto(flow: FlowDefinition): FlowDefinitionDto {
    return {
      id: flow.id!,
      code: flow.code,
      name: flow.name,
      description: flow.description,
      isActive: flow.isActive,
      isDefault: flow.isDefault,
      initialStepId: flow.initialStepId,
      timeoutMinutes: flow.timeoutMinutes,
      steps: flow.steps.map((step) => this.toStepDto(step)),
      createdAt: flow.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: flow.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  private toFlowListDto(flow: FlowDefinition): FlowDefinitionListDto {
    return {
      id: flow.id!,
      code: flow.code,
      name: flow.name,
      description: flow.description,
      isActive: flow.isActive,
      isDefault: flow.isDefault,
      stepsCount: flow.steps.length,
      createdAt: flow.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: flow.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  private toStepDto(step: FlowStep): FlowStepDto {
    return {
      id: step.id!,
      code: step.code,
      name: step.name,
      order: step.order,
      stepType: step.stepType,
      expectedInput: step.expectedInput,
      messageBody: step.messageBody,
      messageHeader: step.messageHeader,
      messageFooter: step.messageFooter,
      listButtonText: step.listButtonText,
      validationRegex: step.validationRegex,
      errorMessage: step.errorMessage,
      saveResponseAs: step.saveResponseAs,
      transferToAgent: step.transferToAgent,
      switchToFlow: step.switchToFlow,
      dynamicDataSource: step.dynamicDataSource,
      defaultNextStepId: step.defaultNextStepId,
      options: step.options.map((opt) => ({
        id: opt.id!,
        optionId: opt.optionId,
        title: opt.title,
        description: opt.description,
        section: opt.section,
        order: opt.order,
      })),
      transitions: step.transitions.map((trans) => ({
        id: trans.id!,
        condition: trans.condition,
        nextStepId: trans.nextStepId,
        switchToFlow: trans.switchToFlow,
        order: trans.order,
      })),
    };
  }

  async getAllFlows(): Promise<FlowDefinitionListDto[]> {
    const flows = await this.flowRepository.findAll();
    return flows.map((f) => this.toFlowListDto(f));
  }

  async getActiveFlows(): Promise<FlowDefinitionListDto[]> {
    const flows = await this.flowRepository.findActive();
    return flows.map((f) => this.toFlowListDto(f));
  }

  async getFlowById(id: string): Promise<FlowDefinitionDto | null> {
    const flow = await this.flowRepository.findById(id);
    return flow ? this.toFlowDto(flow) : null;
  }

  async getFlowByCode(code: string): Promise<FlowDefinitionDto | null> {
    const flow = await this.flowRepository.findByCode(code);
    return flow ? this.toFlowDto(flow) : null;
  }

  async getDefaultFlow(): Promise<FlowDefinitionDto | null> {
    const flow = await this.flowRepository.findDefault();
    return flow ? this.toFlowDto(flow) : null;
  }

  async createFlow(dto: CreateFlowDto): Promise<FlowDefinitionDto> {
    const flow = await this.flowRepository.createFlow({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      isDefault: dto.isDefault,
      timeoutMinutes: dto.timeoutMinutes,
    });
    return this.toFlowDto(flow);
  }

  async updateFlow(id: string, dto: UpdateFlowDto): Promise<FlowDefinitionDto> {
    const flow = await this.flowRepository.updateFlow(id, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
      isDefault: dto.isDefault,
      initialStepId: dto.initialStepId,
      timeoutMinutes: dto.timeoutMinutes,
    });
    return this.toFlowDto(flow);
  }

  async deleteFlow(id: string): Promise<void> {
    await this.flowRepository.deleteFlow(id);
  }

  async duplicateFlow(id: string, dto: DuplicateFlowDto): Promise<FlowDefinitionDto> {
    const flow = await this.flowRepository.duplicateFlow(id, dto.newCode, dto.newName);
    return this.toFlowDto(flow);
  }

  async createStep(flowId: string, dto: CreateStepDto): Promise<FlowStepDto> {
    const step = await this.flowRepository.createStep({
      flowId,
      code: dto.code,
      name: dto.name,
      order: dto.order,
      stepType: dto.stepType,
      expectedInput: dto.expectedInput,
      messageBody: dto.messageBody,
      messageHeader: dto.messageHeader,
      messageFooter: dto.messageFooter,
      listButtonText: dto.listButtonText,
      validationRegex: dto.validationRegex,
      errorMessage: dto.errorMessage,
      saveResponseAs: dto.saveResponseAs,
      transferToAgent: dto.transferToAgent,
      switchToFlow: dto.switchToFlow,
      dynamicDataSource: dto.dynamicDataSource,
      defaultNextStepId: dto.defaultNextStepId,
    });
    return this.toStepDto(step);
  }

  async updateStep(stepId: string, dto: UpdateStepDto): Promise<FlowStepDto> {
    const step = await this.flowRepository.updateStep(stepId, dto);
    return this.toStepDto(step);
  }

  async deleteStep(stepId: string): Promise<void> {
    await this.flowRepository.deleteStep(stepId);
  }

  async setInitialStep(flowId: string, stepId: string): Promise<FlowDefinitionDto> {
    const flow = await this.flowRepository.setInitialStep(flowId, stepId);
    return this.toFlowDto(flow);
  }

  async createOption(stepId: string, dto: CreateOptionDto): Promise<FlowStepDto> {
    await this.flowRepository.createOption({
      stepId,
      optionId: dto.optionId,
      title: dto.title,
      description: dto.description,
      section: dto.section,
      order: dto.order,
    });
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }

  async updateOption(optionId: string, stepId: string, dto: UpdateOptionDto): Promise<FlowStepDto> {
    await this.flowRepository.updateOption(optionId, dto);
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }

  async deleteOption(optionId: string, stepId: string): Promise<FlowStepDto> {
    await this.flowRepository.deleteOption(optionId);
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }

  async createTransition(stepId: string, dto: CreateTransitionDto): Promise<FlowStepDto> {
    await this.flowRepository.createTransition({
      stepId,
      condition: dto.condition,
      nextStepId: dto.nextStepId,
      switchToFlow: dto.switchToFlow,
      order: dto.order,
    });
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }

  async updateTransition(transitionId: string, stepId: string, dto: UpdateTransitionDto): Promise<FlowStepDto> {
    await this.flowRepository.updateTransition(transitionId, dto);
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }

  async deleteTransition(transitionId: string, stepId: string): Promise<FlowStepDto> {
    await this.flowRepository.deleteTransition(transitionId);
    const step = await this.flowRepository.getStepById(stepId);
    return this.toStepDto(step!);
  }
}
