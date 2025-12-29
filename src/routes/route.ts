import { Router } from "express";
import {
  verifyToken,
  receiveMessage,
} from "../controllers/whatsapp.controller";

const route = Router();

route.head("/", (_req, res) => res.sendStatus(200));

route.get("/", verifyToken);
route.post("/", receiveMessage);

export default route;
