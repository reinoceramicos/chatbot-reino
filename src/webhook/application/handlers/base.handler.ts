import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { MessageHandlerPort } from "../../domain/ports/message-handler.port";

export const log = (label: string, payload: any): void => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${label}`, payload);
};

export abstract class BaseMessageHandler implements MessageHandlerPort {
  abstract handle(message: IncomingMessage): Promise<void>;

  protected log(label: string, payload: any): void {
    log(label, payload);
  }
}
