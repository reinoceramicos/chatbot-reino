"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const incoming_message_entity_1 = require("../incoming-message.entity");
describe("IncomingMessage Entity", () => {
    const defaultSender = {
        from: "5491155556666",
        name: "Test User",
        timestamp: "1234567890",
    };
    const defaultPhoneNumberId = "123456789";
    describe("constructor", () => {
        it("should create a text message", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.123", "text", defaultSender, defaultPhoneNumberId, { text: "Hello World" });
            expect(message.id).toBe("wamid.123");
            expect(message.type).toBe("text");
            expect(message.sender).toEqual(defaultSender);
            expect(message.phoneNumberId).toBe(defaultPhoneNumberId);
            expect(message.content.text).toBe("Hello World");
        });
        it("should create a media message", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.456", "image", defaultSender, defaultPhoneNumberId, {
                media: {
                    id: "media-123",
                    mimeType: "image/jpeg",
                    caption: "My photo",
                },
            });
            expect(message.type).toBe("image");
            expect(message.content.media?.id).toBe("media-123");
            expect(message.content.media?.mimeType).toBe("image/jpeg");
            expect(message.content.media?.caption).toBe("My photo");
        });
        it("should create a location message", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.789", "location", defaultSender, defaultPhoneNumberId, {
                location: {
                    latitude: -34.6037,
                    longitude: -58.3816,
                    name: "Buenos Aires",
                    address: "Argentina",
                },
            });
            expect(message.type).toBe("location");
            expect(message.content.location?.latitude).toBe(-34.6037);
            expect(message.content.location?.longitude).toBe(-58.3816);
        });
        it("should create an interactive message", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.int", "interactive", defaultSender, defaultPhoneNumberId, {
                interactive: {
                    type: "button_reply",
                    buttonReply: {
                        id: "btn-1",
                        title: "Yes",
                    },
                },
            });
            expect(message.type).toBe("interactive");
            expect(message.content.interactive?.type).toBe("button_reply");
            expect(message.content.interactive?.buttonReply?.title).toBe("Yes");
        });
        it("should create a reaction message", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.react", "reaction", defaultSender, defaultPhoneNumberId, {
                reaction: {
                    messageId: "wamid.original",
                    emoji: "👍",
                },
            });
            expect(message.type).toBe("reaction");
            expect(message.content.reaction?.messageId).toBe("wamid.original");
            expect(message.content.reaction?.emoji).toBe("👍");
        });
    });
    describe("isText", () => {
        it("should return true for text messages", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.1", "text", defaultSender, defaultPhoneNumberId, { text: "Hello" });
            expect(message.isText()).toBe(true);
        });
        it("should return false for non-text messages", () => {
            const types = [
                "image",
                "audio",
                "video",
                "location",
                "interactive",
            ];
            types.forEach((type) => {
                const message = new incoming_message_entity_1.IncomingMessage("wamid.1", type, defaultSender, defaultPhoneNumberId, {});
                expect(message.isText()).toBe(false);
            });
        });
    });
    describe("isMedia", () => {
        it("should return true for media message types", () => {
            const mediaTypes = [
                "image",
                "audio",
                "voice",
                "video",
                "document",
                "sticker",
            ];
            mediaTypes.forEach((type) => {
                const message = new incoming_message_entity_1.IncomingMessage("wamid.1", type, defaultSender, defaultPhoneNumberId, { media: { id: "123", mimeType: "image/jpeg" } });
                expect(message.isMedia()).toBe(true);
            });
        });
        it("should return false for non-media types", () => {
            const nonMediaTypes = [
                "text",
                "location",
                "contacts",
                "interactive",
                "reaction",
            ];
            nonMediaTypes.forEach((type) => {
                const message = new incoming_message_entity_1.IncomingMessage("wamid.1", type, defaultSender, defaultPhoneNumberId, {});
                expect(message.isMedia()).toBe(false);
            });
        });
    });
    describe("getText", () => {
        it("should return text content when present", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.1", "text", defaultSender, defaultPhoneNumberId, { text: "Hello World" });
            expect(message.getText()).toBe("Hello World");
        });
        it("should return empty string when text is undefined", () => {
            const message = new incoming_message_entity_1.IncomingMessage("wamid.1", "image", defaultSender, defaultPhoneNumberId, {});
            expect(message.getText()).toBe("");
        });
    });
});
