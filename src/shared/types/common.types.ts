export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "reaction";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
