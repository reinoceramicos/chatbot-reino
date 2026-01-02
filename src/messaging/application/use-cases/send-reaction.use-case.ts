import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { SendReactionDto } from "../dtos/send-message.dto";

export class SendReactionUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendReactionDto): Promise<SendMessageResult> {
    const message = Message.createReaction(dto.to, dto.messageId, dto.emoji, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}
