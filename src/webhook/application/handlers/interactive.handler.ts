import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class InteractiveMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const interactive = message.content.interactive;

    this.log("INTERACTIVE_MESSAGE", {
      type: interactive?.type,
      buttonId: interactive?.buttonReply?.id,
      buttonText: interactive?.buttonReply?.title,
      listId: interactive?.listReply?.id,
      listTitle: interactive?.listReply?.title,
      listDescription: interactive?.listReply?.description,
      from: message.sender.from,
    });
  }
}

export class ButtonReplyHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const button = message.content.button;

    this.log("BUTTON_REPLY", {
      text: button?.text,
      payload: button?.payload,
      from: message.sender.from,
    });
  }
}
