import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class LocationMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const location = message.content.location;

    this.log("LOCATION_MESSAGE", {
      latitude: location?.latitude,
      longitude: location?.longitude,
      name: location?.name,
      address: location?.address,
      from: message.sender.from,
    });
  }
}
