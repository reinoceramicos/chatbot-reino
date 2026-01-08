"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const send_location_use_case_1 = require("../send-location.use-case");
const createMockMessagingAdapter = () => ({
    send: jest.fn().mockResolvedValue({
        messageId: "wamid.123456",
        recipientId: "5491155556666",
    }),
});
describe("SendLocationUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_location_use_case_1.SendLocationUseCase(mockAdapter);
    });
    it("should send location with coordinates only", async () => {
        const result = await useCase.execute({
            to: "5491155556666",
            latitude: -34.6037,
            longitude: -58.3816,
        });
        expect(mockAdapter.send).toHaveBeenCalled();
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("location");
        expect(message.content.location?.latitude).toBe(-34.6037);
        expect(message.content.location?.longitude).toBe(-58.3816);
    });
    it("should send location with name and address", async () => {
        await useCase.execute({
            to: "5491155556666",
            latitude: -34.6037,
            longitude: -58.3816,
            name: "Reino Ceramicos",
            address: "Av. Principal 1234, Buenos Aires",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.location?.name).toBe("Reino Ceramicos");
        expect(message.content.location?.address).toBe("Av. Principal 1234, Buenos Aires");
    });
    it("should include phoneNumberId when provided", async () => {
        await useCase.execute({
            to: "5491155556666",
            latitude: -34.6037,
            longitude: -58.3816,
            phoneNumberId: "phone-123",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.phoneNumberId).toBe("phone-123");
    });
});
