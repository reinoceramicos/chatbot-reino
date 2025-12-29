import { IWhatsAppMessage, ISenderInfo } from "../types/whatsapp.types";

export const log = (label: string, payload: any) => {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${label}`, payload);
};

export async function handleTextMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const text = msg.text?.body || "";
  log("TEXT_MESSAGE", { text, from: senderInfo.from });
  // Tu logica aqui
}

export async function handleMediaMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo,
  mediaType: "image" | "audio" | "video" | "document" | "sticker"
) {
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

export async function handleLocationMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const location = msg.location;

  log("LOCATION_MESSAGE", {
    latitude: location?.latitude,
    longitude: location?.longitude,
    name: location?.name,
    address: location?.address,
    from: senderInfo.from,
  });
}

export async function handleContactsMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const contacts = msg.contacts || [];

  log("CONTACTS_MESSAGE", {
    count: contacts.length,
    contacts: contacts.map((c: any) => ({
      name: c.name?.formatted_name,
      phones: c.phones?.map((p: any) => p.phone),
    })),
    from: senderInfo.from,
  });
}

export async function handleInteractiveMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
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

export async function handleButtonReply(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const button = msg.button;

  log("BUTTON_REPLY", {
    text: button?.text,
    payload: button?.payload,
    from: senderInfo.from,
  });
}

export async function handleReaction(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const reaction = msg.reaction;

  log("REACTION", {
    messageId: reaction?.message_id,
    emoji: reaction?.emoji,
    from: senderInfo.from,
  });
}

export async function handleOrderMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  const order = msg.order;

  log("ORDER_MESSAGE", {
    catalogId: order?.catalog_id,
    productItems: order?.product_items,
    from: senderInfo.from,
  });
}

export async function handleSystemMessage(
  msg: IWhatsAppMessage,
  senderInfo: ISenderInfo
) {
  log("SYSTEM_MESSAGE", {
    body: msg.system?.body,
    type: msg.system?.type,
    from: senderInfo.from,
  });
}

// Utilidades
export async function isDuplicate(messageId: string): Promise<boolean> {
  // Implementar logica de cache/DB para evitar duplicados
  // Meta puede enviar el mismo webhook multiples veces
  return false;
}

export async function markAsRead(messageId: string, phoneNumberId: string) {
  // Implementar llamada a la API de WhatsApp para marcar como leido
  // POST /${phoneNumberId}/messages
  // { messaging_product: "whatsapp", status: "read", message_id: messageId }
  return;
}
