import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { SendTextDto } from "../dtos/send-message.dto";

export class SendTextUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendTextDto): Promise<SendMessageResult> {
    const message = Message.createText(dto.to, dto.body, dto.previewUrl, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}
