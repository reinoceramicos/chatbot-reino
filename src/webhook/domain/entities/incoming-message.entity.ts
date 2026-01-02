export type IncomingMessageType =
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

export interface MediaContent {
  id: string;
  mimeType: string;
  sha256?: string;
  fileSize?: number;
  caption?: string;
  filename?: string;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface InteractiveContent {
  type: string;
  buttonReply?: {
    id: string;
    title: string;
  };
  listReply?: {
    id: string;
    title: string;
    description: string;
  };
}

export interface ReactionContent {
  messageId: string;
  emoji: string;
}

export interface SenderInfo {
  from: string;
  name: string;
  timestamp: string;
}

export class IncomingMessage {
  constructor(
    public readonly id: string,
    public readonly type: IncomingMessageType,
    public readonly sender: SenderInfo,
    public readonly phoneNumberId: string,
    public readonly content: {
      text?: string;
      media?: MediaContent;
      location?: LocationContent;
      contacts?: any[];
      interactive?: InteractiveContent;
      button?: { text: string; payload: string };
      reaction?: ReactionContent;
      order?: { catalogId: string; productItems: any[] };
      system?: { body: string; type: string };
      errors?: any[];
    }
  ) {}

  isText(): boolean {
    return this.type === "text";
  }

  isMedia(): boolean {
    return ["image", "audio", "voice", "video", "document", "sticker"].includes(this.type);
  }

  getText(): string {
    return this.content.text || "";
  }
}
