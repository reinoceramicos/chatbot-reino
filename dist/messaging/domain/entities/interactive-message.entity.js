"use strict";
// Tipos para mensajes interactivos de WhatsApp
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-messages
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveMessage = void 0;
class InteractiveMessage {
    to;
    content;
    phoneNumberId;
    constructor(to, content, phoneNumberId) {
        this.to = to;
        this.content = content;
        this.phoneNumberId = phoneNumberId;
        this.validate();
    }
    validate() {
        if (!this.to) {
            throw new Error("Recipient 'to' is required");
        }
        if (this.content.type === "button") {
            this.validateButtonMessage(this.content);
        }
        else if (this.content.type === "list") {
            this.validateListMessage(this.content);
        }
    }
    validateButtonMessage(content) {
        if (!content.body?.text) {
            throw new Error("Button message body text is required");
        }
        if (content.body.text.length > 1024) {
            throw new Error("Button message body text must not exceed 1024 characters");
        }
        if (!content.action?.buttons || content.action.buttons.length === 0) {
            throw new Error("Button message must have at least one button");
        }
        if (content.action.buttons.length > 3) {
            throw new Error("Button message cannot have more than 3 buttons");
        }
        for (const button of content.action.buttons) {
            if (!button.reply?.id || !button.reply?.title) {
                throw new Error("Each button must have an id and title");
            }
            if (button.reply.id.length > 256) {
                throw new Error("Button id must not exceed 256 characters");
            }
            if (button.reply.title.length > 20) {
                throw new Error("Button title must not exceed 20 characters");
            }
        }
        if (content.header?.type === "text" && content.header.text && content.header.text.length > 60) {
            throw new Error("Header text must not exceed 60 characters");
        }
        if (content.footer?.text && content.footer.text.length > 60) {
            throw new Error("Footer text must not exceed 60 characters");
        }
    }
    validateListMessage(content) {
        if (!content.body?.text) {
            throw new Error("List message body text is required");
        }
        if (content.body.text.length > 1024) {
            throw new Error("List message body text must not exceed 1024 characters");
        }
        if (!content.action?.button) {
            throw new Error("List message must have a button text");
        }
        if (content.action.button.length > 20) {
            throw new Error("List button text must not exceed 20 characters");
        }
        if (!content.action?.sections || content.action.sections.length === 0) {
            throw new Error("List message must have at least one section");
        }
        if (content.action.sections.length > 10) {
            throw new Error("List message cannot have more than 10 sections");
        }
        let totalRows = 0;
        for (const section of content.action.sections) {
            if (section.title && section.title.length > 24) {
                throw new Error("Section title must not exceed 24 characters");
            }
            if (!section.rows || section.rows.length === 0) {
                throw new Error("Each section must have at least one row");
            }
            if (section.rows.length > 10) {
                throw new Error("Each section cannot have more than 10 rows");
            }
            totalRows += section.rows.length;
            for (const row of section.rows) {
                if (!row.id || !row.title) {
                    throw new Error("Each row must have an id and title");
                }
                if (row.id.length > 200) {
                    throw new Error("Row id must not exceed 200 characters");
                }
                if (row.title.length > 24) {
                    throw new Error("Row title must not exceed 24 characters");
                }
                if (row.description && row.description.length > 72) {
                    throw new Error("Row description must not exceed 72 characters");
                }
            }
        }
        if (totalRows > 10) {
            throw new Error("List message cannot have more than 10 total rows");
        }
        if (content.header?.type === "text" && content.header.text && content.header.text.length > 60) {
            throw new Error("Header text must not exceed 60 characters");
        }
        if (content.footer?.text && content.footer.text.length > 60) {
            throw new Error("Footer text must not exceed 60 characters");
        }
    }
    isButtonMessage() {
        return this.content.type === "button";
    }
    isListMessage() {
        return this.content.type === "list";
    }
    // Factory methods
    static createButtonMessage(to, body, buttons, options) {
        const content = {
            type: "button",
            body: { text: body },
            action: {
                buttons: buttons.map((b) => ({
                    type: "reply",
                    reply: { id: b.id, title: b.title },
                })),
            },
        };
        if (options?.header) {
            content.header = { type: "text", text: options.header };
        }
        if (options?.footer) {
            content.footer = { text: options.footer };
        }
        return new InteractiveMessage(to, content, options?.phoneNumberId);
    }
    static createListMessage(to, body, buttonText, sections, options) {
        const content = {
            type: "list",
            body: { text: body },
            action: {
                button: buttonText,
                sections: sections.map((s) => ({
                    title: s.title,
                    rows: s.rows.map((r) => ({
                        id: r.id,
                        title: r.title,
                        description: r.description,
                    })),
                })),
            },
        };
        if (options?.header) {
            content.header = { type: "text", text: options.header };
        }
        if (options?.footer) {
            content.footer = { text: options.footer };
        }
        return new InteractiveMessage(to, content, options?.phoneNumberId);
    }
    // Convertir a formato de WhatsApp API
    toWhatsAppPayload() {
        return {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.to,
            type: "interactive",
            interactive: this.content,
        };
    }
}
exports.InteractiveMessage = InteractiveMessage;
