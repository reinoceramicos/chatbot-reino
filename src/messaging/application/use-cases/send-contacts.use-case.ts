import { Message } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { SendContactsDto } from "../dtos/send-message.dto";

export class SendContactsUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendContactsDto): Promise<SendMessageResult> {
    if (!dto.contacts || dto.contacts.length === 0) {
      throw new Error("At least one contact is required");
    }

    const message = Message.createContacts(dto.to, dto.contacts, dto.phoneNumberId);
    return this.messagingAdapter.send(message);
  }
}
