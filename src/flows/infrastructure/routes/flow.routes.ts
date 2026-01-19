import { Router } from "express";
import { FlowController } from "../controllers/flow.controller";
import { FlowService } from "../../application/services/flow.service";
import { PrismaFlowRepository } from "../repositories/prisma-flow.repository";
import { getPrismaClient } from "../../../shared/infrastructure/database/prisma.service";
import { authMiddleware } from "../../../agents/infrastructure/middleware/auth.middleware";
import { requireManagerOrAbove } from "../../../agents/infrastructure/middleware/role.middleware";

const prisma = getPrismaClient();
const flowRepository = new PrismaFlowRepository(prisma);
const flowService = new FlowService(flowRepository);
const flowController = new FlowController(flowService);

export const flowRouter = Router();

flowRouter.use(authMiddleware);
flowRouter.use(requireManagerOrAbove);

flowRouter.get("/", (req, res) => flowController.getAllFlows(req, res));
flowRouter.get("/default", (req, res) => flowController.getDefaultFlow(req, res));
flowRouter.get("/code/:code", (req, res) => flowController.getFlowByCode(req, res));
flowRouter.get("/:id", (req, res) => flowController.getFlowById(req, res));
flowRouter.post("/", (req, res) => flowController.createFlow(req, res));
flowRouter.put("/:id", (req, res) => flowController.updateFlow(req, res));
flowRouter.delete("/:id", (req, res) => flowController.deleteFlow(req, res));
flowRouter.post("/:id/duplicate", (req, res) => flowController.duplicateFlow(req, res));
flowRouter.post("/:flowId/initial-step/:stepId", (req, res) => flowController.setInitialStep(req, res));

flowRouter.post("/:flowId/steps", (req, res) => flowController.createStep(req, res));
flowRouter.put("/steps/:stepId", (req, res) => flowController.updateStep(req, res));
flowRouter.delete("/steps/:stepId", (req, res) => flowController.deleteStep(req, res));

flowRouter.post("/steps/:stepId/options", (req, res) => flowController.createOption(req, res));
flowRouter.put("/steps/:stepId/options/:optionId", (req, res) => flowController.updateOption(req, res));
flowRouter.delete("/steps/:stepId/options/:optionId", (req, res) => flowController.deleteOption(req, res));

flowRouter.post("/steps/:stepId/transitions", (req, res) => flowController.createTransition(req, res));
flowRouter.put("/steps/:stepId/transitions/:transitionId", (req, res) => flowController.updateTransition(req, res));
flowRouter.delete("/steps/:stepId/transitions/:transitionId", (req, res) => flowController.deleteTransition(req, res));
