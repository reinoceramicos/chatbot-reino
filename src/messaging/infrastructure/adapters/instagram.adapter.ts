/**
 * Instagram Messenger API Adapter
 *
 * This is a placeholder for future Instagram integration.
 * Instagram Messenger API uses different endpoints and formats than WhatsApp.
 *
 * Key differences from WhatsApp:
 * - Endpoint: POST /me/messages (vs /{phone_id}/messages)
 * - Webhook object: "instagram" (vs "whatsapp_business_account")
 * - Sender ID: PSID (Page-Scoped ID) instead of wa_id (phone number)
 * - Message IDs: "mid" format instead of "wamid"
 *
 * Requirements:
 * - Instagram Business account
 * - Facebook Page linked to Instagram account
 * - Meta Business Manager app with Instagram permissions:
 *   - instagram_manage_messages
 *   - pages_messaging
 *   - instagram_basic
 *
 * API Documentation:
 * https://developers.facebook.com/docs/messenger-platform/instagram
 */

import { Message } from "../../domain/entities/message.entity";
import { SendMessageResult } from "../../domain/ports/messaging.port";
import {
  ChannelAdapter,
  ChannelType,
  WebhookParseResult,
  ChannelIncomingMessage,
  ChannelStatusUpdate,
} from "../../domain/ports/channel.port";

export class InstagramAdapter implements ChannelAdapter {
  readonly channelType: ChannelType = "INSTAGRAM";

  private readonly apiVersion = "v18.0";
  private readonly baseUrl = "https://graph.facebook.com";
  private pageAccessToken: string;
  private pageId: string;

  constructor(config?: { pageAccessToken?: string; pageId?: string }) {
    // These would come from environment config in production
    this.pageAccessToken = config?.pageAccessToken || process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || "";
    this.pageId = config?.pageId || process.env.INSTAGRAM_PAGE_ID || "";
  }

  /**
   * Send a message to Instagram user
   *
   * Instagram Messenger API format:
   * POST /me/messages
   * {
   *   "recipient": { "id": "<PSID>" },
   *   "message": { "text": "Hello!" }
   * }
   */
  async send(message: Message): Promise<SendMessageResult> {
    if (!this.pageAccessToken) {
      throw new Error("Instagram adapter not configured: missing page access token");
    }

    const url = `${this.baseUrl}/${this.apiVersion}/me/messages?access_token=${this.pageAccessToken}`;

    // Build message payload based on type
    const payload = this.buildMessagePayload(message);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
    }

    const result = (await response.json()) as { message_id: string; recipient_id: string };

    return {
      messageId: result.message_id,
      recipientId: result.recipient_id,
    };
  }

  private buildMessagePayload(message: Message): any {
    const basePayload = {
      recipient: { id: message.to }, // PSID
      messaging_type: "RESPONSE",
    };

    // For now, only support text messages
    // TODO: Add support for images, quick replies, templates
    return {
      ...basePayload,
      message: {
        text: message.content.text?.body || "",
      },
    };
  }

  /**
   * Parse Instagram webhook payload
   *
   * Instagram webhook format:
   * {
   *   "object": "instagram",
   *   "entry": [{
   *     "id": "<PAGE_ID>",
   *     "time": 1234567890,
   *     "messaging": [{
   *       "sender": { "id": "<PSID>" },
   *       "recipient": { "id": "<PAGE_ID>" },
   *       "timestamp": 1234567890,
   *       "message": {
   *         "mid": "<MESSAGE_ID>",
   *         "text": "Hello!"
   *       }
   *     }]
   *   }]
   * }
   */
  parseWebhook(payload: any): WebhookParseResult {
    const messages: ChannelIncomingMessage[] = [];
    const statusUpdates: ChannelStatusUpdate[] = [];

    if (payload.object !== "instagram") {
      return {
        channelType: "INSTAGRAM",
        isStatusUpdate: false,
        messages: [],
        statusUpdates: [],
      };
    }

    for (const entry of payload.entry || []) {
      for (const messaging of entry.messaging || []) {
        // Check if it's a message or a delivery/read receipt
        if (messaging.message) {
          messages.push(this.parseMessage(messaging));
        } else if (messaging.delivery || messaging.read) {
          statusUpdates.push(this.parseStatusUpdate(messaging));
        }
      }
    }

    return {
      channelType: "INSTAGRAM",
      isStatusUpdate: statusUpdates.length > 0 && messages.length === 0,
      messages,
      statusUpdates,
    };
  }

  private parseMessage(messaging: any): ChannelIncomingMessage {
    const msg = messaging.message;

    return {
      channelType: "INSTAGRAM",
      channelMessageId: msg.mid,
      senderId: messaging.sender.id, // PSID
      type: this.getMessageType(msg),
      content: msg.text,
      mediaUrl: msg.attachments?.[0]?.payload?.url,
      metadata: messaging,
      timestamp: new Date(messaging.timestamp),
    };
  }

  private getMessageType(msg: any): ChannelIncomingMessage["type"] {
    if (msg.text) return "text";
    if (msg.attachments) {
      const attachment = msg.attachments[0];
      switch (attachment.type) {
        case "image":
          return "image";
        case "video":
          return "video";
        case "audio":
          return "audio";
        case "file":
          return "document";
        default:
          return "text";
      }
    }
    return "text";
  }

  private parseStatusUpdate(messaging: any): ChannelStatusUpdate {
    const isDelivery = !!messaging.delivery;

    return {
      channelType: "INSTAGRAM",
      messageId: isDelivery ? messaging.delivery.mids?.[0] : messaging.read?.watermark,
      status: isDelivery ? "delivered" : "read",
      recipientId: messaging.sender.id,
      timestamp: new Date(messaging.timestamp),
    };
  }

  /**
   * Verify Instagram webhook signature
   * Uses the same X-Hub-Signature-256 header as WhatsApp
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require("crypto");
    const appSecret = process.env.META_APP_SECRET || "";

    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Get media URL from Instagram
   * Instagram attachments come with direct URLs, no need to fetch
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    // Instagram messages include the media URL directly in the attachment
    // This method might be used for retrieving additional media info
    const url = `${this.baseUrl}/${this.apiVersion}/${mediaId}?access_token=${this.pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to get Instagram media URL");
    }

    const data = (await response.json()) as { url: string };
    return data.url;
  }
}

/**
 * Instructions for enabling Instagram integration:
 *
 * 1. Create/configure Meta Business app:
 *    - Go to Meta for Developers (developers.facebook.com)
 *    - Create or select your app
 *    - Add "Instagram" product to your app
 *
 * 2. Get required credentials:
 *    - Page Access Token (from Meta Business Suite)
 *    - Page ID (your Facebook page linked to Instagram)
 *    - App Secret (for webhook verification)
 *
 * 3. Configure webhooks:
 *    - Subscribe to "instagram" object
 *    - Subscribe to "messages" and "messaging_postbacks" fields
 *    - Webhook URL: https://yourdomain.com/webhook/instagram
 *
 * 4. Add environment variables:
 *    - INSTAGRAM_PAGE_ACCESS_TOKEN
 *    - INSTAGRAM_PAGE_ID
 *    - META_APP_SECRET (shared with WhatsApp)
 *
 * 5. Register the adapter in channel factory:
 *    const factory = getChannelFactory();
 *    factory.registerAdapter(new InstagramAdapter());
 */
