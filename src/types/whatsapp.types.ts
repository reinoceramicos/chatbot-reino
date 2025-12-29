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
