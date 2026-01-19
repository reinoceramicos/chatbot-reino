import { Message } from "../entities/message.entity";
import { SendMessageResult } from "./messaging.port";

/**
 * Supported messaging channels
 */
export type ChannelType = "WHATSAPP" | "INSTAGRAM";

/**
 * Incoming message from any channel
 */
export interface ChannelIncomingMessage {
  channelType: ChannelType;
  channelMessageId: string; // wa_id for WhatsApp, mid for Instagram
  senderId: string; // Phone number for WhatsApp, PSID for Instagram
  senderName?: string;
  type: "text" | "image" | "video" | "audio" | "document" | "location" | "contacts" | "interactive" | "sticker" | "reaction";
  content?: string;
  mediaId?: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Result of parsing a webhook payload
 */
export interface WebhookParseResult {
  channelType: ChannelType;
  isStatusUpdate: boolean;
  messages: ChannelIncomingMessage[];
  statusUpdates: ChannelStatusUpdate[];
}

/**
 * Status update from the channel (sent, delivered, read)
 */
export interface ChannelStatusUpdate {
  channelType: ChannelType;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string;
  timestamp: Date;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Channel adapter interface
 * Implement this for each messaging platform (WhatsApp, Instagram, etc.)
 */
export interface ChannelAdapter {
  /**
   * Channel identifier
   */
  readonly channelType: ChannelType;

  /**
   * Send a message through this channel
   */
  send(message: Message): Promise<SendMessageResult>;

  /**
   * Parse incoming webhook payload
   */
  parseWebhook(payload: any): WebhookParseResult;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Get media URL (for downloading media from the channel)
   */
  getMediaUrl(mediaId: string): Promise<string>;
}

/**
 * Channel factory for creating channel adapters
 */
export interface ChannelFactory {
  /**
   * Get adapter for a specific channel
   */
  getAdapter(channelType: ChannelType): ChannelAdapter;

  /**
   * Get all available adapters
   */
  getAllAdapters(): ChannelAdapter[];

  /**
   * Check if a channel is supported
   */
  isSupported(channelType: ChannelType): boolean;
}
