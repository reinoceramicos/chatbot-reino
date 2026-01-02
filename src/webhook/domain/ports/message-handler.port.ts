import { IncomingMessage } from "../entities/incoming-message.entity";

export interface MessageHandlerPort {
  handle(message: IncomingMessage): Promise<void>;
}

export interface MessageHandlerRegistry {
  getHandler(messageType: string): MessageHandlerPort | undefined;
  registerHandler(messageType: string, handler: MessageHandlerPort): void;
}
