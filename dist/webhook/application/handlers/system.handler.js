"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class SystemMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        this.log("SYSTEM_MESSAGE", {
            body: message.content.system?.body,
            type: message.content.system?.type,
            from: message.sender.from,
        });
    }
}
exports.SystemMessageHandler = SystemMessageHandler;
