const express = require("express");
const route = express.Router();
const whatsappController = require("../controllers/whatsapp.controller");

route.head("/", (_req, res) => res.sendStatus(200));

route.get("/", whatsappController.verifyToken);
route.post("/", whatsappController.receiveMessage);

module.exports = route;
