"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const send_media_use_case_1 = require("../send-media.use-case");
const createMockMessagingAdapter = () => ({
    send: jest.fn().mockResolvedValue({
        messageId: "wamid.123456",
        recipientId: "5491155556666",
    }),
});
describe("SendImageUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_media_use_case_1.SendImageUseCase(mockAdapter);
    });
    it("should send image with URL", async () => {
        const result = await useCase.execute({
            to: "5491155556666",
            imageUrl: "https://example.com/image.jpg",
        });
        expect(mockAdapter.send).toHaveBeenCalled();
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("image");
        expect(message.content.media?.url).toBe("https://example.com/image.jpg");
    });
    it("should send image with ID", async () => {
        await useCase.execute({
            to: "5491155556666",
            imageId: "media-123",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.id).toBe("media-123");
    });
    it("should throw error when neither URL nor ID provided", async () => {
        await expect(useCase.execute({
            to: "5491155556666",
        })).rejects.toThrow("Either imageUrl or imageId is required");
    });
    it("should include caption when provided", async () => {
        await useCase.execute({
            to: "5491155556666",
            imageUrl: "https://example.com/image.jpg",
            caption: "Check this out!",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.caption).toBe("Check this out!");
    });
});
describe("SendVideoUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_media_use_case_1.SendVideoUseCase(mockAdapter);
    });
    it("should send video with URL", async () => {
        await useCase.execute({
            to: "5491155556666",
            videoUrl: "https://example.com/video.mp4",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("video");
        expect(message.content.media?.url).toBe("https://example.com/video.mp4");
    });
    it("should send video with ID", async () => {
        await useCase.execute({
            to: "5491155556666",
            videoId: "video-123",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.id).toBe("video-123");
    });
    it("should throw error when neither URL nor ID provided", async () => {
        await expect(useCase.execute({
            to: "5491155556666",
        })).rejects.toThrow("Either videoUrl or videoId is required");
    });
});
describe("SendAudioUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_media_use_case_1.SendAudioUseCase(mockAdapter);
    });
    it("should send audio with URL", async () => {
        await useCase.execute({
            to: "5491155556666",
            audioUrl: "https://example.com/audio.ogg",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("audio");
        expect(message.content.media?.url).toBe("https://example.com/audio.ogg");
    });
    it("should send audio with ID", async () => {
        await useCase.execute({
            to: "5491155556666",
            audioId: "audio-123",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.id).toBe("audio-123");
    });
    it("should throw error when neither URL nor ID provided", async () => {
        await expect(useCase.execute({
            to: "5491155556666",
        })).rejects.toThrow("Either audioUrl or audioId is required");
    });
});
describe("SendDocumentUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_media_use_case_1.SendDocumentUseCase(mockAdapter);
    });
    it("should send document with URL", async () => {
        await useCase.execute({
            to: "5491155556666",
            documentUrl: "https://example.com/file.pdf",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("document");
        expect(message.content.media?.url).toBe("https://example.com/file.pdf");
    });
    it("should send document with ID, caption and filename", async () => {
        await useCase.execute({
            to: "5491155556666",
            documentId: "doc-123",
            caption: "Price list 2024",
            filename: "precios.pdf",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.id).toBe("doc-123");
        expect(message.content.media?.caption).toBe("Price list 2024");
        expect(message.content.media?.filename).toBe("precios.pdf");
    });
    it("should throw error when neither URL nor ID provided", async () => {
        await expect(useCase.execute({
            to: "5491155556666",
        })).rejects.toThrow("Either documentUrl or documentId is required");
    });
});
describe("SendStickerUseCase", () => {
    let useCase;
    let mockAdapter;
    beforeEach(() => {
        mockAdapter = createMockMessagingAdapter();
        useCase = new send_media_use_case_1.SendStickerUseCase(mockAdapter);
    });
    it("should send sticker with URL", async () => {
        await useCase.execute({
            to: "5491155556666",
            stickerUrl: "https://example.com/sticker.webp",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.type).toBe("sticker");
        expect(message.content.media?.url).toBe("https://example.com/sticker.webp");
    });
    it("should send sticker with ID", async () => {
        await useCase.execute({
            to: "5491155556666",
            stickerId: "sticker-123",
        });
        const message = mockAdapter.send.mock.calls[0][0];
        expect(message.content.media?.id).toBe("sticker-123");
    });
    it("should throw error when neither URL nor ID provided", async () => {
        await expect(useCase.execute({
            to: "5491155556666",
        })).rejects.toThrow("Either stickerUrl or stickerId is required");
    });
});
