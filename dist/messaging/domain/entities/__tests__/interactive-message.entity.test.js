"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interactive_message_entity_1 = require("../interactive-message.entity");
describe("InteractiveMessage", () => {
    describe("Button Message", () => {
        it("should create a button message with factory method", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose an option:", [
                { id: "btn_1", title: "Option 1" },
                { id: "btn_2", title: "Option 2" },
            ]);
            expect(msg.to).toBe("5491155556666");
            expect(msg.content.type).toBe("button");
            expect(msg.content.body.text).toBe("Choose an option:");
            expect(msg.isButtonMessage()).toBe(true);
            expect(msg.isListMessage()).toBe(false);
        });
        it("should include header and footer when provided", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose:", [{ id: "btn_1", title: "Option 1" }], { header: "Welcome!", footer: "Select one" });
            expect(msg.content.header?.text).toBe("Welcome!");
            expect(msg.content.footer?.text).toBe("Select one");
        });
        it("should throw error for empty buttons", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose:", [])).toThrow("Button message must have at least one button");
        });
        it("should throw error for more than 3 buttons", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose:", [
                { id: "btn_1", title: "Option 1" },
                { id: "btn_2", title: "Option 2" },
                { id: "btn_3", title: "Option 3" },
                { id: "btn_4", title: "Option 4" },
            ])).toThrow("Button message cannot have more than 3 buttons");
        });
        it("should throw error for button title exceeding 20 chars", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose:", [
                { id: "btn_1", title: "This title is way too long for a button" },
            ])).toThrow("Button title must not exceed 20 characters");
        });
        it("should throw error for body text exceeding 1024 chars", () => {
            const longBody = "a".repeat(1025);
            expect(() => interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", longBody, [
                { id: "btn_1", title: "Option 1" },
            ])).toThrow("Button message body text must not exceed 1024 characters");
        });
        it("should throw error for missing recipient", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createButtonMessage("", "Choose:", [
                { id: "btn_1", title: "Option 1" },
            ])).toThrow("Recipient 'to' is required");
        });
    });
    describe("List Message", () => {
        it("should create a list message with factory method", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select a product:", "Ver productos", [
                {
                    title: "Cerámicos",
                    rows: [
                        { id: "cer_1", title: "Cerámico 30x30", description: "Piso interior" },
                        { id: "cer_2", title: "Cerámico 45x45" },
                    ],
                },
            ]);
            expect(msg.to).toBe("5491155556666");
            expect(msg.content.type).toBe("list");
            expect(msg.content.body.text).toBe("Select a product:");
            expect(msg.isListMessage()).toBe(true);
            expect(msg.isButtonMessage()).toBe(false);
        });
        it("should include header and footer when provided", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [{ rows: [{ id: "item_1", title: "Item 1" }] }], { header: "Catálogo", footer: "Precios sin IVA" });
            expect(msg.content.header?.text).toBe("Catálogo");
            expect(msg.content.footer?.text).toBe("Precios sin IVA");
        });
        it("should throw error for empty sections", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [])).toThrow("List message must have at least one section");
        });
        it("should throw error for more than 10 sections", () => {
            const sections = Array.from({ length: 11 }, (_, i) => ({
                title: `Section ${i}`,
                rows: [{ id: `item_${i}`, title: `Item ${i}` }],
            }));
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", sections)).toThrow("List message cannot have more than 10 sections");
        });
        it("should throw error for more than 10 rows per section", () => {
            const manyRows = Array.from({ length: 11 }, (_, i) => ({
                id: `item_${i}`,
                title: `Item ${i}`,
            }));
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [
                { rows: manyRows },
            ])).toThrow("Each section cannot have more than 10 rows");
        });
        it("should throw error for more than 10 total rows across sections", () => {
            const sections = [
                { title: "Section 1", rows: Array.from({ length: 6 }, (_, i) => ({ id: `s1_${i}`, title: `Item ${i}` })) },
                { title: "Section 2", rows: Array.from({ length: 6 }, (_, i) => ({ id: `s2_${i}`, title: `Item ${i}` })) },
            ];
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", sections)).toThrow("List message cannot have more than 10 total rows");
        });
        it("should throw error for row title exceeding 24 chars", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [
                { rows: [{ id: "item_1", title: "This row title is way too long" }] },
            ])).toThrow("Row title must not exceed 24 characters");
        });
        it("should throw error for row description exceeding 72 chars", () => {
            const longDescription = "a".repeat(73);
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [
                { rows: [{ id: "item_1", title: "Item 1", description: longDescription }] },
            ])).toThrow("Row description must not exceed 72 characters");
        });
        it("should throw error for button text exceeding 20 chars", () => {
            expect(() => interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "This button text is too long", [{ rows: [{ id: "item_1", title: "Item 1" }] }])).toThrow("List button text must not exceed 20 characters");
        });
    });
    describe("toWhatsAppPayload", () => {
        it("should generate correct payload for button message", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createButtonMessage("5491155556666", "Choose:", [{ id: "btn_1", title: "Option 1" }]);
            const payload = msg.toWhatsAppPayload();
            expect(payload.messaging_product).toBe("whatsapp");
            expect(payload.recipient_type).toBe("individual");
            expect(payload.to).toBe("5491155556666");
            expect(payload.type).toBe("interactive");
            expect(payload.interactive).toBeDefined();
        });
        it("should generate correct payload for list message", () => {
            const msg = interactive_message_entity_1.InteractiveMessage.createListMessage("5491155556666", "Select:", "Ver", [{ rows: [{ id: "item_1", title: "Item 1" }] }]);
            const payload = msg.toWhatsAppPayload();
            expect(payload.messaging_product).toBe("whatsapp");
            expect(payload.type).toBe("interactive");
            expect(payload.interactive).toBeDefined();
        });
    });
});
