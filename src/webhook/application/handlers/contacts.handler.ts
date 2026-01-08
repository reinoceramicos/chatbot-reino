import { IncomingMessage } from "../../domain/entities/incoming-message.entity";
import { BaseMessageHandler } from "./base.handler";

export class ContactsMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const contacts = message.content.contacts || [];

    this.log("CONTACTS_MESSAGE", {
      count: contacts.length,
      contacts: contacts.map((c: any) => ({
        name: c.name?.formatted_name,
        phones: c.phones?.map((p: any) => p.phone),
      })),
      from: message.sender.from,
    });
  }
}
