import { Message, ContactInfo } from "../message.entity";

describe("Message Entity", () => {
  describe("constructor validation", () => {
    it("should throw error when 'to' is missing", () => {
      expect(() => {
        new Message("", "text", { text: { body: "test" } });
      }).toThrow("Recipient 'to' is required");
    });

    it("should throw error when type is missing", () => {
      expect(() => {
        new Message("5491155556666", "" as any, { text: { body: "test" } });
      }).toThrow("Message type is required");
    });

    it("should create message with valid parameters", () => {
      const message = new Message("5491155556666", "text", { text: { body: "Hello" } });

      expect(message.to).toBe("5491155556666");
      expect(message.type).toBe("text");
      expect(message.content.text?.body).toBe("Hello");
    });
  });

  describe("createText", () => {
    it("should create text message with body only", () => {
      const message = Message.createText("5491155556666", "Hello World");

      expect(message.to).toBe("5491155556666");
      expect(message.type).toBe("text");
      expect(message.content.text?.body).toBe("Hello World");
      expect(message.content.text?.previewUrl).toBe(false);
    });

    it("should create text message with preview URL enabled", () => {
      const message = Message.createText("5491155556666", "Check this: https://example.com", true);

      expect(message.content.text?.previewUrl).toBe(true);
    });

    it("should create text message with phoneNumberId", () => {
      const message = Message.createText("5491155556666", "Hello", false, "123456789");

      expect(message.phoneNumberId).toBe("123456789");
    });
  });

  describe("createImage", () => {
    it("should create image message with URL", () => {
      const message = Message.createImage("5491155556666", "https://example.com/image.jpg");

      expect(message.type).toBe("image");
      expect(message.content.media?.url).toBe("https://example.com/image.jpg");
      expect(message.content.media?.id).toBeUndefined();
    });

    it("should create image message with ID", () => {
      const message = Message.createImage("5491155556666", "media-id-123", true);

      expect(message.content.media?.id).toBe("media-id-123");
      expect(message.content.media?.url).toBeUndefined();
    });

    it("should create image message with caption", () => {
      const message = Message.createImage("5491155556666", "https://example.com/image.jpg", false, "My photo");

      expect(message.content.media?.caption).toBe("My photo");
    });
  });

  describe("createVideo", () => {
    it("should create video message with URL", () => {
      const message = Message.createVideo("5491155556666", "https://example.com/video.mp4");

      expect(message.type).toBe("video");
      expect(message.content.media?.url).toBe("https://example.com/video.mp4");
    });

    it("should create video message with ID and caption", () => {
      const message = Message.createVideo("5491155556666", "video-id", true, "Check this video");

      expect(message.content.media?.id).toBe("video-id");
      expect(message.content.media?.caption).toBe("Check this video");
    });
  });

  describe("createAudio", () => {
    it("should create audio message with URL", () => {
      const message = Message.createAudio("5491155556666", "https://example.com/audio.ogg");

      expect(message.type).toBe("audio");
      expect(message.content.media?.url).toBe("https://example.com/audio.ogg");
    });

    it("should create audio message with ID", () => {
      const message = Message.createAudio("5491155556666", "audio-id", true);

      expect(message.content.media?.id).toBe("audio-id");
    });
  });

  describe("createDocument", () => {
    it("should create document message with URL", () => {
      const message = Message.createDocument("5491155556666", "https://example.com/doc.pdf");

      expect(message.type).toBe("document");
      expect(message.content.media?.url).toBe("https://example.com/doc.pdf");
    });

    it("should create document message with caption and filename", () => {
      const message = Message.createDocument(
        "5491155556666",
        "https://example.com/doc.pdf",
        false,
        "Price list",
        "precios.pdf"
      );

      expect(message.content.media?.caption).toBe("Price list");
      expect(message.content.media?.filename).toBe("precios.pdf");
    });
  });

  describe("createSticker", () => {
    it("should create sticker message with URL", () => {
      const message = Message.createSticker("5491155556666", "https://example.com/sticker.webp");

      expect(message.type).toBe("sticker");
      expect(message.content.media?.url).toBe("https://example.com/sticker.webp");
    });

    it("should create sticker message with ID", () => {
      const message = Message.createSticker("5491155556666", "sticker-id", true);

      expect(message.content.media?.id).toBe("sticker-id");
    });
  });

  describe("createLocation", () => {
    it("should create location message with coordinates only", () => {
      const message = Message.createLocation("5491155556666", -34.6037, -58.3816);

      expect(message.type).toBe("location");
      expect(message.content.location?.latitude).toBe(-34.6037);
      expect(message.content.location?.longitude).toBe(-58.3816);
    });

    it("should create location message with name and address", () => {
      const message = Message.createLocation(
        "5491155556666",
        -34.6037,
        -58.3816,
        "Reino Ceramicos",
        "Av. Principal 1234"
      );

      expect(message.content.location?.name).toBe("Reino Ceramicos");
      expect(message.content.location?.address).toBe("Av. Principal 1234");
    });
  });

  describe("createContacts", () => {
    it("should create contacts message", () => {
      const contacts: ContactInfo[] = [
        {
          name: {
            formattedName: "Juan Perez",
            firstName: "Juan",
            lastName: "Perez",
          },
          phones: [{ phone: "+5491155556666", type: "CELL" }],
        },
      ];

      const message = Message.createContacts("5491155556666", contacts);

      expect(message.type).toBe("contacts");
      expect(message.content.contacts).toHaveLength(1);
      expect(message.content.contacts?.[0].name.formattedName).toBe("Juan Perez");
    });

    it("should create contacts message with multiple contacts", () => {
      const contacts: ContactInfo[] = [
        { name: { formattedName: "Contact 1" } },
        { name: { formattedName: "Contact 2" } },
      ];

      const message = Message.createContacts("5491155556666", contacts);

      expect(message.content.contacts).toHaveLength(2);
    });
  });

  describe("createReaction", () => {
    it("should create reaction message", () => {
      const message = Message.createReaction("5491155556666", "wamid.original123", "👍");

      expect(message.type).toBe("reaction");
      expect(message.content.reaction?.messageId).toBe("wamid.original123");
      expect(message.content.reaction?.emoji).toBe("👍");
    });
  });
});
