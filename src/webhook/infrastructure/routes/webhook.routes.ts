import { Router } from "express";
import { verifyToken, receiveMessage } from "../controllers/webhook.controller";

const webhookRouter = Router();

webhookRouter.head("/", (_req, res) => res.sendStatus(200));
webhookRouter.get("/", verifyToken);
webhookRouter.post("/", receiveMessage);

export { webhookRouter };
