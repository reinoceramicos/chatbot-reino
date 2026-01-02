import { Message, ContactInfo } from "../../domain/entities/message.entity";
import { MessagingPort, SendMessageResult } from "../../domain/ports/messaging.port";
import { WhatsAppHttpClient } from "../http/whatsapp.client";
import { envConfig } from "../../../shared/config/env.config";

interface WhatsAppPayload {
  messaging_product: "whatsapp";
  to: string;
  type: string;
  [key: string]: any;
}

export class WhatsAppCloudAdapter implements MessagingPort {
  private readonly httpClient: WhatsAppHttpClient;
  private readonly defaultPhoneNumberId: string;

  constructor(httpClient?: WhatsAppHttpClient) {
    this.httpClient = httpClient || new WhatsAppHttpClient();
    this.defaultPhoneNumberId = envConfig.meta.phoneNumberId;
  }

  async send(message: Message): Promise<SendMessageResult> {
    const phoneNumberId = message.phoneNumberId || this.defaultPhoneNumberId;

    if (!phoneNumberId) {
      throw new Error("phoneNumberId is required. Check .env or pass it as parameter");
    }

    const payload = this.buildPayload(message);
    const response = await this.httpClient.post(phoneNumberId, payload);

    return {
      messageId: response.messages[0]?.id || "",
      recipientId: response.contacts[0]?.wa_id || message.to,
    };
  }

  private buildPayload(message: Message): WhatsAppPayload {
    const base: WhatsAppPayload = {
      messaging_product: "whatsapp",
      to: message.to,
      type: message.type,
    };

    switch (message.type) {
      case "text":
        return this.buildTextPayload(base, message);
      case "image":
      case "video":
      case "audio":
      case "document":
      case "sticker":
        return this.buildMediaPayload(base, message);
      case "location":
        return this.buildLocationPayload(base, message);
      case "contacts":
        return this.buildContactsPayload(base, message);
      case "reaction":
        return this.buildReactionPayload(base, message);
      default:
        throw new Error(`Unsupported message type: ${message.type}`);
    }
  }

  private buildTextPayload(base: WhatsAppPayload, message: Message): WhatsAppPayload {
    return {
      ...base,
      text: {
        body: message.content.text?.body || "",
        preview_url: message.content.text?.previewUrl || false,
      },
    };
  }

  private buildMediaPayload(base: WhatsAppPayload, message: Message): WhatsAppPayload {
    const media: Record<string, any> = {};

    if (message.content.media?.id) {
      media.id = message.content.media.id;
    } else if (message.content.media?.url) {
      media.link = message.content.media.url;
    }

    if (message.content.media?.caption) {
      media.caption = message.content.media.caption;
    }

    if (message.content.media?.filename) {
      media.filename = message.content.media.filename;
    }

    return {
      ...base,
      [message.type]: media,
    };
  }

  private buildLocationPayload(base: WhatsAppPayload, message: Message): WhatsAppPayload {
    const location: Record<string, any> = {
      latitude: message.content.location?.latitude,
      longitude: message.content.location?.longitude,
    };

    if (message.content.location?.name) {
      location.name = message.content.location.name;
    }

    if (message.content.location?.address) {
      location.address = message.content.location.address;
    }

    return {
      ...base,
      location,
    };
  }

  private buildContactsPayload(base: WhatsAppPayload, message: Message): WhatsAppPayload {
    const contacts = message.content.contacts?.map((contact) => this.mapContact(contact)) || [];

    return {
      ...base,
      contacts,
    };
  }

  private mapContact(contact: ContactInfo): Record<string, any> {
    const mapped: Record<string, any> = {
      name: {
        formatted_name: contact.name.formattedName,
      },
    };

    if (contact.name.firstName) {
      mapped.name.first_name = contact.name.firstName;
    }

    if (contact.name.lastName) {
      mapped.name.last_name = contact.name.lastName;
    }

    if (contact.phones?.length) {
      mapped.phones = contact.phones.map((p) => ({
        phone: p.phone,
        type: p.type,
        wa_id: p.waId,
      }));
    }

    if (contact.emails?.length) {
      mapped.emails = contact.emails.map((e) => ({
        email: e.email,
        type: e.type,
      }));
    }

    return mapped;
  }

  private buildReactionPayload(base: WhatsAppPayload, message: Message): WhatsAppPayload {
    return {
      ...base,
      reaction: {
        message_id: message.content.reaction?.messageId,
        emoji: message.content.reaction?.emoji,
      },
    };
  }
}
