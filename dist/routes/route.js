"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_controller_1 = require("../controllers/whatsapp.controller");
const route = (0, express_1.Router)();
route.head("/", (_req, res) => res.sendStatus(200));
route.get("/", whatsapp_controller_1.verifyToken);
route.post("/", whatsapp_controller_1.receiveMessage);
exports.default = route;
