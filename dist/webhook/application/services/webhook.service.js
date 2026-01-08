"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const incoming_message_entity_1 = require("../../domain/entities/incoming-message.entity");
const base_handler_1 = require("../handlers/base.handler");
const handlers_1 = require("../handlers");
class WebhookService {
    handlers;
    processedMessages = new Set();
    constructor() {
        this.handlers = new Map();
        this.registerDefaultHandlers();
    }
    registerDefaultHandlers() {
        const textHandler = new handlers_1.TextMessageHandler();
        const mediaHandler = new handlers_1.MediaMessageHandler();
        const locationHandler = new handlers_1.LocationMessageHandler();
        const contactsHandler = new handlers_1.ContactsMessageHandler();
        const interactiveHandler = new handlers_1.InteractiveMessageHandler();
        const buttonHandler = new handlers_1.ButtonReplyHandler();
        const reactionHandler = new handlers_1.ReactionHandler();
        const orderHandler = new handlers_1.OrderMessageHandler();
        const systemHandler = new handlers_1.SystemMessageHandler();
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
    registerHandler(messageType, handler) {
        this.handlers.set(messageType, handler);
    }
    async processWebhook(payload) {
        const processedMessages = [];
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        if (!value?.messages?.length) {
            (0, base_handler_1.log)("NO_MESSAGES", {
                field: changes?.field,
                hasStatuses: !!value?.statuses,
                hasContacts: !!value?.contacts,
            });
            return processedMessages;
        }
        (0, base_handler_1.log)("WEBHOOK_EVENT", {
            entryId: entry?.id,
            field: changes?.field,
            messagesCount: value.messages.length,
        });
        const metadata = value.metadata;
        const contacts = value.contacts || [];
        for (const msg of value.messages) {
            if (this.isDuplicate(msg.id)) {
                (0, base_handler_1.log)("DUPLICATE_MESSAGE", msg.id);
                continue;
            }
            const contact = contacts.find((c) => c.wa_id === msg.from);
            const senderInfo = {
                from: msg.from,
                name: contact?.profile?.name || "Unknown",
                timestamp: msg.timestamp,
            };
            const incomingMessage = this.parseMessage(msg, senderInfo, metadata.phone_number_id);
            (0, base_handler_1.log)("RECEIVED_MESSAGE", {
                id: incomingMessage.id,
                type: incomingMessage.type,
                from: senderInfo,
            });
            try {
                await this.handleMessage(incomingMessage);
                processedMessages.push(incomingMessage);
            }
            catch (err) {
                (0, base_handler_1.log)("HANDLER_ERROR", {
                    id: msg.id,
                    type: msg.type,
                    error: err.message,
                });
            }
            this.markAsProcessed(msg.id);
        }
        return processedMessages;
    }
    parseMessage(msg, sender, phoneNumberId) {
        return new incoming_message_entity_1.IncomingMessage(msg.id, msg.type, sender, phoneNumberId, {
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
    async handleMessage(message) {
        const handler = this.handlers.get(message.type);
        if (handler) {
            await handler.handle(message);
        }
        else if (message.type === "unsupported") {
            (0, base_handler_1.log)("UNSUPPORTED_MESSAGE", { id: message.id, errors: message.content.errors });
        }
        else {
            (0, base_handler_1.log)("UNKNOWN_MESSAGE_TYPE", { type: message.type, id: message.id });
        }
    }
    isDuplicate(messageId) {
        return this.processedMessages.has(messageId);
    }
    markAsProcessed(messageId) {
        this.processedMessages.add(messageId);
        // Limpiar mensajes viejos para evitar memory leak
        if (this.processedMessages.size > 10000) {
            const iterator = this.processedMessages.values();
            for (let i = 0; i < 5000; i++) {
                const value = iterator.next().value;
                if (value)
                    this.processedMessages.delete(value);
            }
        }
    }
}
exports.WebhookService = WebhookService;
