import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class OrderMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const order = message.content.order;

    this.log("ORDER_MESSAGE", {
      catalogId: order?.catalogId,
      productItems: order?.productItems,
      from: message.sender.from,
    });
  }
}
