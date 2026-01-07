import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { SendButtonMessageDto, SendListMessageDto } from "../dtos/send-message.dto";

export class SendButtonMessageUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendButtonMessageDto): Promise<SendMessageResult> {
    const message = Message.createButtonMessage(dto.to, dto.body, dto.buttons, {
      header: dto.header,
      footer: dto.footer,
      phoneNumberId: dto.phoneNumberId,
    });
    return this.messagingAdapter.send(message);
  }
}

export class SendListMessageUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendListMessageDto): Promise<SendMessageResult> {
    const message = Message.createListMessage(dto.to, dto.body, dto.buttonText, dto.sections, {
      header: dto.header,
      footer: dto.footer,
      phoneNumberId: dto.phoneNumberId,
    });
    return this.messagingAdapter.send(message);
  }
}
