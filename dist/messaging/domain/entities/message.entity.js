"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
class Message {
    to;
    type;
    content;
    phoneNumberId;
    constructor(to, type, content, phoneNumberId) {
        this.to = to;
        this.type = type;
        this.content = content;
        this.phoneNumberId = phoneNumberId;
        this.validate();
    }
    validate() {
        if (!this.to) {
            throw new Error("Recipient 'to' is required");
        }
        if (!this.type) {
            throw new Error("Message type is required");
        }
    }
    static createText(to, body, previewUrl = false, phoneNumberId) {
        return new Message(to, "text", { text: { body, previewUrl } }, phoneNumberId);
    }
    static createImage(to, urlOrId, isId = false, caption, phoneNumberId) {
        return new Message(to, "image", { media: isId ? { id: urlOrId, caption } : { url: urlOrId, caption } }, phoneNumberId);
    }
    static createVideo(to, urlOrId, isId = false, caption, phoneNumberId) {
        return new Message(to, "video", { media: isId ? { id: urlOrId, caption } : { url: urlOrId, caption } }, phoneNumberId);
    }
    static createAudio(to, urlOrId, isId = false, phoneNumberId) {
        return new Message(to, "audio", { media: isId ? { id: urlOrId } : { url: urlOrId } }, phoneNumberId);
    }
    static createDocument(to, urlOrId, isId = false, caption, filename, phoneNumberId) {
        return new Message(to, "document", { media: isId ? { id: urlOrId, caption, filename } : { url: urlOrId, caption, filename } }, phoneNumberId);
    }
    static createSticker(to, urlOrId, isId = false, phoneNumberId) {
        return new Message(to, "sticker", { media: isId ? { id: urlOrId } : { url: urlOrId } }, phoneNumberId);
    }
    static createLocation(to, latitude, longitude, name, address, phoneNumberId) {
        return new Message(to, "location", { location: { latitude, longitude, name, address } }, phoneNumberId);
    }
    static createContacts(to, contacts, phoneNumberId) {
        return new Message(to, "contacts", { contacts }, phoneNumberId);
    }
    static createReaction(to, messageId, emoji, phoneNumberId) {
        return new Message(to, "reaction", { reaction: { messageId, emoji } }, phoneNumberId);
    }
    static createButtonMessage(to, body, buttons, options) {
        if (buttons.length === 0 || buttons.length > 3) {
            throw new Error("Button message must have between 1 and 3 buttons");
        }
        return new Message(to, "interactive", {
            interactive: {
                type: "button",
                body,
                header: options?.header,
                footer: options?.footer,
                buttons,
            },
        }, options?.phoneNumberId);
    }
    static createListMessage(to, body, buttonText, sections, options) {
        if (sections.length === 0 || sections.length > 10) {
            throw new Error("List message must have between 1 and 10 sections");
        }
        const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
        if (totalRows === 0 || totalRows > 10) {
            throw new Error("List message must have between 1 and 10 total rows");
        }
        return new Message(to, "interactive", {
            interactive: {
                type: "list",
                body,
                header: options?.header,
                footer: options?.footer,
                buttonText,
                sections,
            },
        }, options?.phoneNumberId);
    }
}
exports.Message = Message;
