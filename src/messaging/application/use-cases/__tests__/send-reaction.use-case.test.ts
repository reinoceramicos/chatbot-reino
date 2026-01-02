import { SendReactionUseCase } from "../send-reaction.use-case";
import { MessagingPort, SendMessageResult } from "../../../domain/ports/messaging.port";

const createMockMessagingAdapter = (): jest.Mocked<MessagingPort> => ({
  send: jest.fn().mockResolvedValue({
    messageId: "wamid.123456",
    recipientId: "5491155556666",
  } as SendMessageResult),
});

describe("SendReactionUseCase", () => {
  let useCase: SendReactionUseCase;
  let mockAdapter: jest.Mocked<MessagingPort>;

  beforeEach(() => {
    mockAdapter = createMockMessagingAdapter();
    useCase = new SendReactionUseCase(mockAdapter);
  });

  it("should send a reaction to a message", async () => {
    const result = await useCase.execute({
      to: "5491155556666",
      messageId: "wamid.original-message-123",
      emoji: "👍",
    });

    expect(mockAdapter.send).toHaveBeenCalled();
    expect(result.messageId).toBe("wamid.123456");
  });

  it("should create reaction message with correct structure", async () => {
    await useCase.execute({
      to: "5491155556666",
      messageId: "wamid.original-123",
      emoji: "❤️",
    });

    const message = mockAdapter.send.mock.calls[0][0];
    expect(message.type).toBe("reaction");
    expect(message.content.reaction?.messageId).toBe("wamid.original-123");
    expect(message.content.reaction?.emoji).toBe("❤️");
  });

  it("should support various emojis", async () => {
    const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    for (const emoji of emojis) {
      mockAdapter.send.mockClear();

      await useCase.execute({
        to: "5491155556666",
        messageId: "wamid.test",
        emoji,
      });

      const message = mockAdapter.send.mock.calls[0][0];
      expect(message.content.reaction?.emoji).toBe(emoji);
    }
  });

  it("should include phoneNumberId when provided", async () => {
    await useCase.execute({
      to: "5491155556666",
      messageId: "wamid.test",
      emoji: "👍",
      phoneNumberId: "phone-123",
    });

    const message = mockAdapter.send.mock.calls[0][0];
    expect(message.phoneNumberId).toBe("phone-123");
  });
});
