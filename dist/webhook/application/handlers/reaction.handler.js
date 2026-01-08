"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionHandler = void 0;
const base_handler_1 = require("./base.handler");
class ReactionHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const reaction = message.content.reaction;
        this.log("REACTION", {
            messageId: reaction?.messageId,
            emoji: reaction?.emoji,
            from: message.sender.from,
        });
    }
}
exports.ReactionHandler = ReactionHandler;
