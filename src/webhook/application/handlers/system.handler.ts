import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class SystemMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    this.log("SYSTEM_MESSAGE", {
      body: message.content.system?.body,
      type: message.content.system?.type,
      from: message.sender.from,
    });
  }
}
