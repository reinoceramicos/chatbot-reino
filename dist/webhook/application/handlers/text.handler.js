"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class TextMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        this.log("TEXT_MESSAGE", {
            text: message.content.text,
            from: message.sender.from,
        });
        // Tu logica aqui
    }
}
exports.TextMessageHandler = TextMessageHandler;
