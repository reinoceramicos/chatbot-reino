import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class ReactionHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const reaction = message.content.reaction;

    this.log("REACTION", {
      messageId: reaction?.messageId,
      emoji: reaction?.emoji,
      from: message.sender.from,
    });
  }
}
