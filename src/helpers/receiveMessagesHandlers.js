const log = (label, payload) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${label}`, payload);
};

async function handleTextMessage(msg, senderInfo) {
  const text = msg.text?.body || "";
  log("TEXT_MESSAGE", { text, from: senderInfo.from });
  // Tu logica aqui
}

async function handleMediaMessage(msg, senderInfo, mediaType) {
  const media = msg[mediaType];

  log("MEDIA_MESSAGE", {
    type: mediaType,
    mediaId: media?.id,
    mimeType: media?.mime_type,
    caption: media?.caption,
    filename: media?.filename,
    from: senderInfo.from,
  });

  if (media?.id) {
    // await downloadMedia(media.id);
  }
}

async function handleLocationMessage(msg, senderInfo) {
  const location = msg.location;

  log("LOCATION_MESSAGE", {
    latitude: location?.latitude,
    longitude: location?.longitude,
    name: location?.name,
    address: location?.address,
    from: senderInfo.from,
  });
}

async function handleContactsMessage(msg, senderInfo) {
  const contacts = msg.contacts || [];

  log("CONTACTS_MESSAGE", {
    count: contacts.length,
    contacts: contacts.map((c) => ({
      name: c.name?.formatted_name,
      phones: c.phones?.map((p) => p.phone),
    })),
    from: senderInfo.from,
  });
}

async function handleInteractiveMessage(msg, senderInfo) {
  const interactive = msg.interactive;

  log("INTERACTIVE_MESSAGE", {
    type: interactive?.type,
    buttonId: interactive?.button_reply?.id,
    buttonText: interactive?.button_reply?.title,
    listId: interactive?.list_reply?.id,
    listTitle: interactive?.list_reply?.title,
    listDescription: interactive?.list_reply?.description,
    from: senderInfo.from,
  });
}

async function handleButtonReply(msg, senderInfo) {
  const button = msg.button;

  log("BUTTON_REPLY", {
    text: button?.text,
    payload: button?.payload,
    from: senderInfo.from,
  });
}

async function handleReaction(msg, senderInfo) {
  const reaction = msg.reaction;

  log("REACTION", {
    messageId: reaction?.message_id,
    emoji: reaction?.emoji,
    from: senderInfo.from,
  });
}

async function handleOrderMessage(msg, senderInfo) {
  const order = msg.order;

  log("ORDER_MESSAGE", {
    catalogId: order?.catalog_id,
    productItems: order?.product_items,
    from: senderInfo.from,
  });
}

async function handleSystemMessage(msg, senderInfo) {
  log("SYSTEM_MESSAGE", {
    body: msg.system?.body,
    type: msg.system?.type,
    from: senderInfo.from,
  });
}

// Utilidades
async function isDuplicate(messageId) {
  // Implementar logica de cache/DB para evitar duplicados
  // Meta puede enviar el mismo webhook multiples veces
  return false;
}

async function markAsRead(messageId, phoneNumberId) {
  // Implementar llamada a la API de WhatsApp para marcar como leido
  // POST /${phoneNumberId}/messages
  // { messaging_product: "whatsapp", status: "read", message_id: messageId }
  return;
}

module.exports = {
  log,
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
};
