import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class MediaMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
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
