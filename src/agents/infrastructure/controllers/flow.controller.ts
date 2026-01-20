import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { PrismaFlowRepository } from "../repositories/prisma-flow.repository";

export class FlowController {
  constructor(private readonly flowRepository: PrismaFlowRepository) {}

  // Flow CRUD
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flows = await this.flowRepository.findAll();
      res.json(flows);
    } catch (error: any) {
      console.error("Error getting flows:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = await this.flowRepository.findById(id);

      if (!flow) {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }

      res.json({ flow });
    } catch (error: any) {
      console.error("Error getting flow:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const flow = await this.flowRepository.findByCode(code);

      if (!flow) {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }

      res.json({ flow });
    } catch (error: any) {
      console.error("Error getting flow by code:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async getDefault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flow = await this.flowRepository.findDefault();

      if (!flow) {
        res.status(404).json({ error: "No hay flujo por defecto configurado" });
        return;
      }

      res.json({ flow });
    } catch (error: any) {
      console.error("Error getting default flow:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code, name, description, isActive, isDefault, timeoutMinutes } = req.body;

      if (!code || !name) {
        res.status(400).json({ error: "Código y nombre son requeridos" });
        return;
      }

      const flow = await this.flowRepository.create({
        code,
        name,
        description,
        isActive,
        isDefault,
        timeoutMinutes,
      });

      res.status(201).json({ flow });
    } catch (error: any) {
      console.error("Error creating flow:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un flujo con ese código" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { code, name, description, isActive, isDefault, initialStepId, timeoutMinutes } = req.body;

      const flow = await this.flowRepository.update(id, {
        code,
        name,
        description,
        isActive,
        isDefault,
        initialStepId,
        timeoutMinutes,
      });

      res.json({ flow });
    } catch (error: any) {
      console.error("Error updating flow:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un flujo con ese código" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.flowRepository.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting flow:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async duplicate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newCode, newName } = req.body;

      if (!newCode || !newName) {
        res.status(400).json({ error: "newCode y newName son requeridos" });
        return;
      }

      const flow = await this.flowRepository.duplicate(id, newCode, newName);
      res.status(201).json({ flow });
    } catch (error: any) {
      console.error("Error duplicating flow:", error);
      if (error.message === "Flow not found") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un flujo con ese código" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // Step CRUD
  async addStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const {
        code,
        name,
        order,
        stepType,
        expectedInput,
        messageBody,
        messageHeader,
        messageFooter,
        listButtonText,
        validationRegex,
        errorMessage,
        saveResponseAs,
        transferToAgent,
        switchToFlow,
        dynamicDataSource,
        defaultNextStepId,
      } = req.body;

      if (!code || !name || !stepType || !expectedInput || !messageBody) {
        res.status(400).json({
          error: "code, name, stepType, expectedInput y messageBody son requeridos",
        });
        return;
      }

      const step = await this.flowRepository.addStep(flowId, {
        code,
        name,
        order,
        stepType,
        expectedInput,
        messageBody,
        messageHeader,
        messageFooter,
        listButtonText,
        validationRegex,
        errorMessage,
        saveResponseAs,
        transferToAgent,
        switchToFlow,
        dynamicDataSource,
        defaultNextStepId,
      });

      res.status(201).json({ step });
    } catch (error: any) {
      console.error("Error adding step:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un step con ese código en este flujo" });
        return;
      }
      if (error.code === "P2003") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async updateStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const {
        code,
        name,
        order,
        stepType,
        expectedInput,
        messageBody,
        messageHeader,
        messageFooter,
        listButtonText,
        validationRegex,
        errorMessage,
        saveResponseAs,
        transferToAgent,
        switchToFlow,
        dynamicDataSource,
        defaultNextStepId,
      } = req.body;

      const step = await this.flowRepository.updateStep(stepId, {
        code,
        name,
        order,
        stepType,
        expectedInput,
        messageBody,
        messageHeader,
        messageFooter,
        listButtonText,
        validationRegex,
        errorMessage,
        saveResponseAs,
        transferToAgent,
        switchToFlow,
        dynamicDataSource,
        defaultNextStepId,
      });

      res.json({ step });
    } catch (error: any) {
      console.error("Error updating step:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async deleteStep(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      await this.flowRepository.deleteStep(stepId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting step:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // Option CRUD
  async addOption(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const { optionId, title, description, section, order } = req.body;

      if (!optionId || !title) {
        res.status(400).json({ error: "optionId y title son requeridos" });
        return;
      }

      const option = await this.flowRepository.addOption(stepId, {
        optionId,
        title,
        description,
        section,
        order,
      });

      res.status(201).json({ option });
    } catch (error: any) {
      console.error("Error adding option:", error);
      if (error.code === "P2003") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async updateOption(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { optionId } = req.params;
      const { optionId: newOptionId, title, description, section, order } = req.body;

      const option = await this.flowRepository.updateOption(optionId, {
        optionId: newOptionId,
        title,
        description,
        section,
        order,
      });

      res.json({ option });
    } catch (error: any) {
      console.error("Error updating option:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Option no encontrada" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async deleteOption(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { optionId } = req.params;
      await this.flowRepository.deleteOption(optionId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting option:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Option no encontrada" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // Transition CRUD
  async addTransition(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const { condition, nextStepId, switchToFlow, order } = req.body;

      if (!condition) {
        res.status(400).json({ error: "condition es requerido" });
        return;
      }

      const transition = await this.flowRepository.addTransition(stepId, {
        condition,
        nextStepId,
        switchToFlow,
        order,
      });

      res.status(201).json({ transition });
    } catch (error: any) {
      console.error("Error adding transition:", error);
      if (error.code === "P2003") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async updateTransition(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transitionId } = req.params;
      const { condition, nextStepId, switchToFlow, order } = req.body;

      const transition = await this.flowRepository.updateTransition(transitionId, {
        condition,
        nextStepId,
        switchToFlow,
        order,
      });

      res.json({ transition });
    } catch (error: any) {
      console.error("Error updating transition:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Transition no encontrada" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async deleteTransition(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transitionId } = req.params;
      await this.flowRepository.deleteTransition(transitionId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting transition:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Transition no encontrada" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}
