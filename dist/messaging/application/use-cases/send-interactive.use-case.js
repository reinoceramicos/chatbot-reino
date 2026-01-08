"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendListMessageUseCase = exports.SendButtonMessageUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendButtonMessageUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const message = message_entity_1.Message.createButtonMessage(dto.to, dto.body, dto.buttons, {
            header: dto.header,
            footer: dto.footer,
            phoneNumberId: dto.phoneNumberId,
        });
        return this.messagingAdapter.send(message);
    }
}
exports.SendButtonMessageUseCase = SendButtonMessageUseCase;
class SendListMessageUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const message = message_entity_1.Message.createListMessage(dto.to, dto.body, dto.buttonText, dto.sections, {
            header: dto.header,
            footer: dto.footer,
            phoneNumberId: dto.phoneNumberId,
        });
        return this.messagingAdapter.send(message);
    }
}
exports.SendListMessageUseCase = SendListMessageUseCase;
