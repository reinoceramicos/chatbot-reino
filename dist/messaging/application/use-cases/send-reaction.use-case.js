"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendReactionUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendReactionUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const message = message_entity_1.Message.createReaction(dto.to, dto.messageId, dto.emoji, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendReactionUseCase = SendReactionUseCase;
