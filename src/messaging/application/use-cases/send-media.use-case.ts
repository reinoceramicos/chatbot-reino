import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import {
  SendImageDto,
  SendVideoDto,
  SendAudioDto,
  SendDocumentDto,
  SendStickerDto,
} from "../dtos/send-message.dto";

export class SendImageUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendImageDto): Promise<SendMessageResult> {
    const isId = !!dto.imageId;
    const urlOrId = dto.imageId || dto.imageUrl;

    if (!urlOrId) {
      throw new Error("Either imageUrl or imageId is required");
    }

    const message = Message.createImage(dto.to, urlOrId, isId, dto.caption, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}

export class SendVideoUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendVideoDto): Promise<SendMessageResult> {
    const isId = !!dto.videoId;
    const urlOrId = dto.videoId || dto.videoUrl;

    if (!urlOrId) {
      throw new Error("Either videoUrl or videoId is required");
    }

    const message = Message.createVideo(dto.to, urlOrId, isId, dto.caption, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}

export class SendAudioUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendAudioDto): Promise<SendMessageResult> {
    const isId = !!dto.audioId;
    const urlOrId = dto.audioId || dto.audioUrl;

    if (!urlOrId) {
      throw new Error("Either audioUrl or audioId is required");
    }

    const message = Message.createAudio(dto.to, urlOrId, isId, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}

export class SendDocumentUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendDocumentDto): Promise<SendMessageResult> {
    const isId = !!dto.documentId;
    const urlOrId = dto.documentId || dto.documentUrl;

    if (!urlOrId) {
      throw new Error("Either documentUrl or documentId is required");
    }

    const message = Message.createDocument(
      dto.to,
      urlOrId,
      isId,
      dto.caption,
      dto.filename,
      dto.phoneNumberId
    );
    return this.messagingAdapter.send(message);
  }
}

export class SendStickerUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendStickerDto): Promise<SendMessageResult> {
    const isId = !!dto.stickerId;
    const urlOrId = dto.stickerId || dto.stickerUrl;

    if (!urlOrId) {
      throw new Error("Either stickerUrl or stickerId is required");
    }

    const message = Message.createSticker(dto.to, urlOrId, isId, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}
