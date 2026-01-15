import { IncomingMessage, SenderInfo } from "../../domain/entities/incoming-message.entity";
import { MessageHandlerPort } from "../../domain/ports/message-handler.port";
import { log } from "../handlers/base.handler";
import {
  TextMessageHandler,
  MediaMessageHandler,
  LocationMessageHandler,
  ContactsMessageHandler,
  InteractiveMessageHandler,
  ButtonReplyHandler,
  ReactionHandler,
  OrderMessageHandler,
  SystemMessageHandler,
} from "../handlers";

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<any>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
          errors?: Array<{ code: number; title: string }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface MessageStatusUpdate {
  waMessageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  timestamp: Date;
  recipientId: string;
}

export class WebhookService {
  private handlers: Map<string, MessageHandlerPort>;
  private processedMessages: Set<string> = new Set();

  constructor() {
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    const textHandler = new TextMessageHandler();
    const mediaHandler = new MediaMessageHandler();
    const locationHandler = new LocationMessageHandler();
    const contactsHandler = new ContactsMessageHandler();
    const interactiveHandler = new InteractiveMessageHandler();
    const buttonHandler = new ButtonReplyHandler();
    const reactionHandler = new ReactionHandler();
    const orderHandler = new OrderMessageHandler();
    const systemHandler = new SystemMessageHandler();

    this.handlers.set("text", textHandler);
    this.handlers.set("image", mediaHandler);
    this.handlers.set("audio", mediaHandler);
    this.handlers.set("voice", mediaHandler);
    this.handlers.set("video", mediaHandler);
    this.handlers.set("document", mediaHandler);
    this.handlers.set("sticker", mediaHandler);
    this.handlers.set("location", locationHandler);
    this.handlers.set("contacts", contactsHandler);
    this.handlers.set("interactive", interactiveHandler);
    this.handlers.set("button", buttonHandler);
    this.handlers.set("reaction", reactionHandler);
    this.handlers.set("order", orderHandler);
    this.handlers.set("system", systemHandler);
  }

  registerHandler(messageType: string, handler: MessageHandlerPort): void {
    this.handlers.set(messageType, handler);
  }

  /**
   * Procesa actualizaciones de estado de mensajes
   */
  processStatusUpdates(payload: WhatsAppWebhookPayload): MessageStatusUpdate[] {
    const statusUpdates: MessageStatusUpdate[] = [];

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.statuses?.length) {
      return statusUpdates;
    }

    for (const status of value.statuses) {
      const statusMap: Record<string, "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
        sent: "SENT",
        delivered: "DELIVERED",
        read: "READ",
        failed: "FAILED",
      };

      statusUpdates.push({
        waMessageId: status.id,
        status: statusMap[status.status] || "SENT",
        timestamp: new Date(parseInt(status.timestamp) * 1000),
        recipientId: status.recipient_id,
      });

      log("STATUS_UPDATE_PARSED", {
        messageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
      });
    }

    return statusUpdates;
  }

  async processWebhook(payload: WhatsAppWebhookPayload): Promise<IncomingMessage[]> {
    const processedMessages: IncomingMessage[] = [];

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      log("NO_MESSAGES", {
        field: changes?.field,
        hasStatuses: !!value?.statuses,
        hasContacts: !!value?.contacts,
      });
      return processedMessages;
    }

    log("WEBHOOK_EVENT", {
      entryId: entry?.id,
      field: changes?.field,
      messagesCount: value.messages.length,
    });

    const metadata = value.metadata;
    const contacts = value.contacts || [];

    for (const msg of value.messages) {
      if (this.isDuplicate(msg.id)) {
        log("DUPLICATE_MESSAGE", msg.id);
        continue;
      }

      const contact = contacts.find((c) => c.wa_id === msg.from);
      const senderInfo: SenderInfo = {
        from: msg.from,
        name: contact?.profile?.name || "Unknown",
        timestamp: msg.timestamp,
      };

      const incomingMessage = this.parseMessage(msg, senderInfo, metadata.phone_number_id);

      log("RECEIVED_MESSAGE", {
        id: incomingMessage.id,
        type: incomingMessage.type,
        from: senderInfo,
      });

      try {
        await this.handleMessage(incomingMessage);
        processedMessages.push(incomingMessage);
      } catch (err: any) {
        log("HANDLER_ERROR", {
          id: msg.id,
          type: msg.type,
          error: err.message,
        });
      }

      this.markAsProcessed(msg.id);
    }

    return processedMessages;
  }

  private parseMessage(msg: any, sender: SenderInfo, phoneNumberId: string): IncomingMessage {
    return new IncomingMessage(msg.id, msg.type, sender, phoneNumberId, {
      text: msg.text?.body,
      media: msg.image || msg.audio || msg.voice || msg.video || msg.document || msg.sticker
        ? {
            id: (msg.image || msg.audio || msg.voice || msg.video || msg.document || msg.sticker)?.id,
            mimeType: (msg.image || msg.audio || msg.voice || msg.video || msg.document || msg.sticker)?.mime_type,
            caption: (msg.image || msg.video || msg.document)?.caption,
            filename: msg.document?.filename,
          }
        : undefined,
      location: msg.location,
      contacts: msg.contacts,
      interactive: msg.interactive
        ? {
            type: msg.interactive.type,
            buttonReply: msg.interactive.button_reply,
            listReply: msg.interactive.list_reply,
          }
        : undefined,
      button: msg.button,
      reaction: msg.reaction
        ? {
            messageId: msg.reaction.message_id,
            emoji: msg.reaction.emoji,
          }
        : undefined,
      order: msg.order
        ? {
            catalogId: msg.order.catalog_id,
            productItems: msg.order.product_items,
          }
        : undefined,
      system: msg.system,
      errors: msg.errors,
    });
  }

  private async handleMessage(message: IncomingMessage): Promise<void> {
    const handler = this.handlers.get(message.type);

    if (handler) {
      await handler.handle(message);
    } else if (message.type === "unsupported") {
      log("UNSUPPORTED_MESSAGE", { id: message.id, errors: message.content.errors });
    } else {
      log("UNKNOWN_MESSAGE_TYPE", { type: message.type, id: message.id });
    }
  }

  private isDuplicate(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }

  private markAsProcessed(messageId: string): void {
    this.processedMessages.add(messageId);

    // Limpiar mensajes viejos para evitar memory leak
    if (this.processedMessages.size > 10000) {
      const iterator = this.processedMessages.values();
      for (let i = 0; i < 5000; i++) {
        const value = iterator.next().value;
        if (value) this.processedMessages.delete(value);
      }
    }
  }
}
