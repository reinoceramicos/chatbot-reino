function normalizeWhatsAppMessages(value) {
  if (!value?.messages) return [];

  return value.messages.map((msg) => {
    const base = {
      from: msg.from,
      timestamp: Number(msg.timestamp),
    };

    switch (msg.type) {
      case "text":
        return {
          ...base,
          type: "text",
          payload: msg.text.body,
        };

      case "button":
        return {
          ...base,
          type: "button",
          payload: {
            id: msg.button.payload,
            text: msg.button.text,
          },
        };

      case "interactive":
        if (msg.interactive.type === "button_reply") {
          return {
            ...base,
            type: "button",
            payload: {
              id: msg.interactive.button_reply.id,
              text: msg.interactive.button_reply.title,
            },
          };
        }

        if (msg.interactive.type === "list_reply") {
          return {
            ...base,
            type: "list",
            payload: {
              id: msg.interactive.list_reply.id,
              text: msg.interactive.list_reply.title,
            },
          };
        }

        return {
          ...base,
          type: "interactive",
          payload: msg.interactive,
        };

      case "image":
      case "video":
      case "audio":
      case "document":
        return {
          ...base,
          type: "media",
          payload: msg[msg.type], // image / video / audio / document
        };

      case "location":
        return {
          ...base,
          type: "location",
          payload: msg.location,
        };

      default:
        return {
          ...base,
          type: "unknown",
          payload: msg,
        };
    }
  });
}

module.exports = { normalizeWhatsAppMessages };
