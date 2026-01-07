import { MessageType } from "../../../shared/types";

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface MessageContent {
  text?: {
    body: string;
    previewUrl?: boolean;
  };
  media?: {
    url?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: ContactInfo[];
  reaction?: {
    messageId: string;
    emoji: string;
  };
  interactive?: {
    type: "button" | "list";
    body: string;
    header?: string;
    footer?: string;
    buttons?: InteractiveButton[];
    buttonText?: string;
    sections?: InteractiveListSection[];
  };
}

export interface ContactInfo {
  name: {
    formattedName: string;
    firstName?: string;
    lastName?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
    waId?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
}

export class Message {
  constructor(
    public readonly to: string,
    public readonly type: MessageType,
    public readonly content: MessageContent,
    public readonly phoneNumberId?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.to) {
      throw new Error("Recipient 'to' is required");
    }
    if (!this.type) {
      throw new Error("Message type is required");
    }
  }

  static createText(to: string, body: string, previewUrl = false, phoneNumberId?: string): Message {
    return new Message(to, "text", { text: { body, previewUrl } }, phoneNumberId);
  }

  static createImage(to: string, urlOrId: string, isId = false, caption?: string, phoneNumberId?: string): Message {
    return new Message(
      to,
      "image",
      { media: isId ? { id: urlOrId, caption } : { url: urlOrId, caption } },
      phoneNumberId
    );
  }

  static createVideo(to: string, urlOrId: string, isId = false, caption?: string, phoneNumberId?: string): Message {
    return new Message(
      to,
      "video",
      { media: isId ? { id: urlOrId, caption } : { url: urlOrId, caption } },
      phoneNumberId
    );
  }

  static createAudio(to: string, urlOrId: string, isId = false, phoneNumberId?: string): Message {
    return new Message(
      to,
      "audio",
      { media: isId ? { id: urlOrId } : { url: urlOrId } },
      phoneNumberId
    );
  }

  static createDocument(
    to: string,
    urlOrId: string,
    isId = false,
    caption?: string,
    filename?: string,
    phoneNumberId?: string
  ): Message {
    return new Message(
      to,
      "document",
      { media: isId ? { id: urlOrId, caption, filename } : { url: urlOrId, caption, filename } },
      phoneNumberId
    );
  }

  static createSticker(to: string, urlOrId: string, isId = false, phoneNumberId?: string): Message {
    return new Message(
      to,
      "sticker",
      { media: isId ? { id: urlOrId } : { url: urlOrId } },
      phoneNumberId
    );
  }

  static createLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    phoneNumberId?: string
  ): Message {
    return new Message(to, "location", { location: { latitude, longitude, name, address } }, phoneNumberId);
  }

  static createContacts(to: string, contacts: ContactInfo[], phoneNumberId?: string): Message {
    return new Message(to, "contacts", { contacts }, phoneNumberId);
  }

  static createReaction(to: string, messageId: string, emoji: string, phoneNumberId?: string): Message {
    return new Message(to, "reaction", { reaction: { messageId, emoji } }, phoneNumberId);
  }

  static createButtonMessage(
    to: string,
    body: string,
    buttons: InteractiveButton[],
    options?: {
      header?: string;
      footer?: string;
      phoneNumberId?: string;
    }
  ): Message {
    if (buttons.length === 0 || buttons.length > 3) {
      throw new Error("Button message must have between 1 and 3 buttons");
    }
    return new Message(
      to,
      "interactive",
      {
        interactive: {
          type: "button",
          body,
          header: options?.header,
          footer: options?.footer,
          buttons,
        },
      },
      options?.phoneNumberId
    );
  }

  static createListMessage(
    to: string,
    body: string,
    buttonText: string,
    sections: InteractiveListSection[],
    options?: {
      header?: string;
      footer?: string;
      phoneNumberId?: string;
    }
  ): Message {
    if (sections.length === 0 || sections.length > 10) {
      throw new Error("List message must have between 1 and 10 sections");
    }
    const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
    if (totalRows === 0 || totalRows > 10) {
      throw new Error("List message must have between 1 and 10 total rows");
    }
    return new Message(
      to,
      "interactive",
      {
        interactive: {
          type: "list",
          body,
          header: options?.header,
          footer: options?.footer,
          buttonText,
          sections,
        },
      },
      options?.phoneNumberId
    );
  }
}
