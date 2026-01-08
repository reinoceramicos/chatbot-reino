"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendTextUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendTextUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const message = message_entity_1.Message.createText(dto.to, dto.body, dto.previewUrl, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendTextUseCase = SendTextUseCase;
