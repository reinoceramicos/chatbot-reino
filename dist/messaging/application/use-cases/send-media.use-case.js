"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendStickerUseCase = exports.SendDocumentUseCase = exports.SendAudioUseCase = exports.SendVideoUseCase = exports.SendImageUseCase = void 0;
const message_entity_1 = require("../../domain/entities/message.entity");
class SendImageUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const isId = !!dto.imageId;
        const urlOrId = dto.imageId || dto.imageUrl;
        if (!urlOrId) {
            throw new Error("Either imageUrl or imageId is required");
        }
        const message = message_entity_1.Message.createImage(dto.to, urlOrId, isId, dto.caption, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendImageUseCase = SendImageUseCase;
class SendVideoUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const isId = !!dto.videoId;
        const urlOrId = dto.videoId || dto.videoUrl;
        if (!urlOrId) {
            throw new Error("Either videoUrl or videoId is required");
        }
        const message = message_entity_1.Message.createVideo(dto.to, urlOrId, isId, dto.caption, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendVideoUseCase = SendVideoUseCase;
class SendAudioUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const isId = !!dto.audioId;
        const urlOrId = dto.audioId || dto.audioUrl;
        if (!urlOrId) {
            throw new Error("Either audioUrl or audioId is required");
        }
        const message = message_entity_1.Message.createAudio(dto.to, urlOrId, isId, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendAudioUseCase = SendAudioUseCase;
class SendDocumentUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const isId = !!dto.documentId;
        const urlOrId = dto.documentId || dto.documentUrl;
        if (!urlOrId) {
            throw new Error("Either documentUrl or documentId is required");
        }
        const message = message_entity_1.Message.createDocument(dto.to, urlOrId, isId, dto.caption, dto.filename, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendDocumentUseCase = SendDocumentUseCase;
class SendStickerUseCase {
    messagingAdapter;
    constructor(messagingAdapter) {
        this.messagingAdapter = messagingAdapter;
    }
    async execute(dto) {
        const isId = !!dto.stickerId;
        const urlOrId = dto.stickerId || dto.stickerUrl;
        if (!urlOrId) {
            throw new Error("Either stickerUrl or stickerId is required");
        }
        const message = message_entity_1.Message.createSticker(dto.to, urlOrId, isId, dto.phoneNumberId);
        return this.messagingAdapter.send(message);
    }
}
exports.SendStickerUseCase = SendStickerUseCase;
