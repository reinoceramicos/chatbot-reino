import { ChannelAdapter, ChannelFactory, ChannelType } from "../../domain/ports/channel.port";
import { WhatsAppCloudAdapter } from "./whatsapp-cloud.adapter";

/**
 * Channel factory implementation
 * Manages channel adapters for different messaging platforms
 */
export class DefaultChannelFactory implements ChannelFactory {
  private adapters: Map<ChannelType, ChannelAdapter> = new Map();

  constructor() {
    // Register WhatsApp adapter by default
    this.registerAdapter(new WhatsAppChannelAdapter());
  }

  /**
   * Register a channel adapter
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
  }

  /**
   * Get adapter for a specific channel
   */
  getAdapter(channelType: ChannelType): ChannelAdapter {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`);
    }
    return adapter;
  }

  /**
   * Get all available adapters
   */
  getAllAdapters(): ChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Check if a channel is supported
   */
  isSupported(channelType: ChannelType): boolean {
    return this.adapters.has(channelType);
  }
}

/**
 * WhatsApp channel adapter wrapper
 * Implements ChannelAdapter interface using the existing WhatsAppCloudAdapter
 */
class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channelType: ChannelType = "WHATSAPP";
  private whatsappAdapter: WhatsAppCloudAdapter;

  constructor() {
    this.whatsappAdapter = new WhatsAppCloudAdapter();
  }

  async send(message: any): Promise<{ messageId: string; recipientId: string }> {
    return this.whatsappAdapter.send(message);
  }

  parseWebhook(payload: any): any {
    // The existing webhook handlers already parse WhatsApp webhooks
    // This is a placeholder for when we need unified parsing
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages || [];
    const statuses = value?.statuses || [];

    return {
      channelType: "WHATSAPP" as ChannelType,
      isStatusUpdate: statuses.length > 0,
      messages: messages.map((msg: any) => ({
        channelType: "WHATSAPP" as ChannelType,
        channelMessageId: msg.id,
        senderId: msg.from,
        senderName: value?.contacts?.[0]?.profile?.name,
        type: msg.type,
        content: msg.text?.body || msg.interactive?.button_reply?.title,
        mediaId: msg.image?.id || msg.video?.id || msg.audio?.id || msg.document?.id,
        metadata: msg,
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
      })),
      statusUpdates: statuses.map((status: any) => ({
        channelType: "WHATSAPP" as ChannelType,
        messageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
        timestamp: new Date(parseInt(status.timestamp) * 1000),
        error: status.errors?.[0],
      })),
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implement signature verification using X-Hub-Signature-256
    const crypto = require("crypto");
    const { envConfig } = require("../../../shared/config/env.config");

    const expectedSignature = crypto
      .createHmac("sha256", envConfig.meta.appSecret)
      .update(payload)
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    // The existing WhatsApp client handles this
    const { whatsappClient } = require("../http/whatsapp.client");
    const response = await whatsappClient.getMediaUrl(mediaId);
    return response.url;
  }
}

// Singleton instance
let channelFactoryInstance: DefaultChannelFactory | null = null;

export function getChannelFactory(): DefaultChannelFactory {
  if (!channelFactoryInstance) {
    channelFactoryInstance = new DefaultChannelFactory();
  }
  return channelFactoryInstance;
}
