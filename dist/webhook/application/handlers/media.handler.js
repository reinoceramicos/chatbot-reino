"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class MediaMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const media = message.content.media;
        this.log("MEDIA_MESSAGE", {
            type: message.type,
            mediaId: media?.id,
            mimeType: media?.mimeType,
            caption: media?.caption,
            filename: media?.filename,
            from: message.sender.from,
        });
        // Aqui puedes implementar descarga de media
        // if (media?.id) {
        //   await downloadMedia(media.id);
        // }
    }
}
exports.MediaMessageHandler = MediaMessageHandler;
