import { WebhookService, WhatsAppWebhookPayload } from "../webhook.service";

describe("WebhookService", () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService();
    // Silenciar logs durante tests
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createWebhookPayload = (
    messages: any[] = [],
    contacts: any[] = []
  ): WhatsAppWebhookPayload => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-123",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551234567",
                phone_number_id: "123456789",
              },
              contacts,
              messages,
            },
            field: "messages",
          },
        ],
      },
    ],
  });

  describe("processWebhook", () => {
    it("should return empty array when no messages", async () => {
      const payload = createWebhookPayload([]);

      const result = await service.processWebhook(payload);

      expect(result).toEqual([]);
    });

    it("should process a text message", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.123",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "text",
            text: { body: "Hello World" },
          },
        ],
        [
          {
            wa_id: "5491155556666",
            profile: { name: "Test User" },
          },
        ]
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("wamid.123");
      expect(result[0].type).toBe("text");
      expect(result[0].content.text).toBe("Hello World");
      expect(result[0].sender.name).toBe("Test User");
    });

    it("should process an image message", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.456",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "image",
            image: {
              id: "media-123",
              mime_type: "image/jpeg",
              caption: "My photo",
            },
          },
        ],
        [{ wa_id: "5491155556666", profile: { name: "Test" } }]
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("image");
      expect(result[0].content.media?.id).toBe("media-123");
      expect(result[0].content.media?.mimeType).toBe("image/jpeg");
      expect(result[0].content.media?.caption).toBe("My photo");
    });

    it("should process a location message", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.789",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "location",
            location: {
              latitude: -34.6037,
              longitude: -58.3816,
              name: "Buenos Aires",
              address: "Argentina",
            },
          },
        ],
        []
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("location");
      expect(result[0].content.location?.latitude).toBe(-34.6037);
    });

    it("should process an interactive button reply", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.int",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "interactive",
            interactive: {
              type: "button_reply",
              button_reply: {
                id: "btn-yes",
                title: "Yes",
              },
            },
          },
        ],
        []
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("interactive");
      expect(result[0].content.interactive?.buttonReply?.id).toBe("btn-yes");
    });

    it("should process a reaction message", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.react",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "reaction",
            reaction: {
              message_id: "wamid.original",
              emoji: "👍",
            },
          },
        ],
        []
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("reaction");
      expect(result[0].content.reaction?.emoji).toBe("👍");
    });

    it("should set sender name as Unknown when contact not found", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.123",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "text",
            text: { body: "Hello" },
          },
        ],
        [] // No contacts
      );

      const result = await service.processWebhook(payload);

      expect(result[0].sender.name).toBe("Unknown");
    });

    it("should process multiple messages", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.1",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "text",
            text: { body: "Message 1" },
          },
          {
            id: "wamid.2",
            from: "5491155556666",
            timestamp: "1234567891",
            type: "text",
            text: { body: "Message 2" },
          },
        ],
        []
      );

      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(2);
    });

    it("should skip duplicate messages", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.dup",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "text",
            text: { body: "Hello" },
          },
        ],
        []
      );

      // Process first time
      await service.processWebhook(payload);
      // Process same message again
      const result = await service.processWebhook(payload);

      expect(result).toHaveLength(0);
    });

    it("should include phoneNumberId in processed message", async () => {
      const payload = createWebhookPayload(
        [
          {
            id: "wamid.123",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "text",
            text: { body: "Hello" },
          },
        ],
        []
      );

      const result = await service.processWebhook(payload);

      expect(result[0].phoneNumberId).toBe("123456789");
    });
  });

  describe("registerHandler", () => {
    it("should allow registering custom handlers", async () => {
      const customHandler = {
        handle: jest.fn().mockResolvedValue(undefined),
      };

      service.registerHandler("custom_type", customHandler);

      const payload = createWebhookPayload(
        [
          {
            id: "wamid.custom",
            from: "5491155556666",
            timestamp: "1234567890",
            type: "custom_type",
          },
        ],
        []
      );

      await service.processWebhook(payload);

      expect(customHandler.handle).toHaveBeenCalled();
    });
  });

  describe("status updates handling", () => {
    it("should return empty array for status updates", async () => {
      const payload: WhatsAppWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "entry-123",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "15551234567",
                    phone_number_id: "123456789",
                  },
                  statuses: [
                    {
                      id: "wamid.123",
                      status: "delivered",
                      timestamp: "1234567890",
                      recipient_id: "5491155556666",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };

      const result = await service.processWebhook(payload);

      expect(result).toEqual([]);
    });
  });
});
