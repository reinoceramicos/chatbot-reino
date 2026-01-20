import { Request, Response } from "express";
import { FlowService } from "../../application/services/flow.service";

export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  async getAllFlows(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === "true";
      const flows = activeOnly
        ? await this.flowService.getActiveFlows()
        : await this.flowService.getAllFlows();
      res.json(flows);
    } catch (error: any) {
      console.error("[FlowController] Error getting flows:", error);
      res.status(500).json({ error: "Error al obtener flujos" });
    }
  }

  async getFlowById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = await this.flowService.getFlowById(id);
      if (!flow) {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error getting flow:", error);
      res.status(500).json({ error: "Error al obtener flujo" });
    }
  }

  async getFlowByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const flow = await this.flowService.getFlowByCode(code);
      if (!flow) {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error getting flow by code:", error);
      res.status(500).json({ error: "Error al obtener flujo" });
    }
  }

  async getDefaultFlow(req: Request, res: Response): Promise<void> {
    try {
      const flow = await this.flowService.getDefaultFlow();
      if (!flow) {
        res.status(404).json({ error: "No hay flujo por defecto configurado" });
        return;
      }
      res.json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error getting default flow:", error);
      res.status(500).json({ error: "Error al obtener flujo por defecto" });
    }
  }

  async createFlow(req: Request, res: Response): Promise<void> {
    try {
      const flow = await this.flowService.createFlow(req.body);
      res.status(201).json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error creating flow:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un flujo con ese código" });
        return;
      }
      res.status(500).json({ error: "Error al crear flujo" });
    }
  }

  async updateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = await this.flowService.updateFlow(id, req.body);
      res.json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error updating flow:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error al actualizar flujo" });
    }
  }

  async deleteFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.flowService.deleteFlow(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("[FlowController] Error deleting flow:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error al eliminar flujo" });
    }
  }

  async duplicateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const flow = await this.flowService.duplicateFlow(id, req.body);
      res.status(201).json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error duplicating flow:", error);
      if (error.message === "Flow not found") {
        res.status(404).json({ error: "Flujo no encontrado" });
        return;
      }
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un flujo con ese código" });
        return;
      }
      res.status(500).json({ error: "Error al duplicar flujo" });
    }
  }

  async createStep(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const step = await this.flowService.createStep(flowId, req.body);
      res.status(201).json(step);
    } catch (error: any) {
      console.error("[FlowController] Error creating step:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe un step con ese código en este flujo" });
        return;
      }
      res.status(500).json({ error: "Error al crear step" });
    }
  }

  async updateStep(req: Request, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const step = await this.flowService.updateStep(stepId, req.body);
      res.json(step);
    } catch (error: any) {
      console.error("[FlowController] Error updating step:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error al actualizar step" });
    }
  }

  async deleteStep(req: Request, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      await this.flowService.deleteStep(stepId);
      res.status(204).send();
    } catch (error: any) {
      console.error("[FlowController] Error deleting step:", error);
      if (error.code === "P2025") {
        res.status(404).json({ error: "Step no encontrado" });
        return;
      }
      res.status(500).json({ error: "Error al eliminar step" });
    }
  }

  async setInitialStep(req: Request, res: Response): Promise<void> {
    try {
      const { flowId, stepId } = req.params;
      const flow = await this.flowService.setInitialStep(flowId, stepId);
      res.json(flow);
    } catch (error: any) {
      console.error("[FlowController] Error setting initial step:", error);
      res.status(500).json({ error: "Error al configurar step inicial" });
    }
  }

  async createOption(req: Request, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const step = await this.flowService.createOption(stepId, req.body);
      res.status(201).json(step);
    } catch (error: any) {
      console.error("[FlowController] Error creating option:", error);
      if (error.code === "P2002") {
        res.status(400).json({ error: "Ya existe una opción con ese ID en este step" });
        return;
      }
      res.status(500).json({ error: "Error al crear opción" });
    }
  }

  async updateOption(req: Request, res: Response): Promise<void> {
    try {
      const { stepId, optionId } = req.params;
      const step = await this.flowService.updateOption(optionId, stepId, req.body);
      res.json(step);
    } catch (error: any) {
      console.error("[FlowController] Error updating option:", error);
      res.status(500).json({ error: "Error al actualizar opción" });
    }
  }

  async deleteOption(req: Request, res: Response): Promise<void> {
    try {
      const { stepId, optionId } = req.params;
      const step = await this.flowService.deleteOption(optionId, stepId);
      res.json(step);
    } catch (error: any) {
      console.error("[FlowController] Error deleting option:", error);
      res.status(500).json({ error: "Error al eliminar opción" });
    }
  }

  async createTransition(req: Request, res: Response): Promise<void> {
    try {
      const { stepId } = req.params;
      const step = await this.flowService.createTransition(stepId, req.body);
      res.status(201).json(step);
    } catch (error: any) {
      console.error("[FlowController] Error creating transition:", error);
      res.status(500).json({ error: "Error al crear transición" });
    }
  }

  async updateTransition(req: Request, res: Response): Promise<void> {
    try {
      const { stepId, transitionId } = req.params;
      const step = await this.flowService.updateTransition(transitionId, stepId, req.body);
      res.json(step);
    } catch (error: any) {
      console.error("[FlowController] Error updating transition:", error);
      res.status(500).json({ error: "Error al actualizar transición" });
    }
  }

  async deleteTransition(req: Request, res: Response): Promise<void> {
    try {
      const { stepId, transitionId } = req.params;
      const step = await this.flowService.deleteTransition(transitionId, stepId);
      res.json(step);
    } catch (error: any) {
      console.error("[FlowController] Error deleting transition:", error);
      res.status(500).json({ error: "Error al eliminar transición" });
    }
  }
}
