"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const send_interactive_use_case_1 = require("../send-interactive.use-case");
const createMockMessagingAdapter = () => ({
    send: jest.fn().mockResolvedValue({
        messageId: "wamid.123456",
        recipientId: "5491155556666",
    }),
});
describe("SendButtonMessageUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_interactive_use_case_1.SendButtonMessageUseCase(mockAdapter);
    });
    it("should send a button message", async () => {
        const result = await useCase.execute({
            to: "5491155556666",
            body: "Choose an option:",
            buttons: [
                { id: "btn_1", title: "Option 1" },
                { id: "btn_2", title: "Option 2" },
            ],
        });
        expect(mockAdapter.send).toHaveBeenCalledTimes(1);
        expect(result.messageId).toBe("wamid.123456");
        expect(result.recipientId).toBe("5491155556666");
    });
    it("should create message with correct type and content", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Choose an option:",
            buttons: [
                { id: "btn_1", title: "Option 1" },
                { id: "btn_2", title: "Option 2" },
            ],
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.type).toBe("interactive");
        expect(calledMessage.to).toBe("5491155556666");
        expect(calledMessage.content.interactive?.type).toBe("button");
        expect(calledMessage.content.interactive?.body).toBe("Choose an option:");
        expect(calledMessage.content.interactive?.buttons).toHaveLength(2);
    });
    it("should include header and footer when provided", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Choose an option:",
            buttons: [{ id: "btn_1", title: "Option 1" }],
            header: "Welcome!",
            footer: "Reply to select",
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.content.interactive?.header).toBe("Welcome!");
        expect(calledMessage.content.interactive?.footer).toBe("Reply to select");
    });
    it("should pass phoneNumberId", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Choose:",
            buttons: [{ id: "btn_1", title: "Option 1" }],
            phoneNumberId: "phone-123",
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.phoneNumberId).toBe("phone-123");
    });
    it("should throw error for empty buttons array", () => {
        expect(() => useCase.execute({
            to: "5491155556666",
            body: "Choose:",
            buttons: [],
        })).rejects.toThrow("Button message must have between 1 and 3 buttons");
    });
    it("should throw error for more than 3 buttons", () => {
        expect(() => useCase.execute({
            to: "5491155556666",
            body: "Choose:",
            buttons: [
                { id: "btn_1", title: "Option 1" },
                { id: "btn_2", title: "Option 2" },
                { id: "btn_3", title: "Option 3" },
                { id: "btn_4", title: "Option 4" },
            ],
        })).rejects.toThrow("Button message must have between 1 and 3 buttons");
    });
});
describe("SendListMessageUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_interactive_use_case_1.SendListMessageUseCase(mockAdapter);
    });
    it("should send a list message", async () => {
        const result = await useCase.execute({
            to: "5491155556666",
            body: "Select a product:",
            buttonText: "Ver productos",
            sections: [
                {
                    title: "Cerámicos",
                    rows: [
                        { id: "cer_1", title: "Cerámico 30x30", description: "Piso interior" },
                        { id: "cer_2", title: "Cerámico 45x45", description: "Piso exterior" },
                    ],
                },
            ],
        });
        expect(mockAdapter.send).toHaveBeenCalledTimes(1);
        expect(result.messageId).toBe("wamid.123456");
        expect(result.recipientId).toBe("5491155556666");
    });
    it("should create message with correct type and content", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Select a product:",
            buttonText: "Ver productos",
            sections: [
                {
                    title: "Cerámicos",
                    rows: [{ id: "cer_1", title: "Cerámico 30x30" }],
                },
            ],
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.type).toBe("interactive");
        expect(calledMessage.to).toBe("5491155556666");
        expect(calledMessage.content.interactive?.type).toBe("list");
        expect(calledMessage.content.interactive?.body).toBe("Select a product:");
        expect(calledMessage.content.interactive?.buttonText).toBe("Ver productos");
        expect(calledMessage.content.interactive?.sections).toHaveLength(1);
    });
    it("should include header and footer when provided", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Select a product:",
            buttonText: "Ver",
            sections: [
                {
                    rows: [{ id: "item_1", title: "Item 1" }],
                },
            ],
            header: "Catálogo",
            footer: "Precios sin IVA",
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.content.interactive?.header).toBe("Catálogo");
        expect(calledMessage.content.interactive?.footer).toBe("Precios sin IVA");
    });
    it("should handle multiple sections", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Select:",
            buttonText: "Ver",
            sections: [
                {
                    title: "Section 1",
                    rows: [{ id: "item_1", title: "Item 1" }],
                },
                {
                    title: "Section 2",
                    rows: [{ id: "item_2", title: "Item 2" }],
                },
            ],
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.content.interactive?.sections).toHaveLength(2);
    });
    it("should throw error for empty sections array", () => {
        expect(() => useCase.execute({
            to: "5491155556666",
            body: "Select:",
            buttonText: "Ver",
            sections: [],
        })).rejects.toThrow("List message must have between 1 and 10 sections");
    });
    it("should throw error for more than 10 total rows", () => {
        const manyRows = Array.from({ length: 11 }, (_, i) => ({
            id: `item_${i}`,
            title: `Item ${i}`,
        }));
        expect(() => useCase.execute({
            to: "5491155556666",
            body: "Select:",
            buttonText: "Ver",
            sections: [{ rows: manyRows }],
        })).rejects.toThrow("List message must have between 1 and 10 total rows");
    });
});
