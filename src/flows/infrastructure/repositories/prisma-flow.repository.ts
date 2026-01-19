import { PrismaClient } from "@prisma/client";
import {
  FlowRepositoryPort,
  CreateFlowInput,
  UpdateFlowInput,
  CreateStepInput,
  UpdateStepInput,
  CreateOptionInput,
  UpdateOptionInput,
  CreateTransitionInput,
  UpdateTransitionInput,
} from "../../domain/ports/flow.repository.port";
import {
  FlowDefinition,
  FlowStep,
  FlowStepOption,
  FlowStepTransition,
  FlowStepType,
  FlowExpectedInput,
} from "../../domain/entities/flow.entity";

export class PrismaFlowRepository implements FlowRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToFlowDefinition(data: any): FlowDefinition {
    return new FlowDefinition({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      isDefault: data.isDefault,
      initialStepId: data.initialStepId,
      timeoutMinutes: data.timeoutMinutes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      steps: (data.steps || []).map((step: any) => ({
        id: step.id,
        flowId: step.flowId,
        code: step.code,
        name: step.name,
        order: step.order,
        stepType: step.stepType as FlowStepType,
        expectedInput: step.expectedInput as FlowExpectedInput,
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
        options: (step.options || []).map((opt: any) => ({
          id: opt.id,
          stepId: opt.stepId,
          optionId: opt.optionId,
          title: opt.title,
          description: opt.description,
          section: opt.section,
          order: opt.order,
        })),
        transitions: (step.transitions || []).map((trans: any) => ({
          id: trans.id,
          stepId: trans.stepId,
          condition: trans.condition,
          nextStepId: trans.nextStepId,
          switchToFlow: trans.switchToFlow,
          order: trans.order,
        })),
      })),
    });
  }

  private getIncludeClause() {
    return {
      steps: {
        include: {
          options: { orderBy: { order: "asc" as const } },
          transitions: { orderBy: { order: "asc" as const } },
        },
        orderBy: { order: "asc" as const },
      },
    };
  }

  async findAll(): Promise<FlowDefinition[]> {
    const flows = await this.prisma.flowDefinition.findMany({
      include: this.getIncludeClause(),
      orderBy: { name: "asc" },
    });
    return flows.map((f) => this.mapToFlowDefinition(f));
  }

  async findByCode(code: string): Promise<FlowDefinition | null> {
    const flow = await this.prisma.flowDefinition.findUnique({
      where: { code },
      include: this.getIncludeClause(),
    });
    return flow ? this.mapToFlowDefinition(flow) : null;
  }

  async findById(id: string): Promise<FlowDefinition | null> {
    const flow = await this.prisma.flowDefinition.findUnique({
      where: { id },
      include: this.getIncludeClause(),
    });
    return flow ? this.mapToFlowDefinition(flow) : null;
  }

  async findDefault(): Promise<FlowDefinition | null> {
    const flow = await this.prisma.flowDefinition.findFirst({
      where: { isDefault: true, isActive: true },
      include: this.getIncludeClause(),
    });
    return flow ? this.mapToFlowDefinition(flow) : null;
  }

  async findActive(): Promise<FlowDefinition[]> {
    const flows = await this.prisma.flowDefinition.findMany({
      where: { isActive: true },
      include: this.getIncludeClause(),
      orderBy: { name: "asc" },
    });
    return flows.map((f) => this.mapToFlowDefinition(f));
  }

  async createFlow(input: CreateFlowInput): Promise<FlowDefinition> {
    if (input.isDefault) {
      await this.prisma.flowDefinition.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const flow = await this.prisma.flowDefinition.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        timeoutMinutes: input.timeoutMinutes ?? 30,
      },
      include: this.getIncludeClause(),
    });
    return this.mapToFlowDefinition(flow);
  }

  async updateFlow(id: string, input: UpdateFlowInput): Promise<FlowDefinition> {
    if (input.isDefault === true) {
      await this.prisma.flowDefinition.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const flow = await this.prisma.flowDefinition.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        isDefault: input.isDefault,
        initialStepId: input.initialStepId,
        timeoutMinutes: input.timeoutMinutes,
      },
      include: this.getIncludeClause(),
    });
    return this.mapToFlowDefinition(flow);
  }

  async deleteFlow(id: string): Promise<void> {
    await this.prisma.flowDefinition.delete({ where: { id } });
  }

  async createStep(input: CreateStepInput): Promise<FlowStep> {
    const maxOrder = await this.prisma.flowStep.aggregate({
      where: { flowId: input.flowId },
      _max: { order: true },
    });

    const step = await this.prisma.flowStep.create({
      data: {
        flowId: input.flowId,
        code: input.code,
        name: input.name,
        order: input.order ?? (maxOrder._max.order ?? -1) + 1,
        stepType: input.stepType as any,
        expectedInput: input.expectedInput as any,
        messageBody: input.messageBody,
        messageHeader: input.messageHeader,
        messageFooter: input.messageFooter,
        listButtonText: input.listButtonText,
        validationRegex: input.validationRegex,
        errorMessage: input.errorMessage,
        saveResponseAs: input.saveResponseAs,
        transferToAgent: input.transferToAgent ?? false,
        switchToFlow: input.switchToFlow,
        dynamicDataSource: input.dynamicDataSource,
        defaultNextStepId: input.defaultNextStepId,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        transitions: { orderBy: { order: "asc" } },
      },
    });

    return new FlowStep({
      ...step,
      stepType: step.stepType as FlowStepType,
      expectedInput: step.expectedInput as FlowExpectedInput,
      options: step.options,
      transitions: step.transitions,
    });
  }

  async updateStep(id: string, input: UpdateStepInput): Promise<FlowStep> {
    const step = await this.prisma.flowStep.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        order: input.order,
        stepType: input.stepType as any,
        expectedInput: input.expectedInput as any,
        messageBody: input.messageBody,
        messageHeader: input.messageHeader,
        messageFooter: input.messageFooter,
        listButtonText: input.listButtonText,
        validationRegex: input.validationRegex,
        errorMessage: input.errorMessage,
        saveResponseAs: input.saveResponseAs,
        transferToAgent: input.transferToAgent,
        switchToFlow: input.switchToFlow,
        dynamicDataSource: input.dynamicDataSource,
        defaultNextStepId: input.defaultNextStepId,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        transitions: { orderBy: { order: "asc" } },
      },
    });

    return new FlowStep({
      ...step,
      stepType: step.stepType as FlowStepType,
      expectedInput: step.expectedInput as FlowExpectedInput,
      options: step.options,
      transitions: step.transitions,
    });
  }

  async deleteStep(id: string): Promise<void> {
    await this.prisma.flowStep.delete({ where: { id } });
  }

  async getStepById(id: string): Promise<FlowStep | null> {
    const step = await this.prisma.flowStep.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: "asc" } },
        transitions: { orderBy: { order: "asc" } },
      },
    });

    if (!step) return null;

    return new FlowStep({
      ...step,
      stepType: step.stepType as FlowStepType,
      expectedInput: step.expectedInput as FlowExpectedInput,
      options: step.options,
      transitions: step.transitions,
    });
  }

  async createOption(input: CreateOptionInput): Promise<FlowStepOption> {
    const maxOrder = await this.prisma.flowStepOption.aggregate({
      where: { stepId: input.stepId },
      _max: { order: true },
    });

    const option = await this.prisma.flowStepOption.create({
      data: {
        stepId: input.stepId,
        optionId: input.optionId,
        title: input.title,
        description: input.description,
        section: input.section,
        order: input.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    return new FlowStepOption(option);
  }

  async updateOption(id: string, input: UpdateOptionInput): Promise<FlowStepOption> {
    const option = await this.prisma.flowStepOption.update({
      where: { id },
      data: {
        optionId: input.optionId,
        title: input.title,
        description: input.description,
        section: input.section,
        order: input.order,
      },
    });

    return new FlowStepOption(option);
  }

  async deleteOption(id: string): Promise<void> {
    await this.prisma.flowStepOption.delete({ where: { id } });
  }

  async createTransition(input: CreateTransitionInput): Promise<FlowStepTransition> {
    const maxOrder = await this.prisma.flowStepTransition.aggregate({
      where: { stepId: input.stepId },
      _max: { order: true },
    });

    const transition = await this.prisma.flowStepTransition.create({
      data: {
        stepId: input.stepId,
        condition: input.condition,
        nextStepId: input.nextStepId,
        switchToFlow: input.switchToFlow,
        order: input.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    return new FlowStepTransition(transition);
  }

  async updateTransition(id: string, input: UpdateTransitionInput): Promise<FlowStepTransition> {
    const transition = await this.prisma.flowStepTransition.update({
      where: { id },
      data: {
        condition: input.condition,
        nextStepId: input.nextStepId,
        switchToFlow: input.switchToFlow,
        order: input.order,
      },
    });

    return new FlowStepTransition(transition);
  }

  async deleteTransition(id: string): Promise<void> {
    await this.prisma.flowStepTransition.delete({ where: { id } });
  }

  async setInitialStep(flowId: string, stepId: string): Promise<FlowDefinition> {
    const flow = await this.prisma.flowDefinition.update({
      where: { id: flowId },
      data: { initialStepId: stepId },
      include: this.getIncludeClause(),
    });
    return this.mapToFlowDefinition(flow);
  }

  async duplicateFlow(flowId: string, newCode: string, newName: string): Promise<FlowDefinition> {
    const original = await this.prisma.flowDefinition.findUnique({
      where: { id: flowId },
      include: this.getIncludeClause(),
    });

    if (!original) {
      throw new Error("Flow not found");
    }

    const newFlow = await this.prisma.flowDefinition.create({
      data: {
        code: newCode,
        name: newName,
        description: original.description,
        isActive: false,
        isDefault: false,
        timeoutMinutes: original.timeoutMinutes,
      },
    });

    const stepIdMap = new Map<string, string>();

    for (const step of original.steps) {
      const newStep = await this.prisma.flowStep.create({
        data: {
          flowId: newFlow.id,
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
        },
      });

      stepIdMap.set(step.id, newStep.id);

      for (const option of step.options) {
        await this.prisma.flowStepOption.create({
          data: {
            stepId: newStep.id,
            optionId: option.optionId,
            title: option.title,
            description: option.description,
            section: option.section,
            order: option.order,
          },
        });
      }
    }

    for (const step of original.steps) {
      const newStepId = stepIdMap.get(step.id)!;

      for (const transition of step.transitions) {
        await this.prisma.flowStepTransition.create({
          data: {
            stepId: newStepId,
            condition: transition.condition,
            nextStepId: transition.nextStepId ? stepIdMap.get(transition.nextStepId) : null,
            switchToFlow: transition.switchToFlow,
            order: transition.order,
          },
        });
      }

      if (step.defaultNextStepId && stepIdMap.has(step.defaultNextStepId)) {
        await this.prisma.flowStep.update({
          where: { id: newStepId },
          data: { defaultNextStepId: stepIdMap.get(step.defaultNextStepId) },
        });
      }
    }

    if (original.initialStepId && stepIdMap.has(original.initialStepId)) {
      await this.prisma.flowDefinition.update({
        where: { id: newFlow.id },
        data: { initialStepId: stepIdMap.get(original.initialStepId) },
      });
    }

    return this.findById(newFlow.id) as Promise<FlowDefinition>;
  }
}
