"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendContactsUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendContactsUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        if (!dto.contacts || dto.contacts.length === 0) {
            throw new Error("At least one contact is required");
        }
        const message = message_entity_1.Message.createContacts(dto.to, dto.contacts, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendContactsUseCase = SendContactsUseCase;
