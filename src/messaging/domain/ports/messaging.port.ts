import { Message } from "../entities/message.entity";

export interface SendMessageResult {
  messageId: string;
  recipientId: string;
}

export interface MessagingPort {
  send(message: Message): Promise<SendMessageResult>;
}
