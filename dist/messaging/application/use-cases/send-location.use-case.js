"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendLocationUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendLocationUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const message = message_entity_1.Message.createLocation(dto.to, dto.latitude, dto.longitude, dto.name, dto.address, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendLocationUseCase = SendLocationUseCase;
