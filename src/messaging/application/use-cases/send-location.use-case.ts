import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { SendLocationDto } from "../dtos/send-message.dto";

export class SendLocationUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendLocationDto): Promise<SendMessageResult> {
    const message = Message.createLocation(
      dto.to,
      dto.latitude,
      dto.longitude,
      dto.name,
      dto.address,
      dto.phoneNumberId
    );
    return this.messagingAdapter.send(message);
  }
}
