import { SendContactsUseCase } from "../send-contacts.use-case";
import { MessagingPort, SendMessageResult } from "../../../domain/ports/messaging.port";
import { ContactInfo } from "../../../domain/entities/message.entity";

const createMockMessagingAdapter = (): jest.Mocked<MessagingPort> => ({
  send: jest.fn().mockResolvedValue({
    messageId: "wamid.123456",
    recipientId: "5491155556666",
  } as SendMessageResult),
});

describe("SendContactsUseCase", () => {
  let useCase: SendContactsUseCase;
  let mockAdapter: jest.Mocked<MessagingPort>;

  const sampleContact: ContactInfo = {
    name: {
      formattedName: "Juan Perez",
      firstName: "Juan",
      lastName: "Perez",
    },
    phones: [{ phone: "+5491155556666", type: "CELL" }],
    emails: [{ email: "juan@example.com", type: "WORK" }],
  };

  beforeEach(() => {
    mockAdapter = createMockMessagingAdapter();
    useCase = new SendContactsUseCase(mockAdapter);
  });

  it("should send a single contact", async () => {
    await useCase.execute({
      to: "5491155556666",
      contacts: [sampleContact],
    });

    expect(mockAdapter.send).toHaveBeenCalled();
    const message = mockAdapter.send.mock.calls[0][0];
    expect(message.type).toBe("contacts");
    expect(message.content.contacts).toHaveLength(1);
    expect(message.content.contacts?.[0].name.formattedName).toBe("Juan Perez");
  });

  it("should send multiple contacts", async () => {
    const contacts: ContactInfo[] = [
      { name: { formattedName: "Contact 1" } },
      { name: { formattedName: "Contact 2" } },
      { name: { formattedName: "Contact 3" } },
    ];

    await useCase.execute({
      to: "5491155556666",
      contacts,
    });

    const message = mockAdapter.send.mock.calls[0][0];
    expect(message.content.contacts).toHaveLength(3);
  });

  it("should throw error when contacts array is empty", async () => {
    await expect(
      useCase.execute({
        to: "5491155556666",
        contacts: [],
      })
    ).rejects.toThrow("At least one contact is required");
  });

  it("should throw error when contacts is undefined", async () => {
    await expect(
      useCase.execute({
        to: "5491155556666",
        contacts: undefined as any,
      })
    ).rejects.toThrow("At least one contact is required");
  });

  it("should include phoneNumberId when provided", async () => {
    await useCase.execute({
      to: "5491155556666",
      contacts: [sampleContact],
      phoneNumberId: "phone-123",
    });

    const message = mockAdapter.send.mock.calls[0][0];
    expect(message.phoneNumberId).toBe("phone-123");
  });
});
