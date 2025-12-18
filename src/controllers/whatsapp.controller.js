const {
  handleTextMessage,
  handleMediaMessage,
  handleLocationMessage,
  handleContactsMessage,
  handleInteractiveMessage,
  handleButtonReply,
  handleReaction,
  handleOrderMessage,
  handleSystemMessage,
  isDuplicate,
  markAsRead,
} = require("../helpers/receiveMessagesHandlers");

// Logger sencillo: todo a consola
const log = (label, payload) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${label}`, payload);
};

const verifyToken = (req, res) => {
  if (req.method !== "GET") return res.sendStatus(405);

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = req.query || {};

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    log("WEBHOOK_VERIFIED", { mode, token });
    return res.status(200).send(challenge);
  }

  log("WEBHOOK_VERIFY_FAIL", { mode, token, expected: VERIFY_TOKEN });
  return res.sendStatus(403);
};

const receiveMessage = async (req, res) => {
  // Responder rapido a Meta (20s)
  res.status(200).send("EVENT_RECEIVED");

  try {
    const entry = Array.isArray(req.body?.entry) ? req.body.entry[0] : null;
    const changes =
      entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
    const value = changes?.value;

    if (!value || !Array.isArray(value.messages)) {
      log("NO_MESSAGES", {
        field: changes?.field,
        hasStatuses: !!value?.statuses,
        hasContacts: !!value?.contacts,
      });
      return;
    }

    log("WEBHOOK_EVENT", {
      entryId: entry?.id,
      field: changes?.field,
      messagesCount: value.messages.length,
    });

    const metadata = value.metadata || {};
    const contacts = value.contacts || [];
    const messages = value.messages;

    for (const msg of messages) {
      // Evitar procesar mensajes duplicados o ya procesados
      if (await isDuplicate(msg?.id)) {
        log("DUPLICATE_MESSAGE", msg?.id);
        continue;
      }

      const contact = contacts.find((c) => c.wa_id === msg.from);
      const senderInfo = {
        from: msg.from,
        name: contact?.profile?.name || "Unknown",
        timestamp: msg.timestamp,
      };

      log("RECEIVED_MESSAGE", {
        id: msg.id,
        type: msg.type,
        from: senderInfo,
      });

      try {
        switch (msg.type) {
          case "text":
            await handleTextMessage(msg, senderInfo);
            break;
          case "image":
            await handleMediaMessage(msg, senderInfo, "image");
            break;
          case "audio":
          case "voice":
            await handleMediaMessage(msg, senderInfo, "audio");
            break;
          case "video":
            await handleMediaMessage(msg, senderInfo, "video");
            break;
          case "document":
            await handleMediaMessage(msg, senderInfo, "document");
            break;
          case "sticker":
            await handleMediaMessage(msg, senderInfo, "sticker");
            break;
          case "location":
            await handleLocationMessage(msg, senderInfo);
            break;
          case "contacts":
            await handleContactsMessage(msg, senderInfo);
            break;
          case "interactive":
            await handleInteractiveMessage(msg, senderInfo);
            break;
          case "button":
            await handleButtonReply(msg, senderInfo);
            break;
          case "reaction":
            await handleReaction(msg, senderInfo);
            break;
          case "order":
            await handleOrderMessage(msg, senderInfo);
            break;
          case "system":
            await handleSystemMessage(msg, senderInfo);
            break;
          case "unsupported":
            log("UNSUPPORTED_MESSAGE", { id: msg.id, errors: msg.errors });
            break;
          default:
            log("UNKNOWN_MESSAGE_TYPE", { type: msg.type, id: msg.id });
        }
      } catch (handlerErr) {
        log("HANDLER_ERROR", {
          id: msg.id,
          type: msg.type,
          error: handlerErr.message,
        });
      }

      if (metadata.phone_number_id) {
        try {
          await markAsRead(msg.id, metadata.phone_number_id);
          log("MARK_AS_READ", { id: msg.id, phoneNumberId: metadata.phone_number_id });
        } catch (markErr) {
          log("MARK_AS_READ_ERROR", { id: msg.id, error: markErr.message });
        }
      } else {
        log("MARK_AS_READ_SKIPPED", {
          id: msg.id,
          reason: "missing phone_number_id",
        });
      }
    }
  } catch (err) {
    log("WEBHOOK_ERROR", {
      message: err.message,
      stack: err.stack,
      body: req.body,
    });
  }
};

module.exports = {
  verifyToken,
  receiveMessage,
};
