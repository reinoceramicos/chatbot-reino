export interface IWhatsAppWebhook {
  object: string;
  entry: IWhatsAppEntry[];
}

export interface IWhatsAppEntry {
  id: string;
  changes: IWhatsAppChange[];
}

export interface IWhatsAppChange {
  value: IWhatsAppValue;
  field: string;
}

export interface IWhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: IWhatsAppContact[];
  messages?: IWhatsAppMessage[];
  statuses?: any[]; // Pueden agregarse tipos para status updates
}

export interface IWhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IWhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: {
    body: string;
  };
  image?: IWhatsAppMedia;
  audio?: IWhatsAppMedia;
  voice?: IWhatsAppMedia;
  video?: IWhatsAppMedia;
  document?: IWhatsAppMedia;
  sticker?: IWhatsAppMedia;
  location?: IWhatsAppLocation;
  contacts?: any[]; // Definir estructura detallada si es necesario
  interactive?: IWhatsAppInteractive;
  button?: {
    text: string;
    payload: string;
  };
  reaction?: {
    message_id: string;
    emoji: string;
  };
  order?: {
    catalog_id: string;
    product_items: any[];
  };
  system?: {
    body: string;
    type: string;
  };
  errors?: any[];
}

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "voice"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "reaction"
  | "order"
  | "system"
  | "unsupported"
  | "unknown";

export interface IWhatsAppMedia {
  id: string;
  mime_type: string;
  sha256?: string;
  file_size?: number; // solo post-download o si Meta lo envía
  caption?: string;
  filename?: string; // documents
}

export interface IWhatsAppLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface IWhatsAppInteractive {
  type: string;
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description: string;
  };
}

export interface ISenderInfo {
  from: string;
  name: string;
  timestamp: string;
}

// ============================================
// Tipos para mensajes salientes (Bot -> Usuario)
// ============================================

export interface IBaseMessageParams {
  to: string;
  phoneNumberId?: string;
}

export interface ISendTextParams extends IBaseMessageParams {
  body: string;
  previewUrl?: boolean;
}

export interface ISendMediaParams extends IBaseMessageParams {
  caption?: string;
}

export interface ISendImageParams extends ISendMediaParams {
  imageUrl?: string;
  imageId?: string;
}

export interface ISendVideoParams extends ISendMediaParams {
  videoUrl?: string;
  videoId?: string;
}

export interface ISendAudioParams extends IBaseMessageParams {
  audioUrl?: string;
  audioId?: string;
}

export interface ISendDocumentParams extends ISendMediaParams {
  documentUrl?: string;
  documentId?: string;
  filename?: string;
}

export interface ISendStickerParams extends IBaseMessageParams {
  stickerUrl?: string;
  stickerId?: string;
}

export interface ISendLocationParams extends IBaseMessageParams {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface IContactInfo {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
    wa_id?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
}

export interface ISendContactParams extends IBaseMessageParams {
  contacts: IContactInfo[];
}

export interface ISendReactionParams extends IBaseMessageParams {
  messageId: string;
  emoji: string;
}

// Payloads para la API de WhatsApp
export interface IWhatsAppPayload {
  messaging_product: "whatsapp";
  to: string;
  type: string;
}

export interface ITextPayload extends IWhatsAppPayload {
  type: "text";
  text: {
    body: string;
    preview_url: boolean;
  };
}

export interface IMediaPayload extends IWhatsAppPayload {
  [key: string]: any;
}

export interface ILocationPayload extends IWhatsAppPayload {
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface IContactsPayload extends IWhatsAppPayload {
  type: "contacts";
  contacts: IContactInfo[];
}

export interface IReactionPayload extends IWhatsAppPayload {
  type: "reaction";
  reaction: {
    message_id: string;
    emoji: string;
  };
}
