"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const send_text_use_case_1 = require("../send-text.use-case");
const createMockMessagingAdapter = () => ({
    send: jest.fn().mockResolvedValue({
        messageId: "wamid.123456",
        recipientId: "5491155556666",
    }),
});
describe("SendTextUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_text_use_case_1.SendTextUseCase(mockAdapter);
    });
    it("should send a text message", async () => {
        const result = await useCase.execute({
            to: "5491155556666",
            body: "Hello World",
        });
        expect(mockAdapter.send).toHaveBeenCalledTimes(1);
        expect(result.messageId).toBe("wamid.123456");
        expect(result.recipientId).toBe("5491155556666");
    });
    it("should create message with correct type", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Test message",
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.type).toBe("text");
        expect(calledMessage.to).toBe("5491155556666");
        expect(calledMessage.content.text?.body).toBe("Test message");
    });
    it("should pass previewUrl option", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Check this: https://example.com",
            previewUrl: true,
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.content.text?.previewUrl).toBe(true);
    });
    it("should pass phoneNumberId", async () => {
        await useCase.execute({
            to: "5491155556666",
            body: "Hello",
            phoneNumberId: "phone-123",
        });
        const calledMessage = mockAdapter.send.mock.calls[0][0];
        expect(calledMessage.phoneNumberId).toBe("phone-123");
    });
});
