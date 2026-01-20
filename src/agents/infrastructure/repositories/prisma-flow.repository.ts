import { PrismaClient } from "@prisma/client";

// Types for Flow operations
export interface CreateFlowInput {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  timeoutMinutes?: number;
}

export interface UpdateFlowInput {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  initialStepId?: string;
  timeoutMinutes?: number;
}

export interface CreateStepInput {
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
  defaultNextStepId?: string;
}

export interface UpdateStepInput {
  code?: string;
  name?: string;
  order?: number;
  stepType?: string;
  expectedInput?: string;
  messageBody?: string;
  messageHeader?: string;
  messageFooter?: string;
  listButtonText?: string;
  validationRegex?: string;
  errorMessage?: string;
  saveResponseAs?: string;
  transferToAgent?: boolean;
  switchToFlow?: string;
  dynamicDataSource?: string;
  defaultNextStepId?: string;
}

export interface CreateOptionInput {
  optionId: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
}

export interface UpdateOptionInput {
  optionId?: string;
  title?: string;
  description?: string;
  section?: string;
  order?: number;
}

export interface CreateTransitionInput {
  condition: string;
  nextStepId?: string;
  switchToFlow?: string;
  order?: number;
}

export interface UpdateTransitionInput {
  condition?: string;
  nextStepId?: string;
  switchToFlow?: string;
  order?: number;
}

export class PrismaFlowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Flow CRUD
  async findAll() {
    const flows = await this.prisma.flow.findMany({
      include: {
        _count: {
          select: { steps: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return flows.map((flow) => ({
      id: flow.id,
      code: flow.code,
      name: flow.name,
      description: flow.description,
      isActive: flow.isActive,
      isDefault: flow.isDefault,
      stepsCount: flow._count.steps,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    }));
  }

  async findById(id: string) {
    return this.prisma.flow.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            options: {
              orderBy: { order: "asc" },
            },
            transitions: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.flow.findUnique({
      where: { code },
      include: {
        steps: {
          include: {
            options: {
              orderBy: { order: "asc" },
            },
            transitions: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async findDefault() {
    return this.prisma.flow.findFirst({
      where: { isDefault: true },
      include: {
        steps: {
          include: {
            options: {
              orderBy: { order: "asc" },
            },
            transitions: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async create(input: CreateFlowInput) {
    // If setting as default, unset other defaults first
    if (input.isDefault) {
      await this.prisma.flow.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.flow.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        timeoutMinutes: input.timeoutMinutes ?? 30,
      },
      include: {
        steps: {
          include: {
            options: { orderBy: { order: "asc" } },
            transitions: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async update(id: string, input: UpdateFlowInput) {
    // If setting as default, unset other defaults first
    if (input.isDefault) {
      await this.prisma.flow.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.flow.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        isDefault: input.isDefault,
        initialStepId: input.initialStepId,
        timeoutMinutes: input.timeoutMinutes,
      },
      include: {
        steps: {
          include: {
            options: { orderBy: { order: "asc" } },
            transitions: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.flow.delete({
      where: { id },
    });
  }

  async duplicate(id: string, newCode: string, newName: string) {
    const original = await this.findById(id);
    if (!original) {
      throw new Error("Flow not found");
    }

    // Create the new flow
    const newFlow = await this.prisma.flow.create({
      data: {
        code: newCode,
        name: newName,
        description: original.description,
        isActive: false, // Duplicated flows start inactive
        isDefault: false,
        timeoutMinutes: original.timeoutMinutes,
      },
    });

    // Map old step IDs to new step IDs
    const stepIdMap: Record<string, string> = {};

    // Create steps
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

      stepIdMap[step.id] = newStep.id;

      // Create options for this step
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

    // Create transitions with mapped step IDs
    for (const step of original.steps) {
      const newStepId = stepIdMap[step.id];
      for (const transition of step.transitions) {
        await this.prisma.flowStepTransition.create({
          data: {
            stepId: newStepId,
            condition: transition.condition,
            nextStepId: transition.nextStepId ? stepIdMap[transition.nextStepId] : null,
            switchToFlow: transition.switchToFlow,
            order: transition.order,
          },
        });
      }
    }

    // Update defaultNextStepId for steps
    for (const step of original.steps) {
      if (step.defaultNextStepId) {
        const newStepId = stepIdMap[step.id];
        const newNextStepId = stepIdMap[step.defaultNextStepId];
        if (newNextStepId) {
          await this.prisma.flowStep.update({
            where: { id: newStepId },
            data: { defaultNextStepId: newNextStepId },
          });
        }
      }
    }

    // Update initialStepId if present
    if (original.initialStepId && stepIdMap[original.initialStepId]) {
      await this.prisma.flow.update({
        where: { id: newFlow.id },
        data: { initialStepId: stepIdMap[original.initialStepId] },
      });
    }

    return this.findById(newFlow.id);
  }

  // Step CRUD
  async addStep(flowId: string, input: CreateStepInput) {
    return this.prisma.flowStep.create({
      data: {
        flowId,
        code: input.code,
        name: input.name,
        order: input.order ?? 0,
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
        dynamicDataSource: input.dynamicDataSource as any,
        defaultNextStepId: input.defaultNextStepId,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        transitions: { orderBy: { order: "asc" } },
      },
    });
  }

  async updateStep(stepId: string, input: UpdateStepInput) {
    return this.prisma.flowStep.update({
      where: { id: stepId },
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
        dynamicDataSource: input.dynamicDataSource as any,
        defaultNextStepId: input.defaultNextStepId,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        transitions: { orderBy: { order: "asc" } },
      },
    });
  }

  async deleteStep(stepId: string) {
    return this.prisma.flowStep.delete({
      where: { id: stepId },
    });
  }

  // Option CRUD
  async addOption(stepId: string, input: CreateOptionInput) {
    return this.prisma.flowStepOption.create({
      data: {
        stepId,
        optionId: input.optionId,
        title: input.title,
        description: input.description,
        section: input.section,
        order: input.order ?? 0,
      },
    });
  }

  async updateOption(optionId: string, input: UpdateOptionInput) {
    return this.prisma.flowStepOption.update({
      where: { id: optionId },
      data: {
        optionId: input.optionId,
        title: input.title,
        description: input.description,
        section: input.section,
        order: input.order,
      },
    });
  }

  async deleteOption(optionId: string) {
    return this.prisma.flowStepOption.delete({
      where: { id: optionId },
    });
  }

  // Transition CRUD
  async addTransition(stepId: string, input: CreateTransitionInput) {
    return this.prisma.flowStepTransition.create({
      data: {
        stepId,
        condition: input.condition,
        nextStepId: input.nextStepId,
        switchToFlow: input.switchToFlow,
        order: input.order ?? 0,
      },
    });
  }

  async updateTransition(transitionId: string, input: UpdateTransitionInput) {
    return this.prisma.flowStepTransition.update({
      where: { id: transitionId },
      data: {
        condition: input.condition,
        nextStepId: input.nextStepId,
        switchToFlow: input.switchToFlow,
        order: input.order,
      },
    });
  }

  async deleteTransition(transitionId: string) {
    return this.prisma.flowStepTransition.delete({
      where: { id: transitionId },
    });
  }
}
