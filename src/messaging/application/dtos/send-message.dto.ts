import { ContactInfo } from "../../domain/entities/message.entity";

export interface SendTextDto {
  to: string;
  body: string;
  previewUrl?: boolean;
  phoneNumberId?: string;
}

export interface SendImageDto {
  to: string;
  imageUrl?: string;
  imageId?: string;
  caption?: string;
  phoneNumberId?: string;
}

export interface SendVideoDto {
  to: string;
  videoUrl?: string;
  videoId?: string;
  caption?: string;
  phoneNumberId?: string;
}

export interface SendAudioDto {
  to: string;
  audioUrl?: string;
  audioId?: string;
  phoneNumberId?: string;
}

export interface SendDocumentDto {
  to: string;
  documentUrl?: string;
  documentId?: string;
  caption?: string;
  filename?: string;
  phoneNumberId?: string;
}

export interface SendStickerDto {
  to: string;
  stickerUrl?: string;
  stickerId?: string;
  phoneNumberId?: string;
}

export interface SendLocationDto {
  to: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  phoneNumberId?: string;
}

export interface SendContactsDto {
  to: string;
  contacts: ContactInfo[];
  phoneNumberId?: string;
}

export interface SendReactionDto {
  to: string;
  messageId: string;
  emoji: string;
  phoneNumberId?: string;
}

export interface SendButtonMessageDto {
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
  header?: string;
  footer?: string;
  phoneNumberId?: string;
}

export interface SendListMessageDto {
  to: string;
  body: string;
  buttonText: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  header?: string;
  footer?: string;
  phoneNumberId?: string;
}
