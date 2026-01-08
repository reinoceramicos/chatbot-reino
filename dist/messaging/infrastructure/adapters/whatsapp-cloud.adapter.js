"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCloudAdapter = void 0;
const whatsapp_client_1 = require("../http/whatsapp.client");
const env_config_1 = require("../../../shared/config/env.config");
class WhatsAppCloudAdapter {
    httpClient;
    defaultPhoneNumberId;
    constructor(httpClient) {
        this.httpClient = httpClient || new whatsapp_client_1.WhatsAppHttpClient();
        this.defaultPhoneNumberId = env_config_1.envConfig.meta.phoneNumberId;
    }
    async send(message) {
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
    buildPayload(message) {
        const base = {
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
            case "interactive":
                return this.buildInteractivePayload(base, message);
            default:
                throw new Error(`Unsupported message type: ${message.type}`);
        }
    }
    buildTextPayload(base, message) {
        return {
            ...base,
            text: {
                body: message.content.text?.body || "",
                preview_url: message.content.text?.previewUrl || false,
            },
        };
    }
    buildMediaPayload(base, message) {
        const media = {};
        if (message.content.media?.id) {
            media.id = message.content.media.id;
        }
        else if (message.content.media?.url) {
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
    buildLocationPayload(base, message) {
        const location = {
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
    buildContactsPayload(base, message) {
        const contacts = message.content.contacts?.map((contact) => this.mapContact(contact)) || [];
        return {
            ...base,
            contacts,
        };
    }
    mapContact(contact) {
        const mapped = {
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
    buildReactionPayload(base, message) {
        return {
            ...base,
            reaction: {
                message_id: message.content.reaction?.messageId,
                emoji: message.content.reaction?.emoji,
            },
        };
    }
    buildInteractivePayload(base, message) {
        const interactive = message.content.interactive;
        if (!interactive) {
            throw new Error("Interactive content is required for interactive messages");
        }
        const interactivePayload = {
            type: interactive.type,
            body: { text: interactive.body },
        };
        if (interactive.header) {
            interactivePayload.header = { type: "text", text: interactive.header };
        }
        if (interactive.footer) {
            interactivePayload.footer = { text: interactive.footer };
        }
        if (interactive.type === "button" && interactive.buttons) {
            interactivePayload.action = {
                buttons: interactive.buttons.map((btn) => ({
                    type: "reply",
                    reply: {
                        id: btn.id,
                        title: btn.title,
                    },
                })),
            };
        }
        else if (interactive.type === "list" && interactive.sections) {
            interactivePayload.action = {
                button: interactive.buttonText || "Ver opciones",
                sections: interactive.sections.map((section) => ({
                    title: section.title,
                    rows: section.rows.map((row) => ({
                        id: row.id,
                        title: row.title,
                        description: row.description,
                    })),
                })),
            };
        }
        return {
            ...base,
            interactive: interactivePayload,
        };
    }
}
exports.WhatsAppCloudAdapter = WhatsAppCloudAdapter;
