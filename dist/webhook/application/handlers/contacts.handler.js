"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class ContactsMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const contacts = message.content.contacts || [];
        this.log("CONTACTS_MESSAGE", {
            count: contacts.length,
            contacts: contacts.map((c) => ({
                name: c.name?.formatted_name,
                phones: c.phones?.map((p) => p.phone),
            })),
            from: message.sender.from,
        });
    }
}
exports.ContactsMessageHandler = ContactsMessageHandler;
