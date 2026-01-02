import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class TextMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    this.log("TEXT_MESSAGE", {
      text: message.content.text,
      from: message.sender.from,
    });

    // Tu logica aqui
  }
}
