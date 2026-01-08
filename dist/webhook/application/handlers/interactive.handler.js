"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonReplyHandler = exports.InteractiveMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class InteractiveMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const interactive = message.content.interactive;
        this.log("INTERACTIVE_MESSAGE", {
            type: interactive?.type,
            buttonId: interactive?.buttonReply?.id,
            buttonText: interactive?.buttonReply?.title,
            listId: interactive?.listReply?.id,
            listTitle: interactive?.listReply?.title,
            listDescription: interactive?.listReply?.description,
            from: message.sender.from,
        });
    }
}
exports.InteractiveMessageHandler = InteractiveMessageHandler;
class ButtonReplyHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const button = message.content.button;
        this.log("BUTTON_REPLY", {
            text: button?.text,
            payload: button?.payload,
            from: message.sender.from,
        });
    }
}
exports.ButtonReplyHandler = ButtonReplyHandler;
