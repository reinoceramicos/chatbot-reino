import { Request, Response } from "express";
import { WebhookService, MessageStatusUpdate } from "../../application/services/webhook.service";
import { log } from "../../application/handlers/base.handler";
import { envConfig } from "../../../shared/config/env.config";

// Servicios de mensajeria
import { SendTextUseCase } from "../../../messaging/application/use-cases/send-text.use-case";
import { WhatsAppCloudAdapter } from "../../../messaging/infrastructure/adapters/whatsapp-cloud.adapter";
import { Message } from "../../../messaging/domain/entities/message.entity";

// Chatbot
import {
  BotService,
  IncomingMessageData,
} from "../../../chatbot/application/services/bot.service";
import { AutoResponseService } from "../../../chatbot/application/services/auto-response.service";
import { PrismaCustomerRepository } from "../../../chatbot/infrastructure/repositories/prisma-customer.repository";
import { PrismaConversationRepository } from "../../../chatbot/infrastructure/repositories/prisma-conversation.repository";
import { PrismaAutoResponseRepository } from "../../../chatbot/infrastructure/repositories/prisma-auto-response.repository";
import { PrismaMessageRepository } from "../../../chatbot/infrastructure/repositories/prisma-message.repository";
import { prisma } from "../../../shared/infrastructure/database/prisma.service";

// WebSocket
import { getSocketService } from "../../../shared/infrastructure/websocket/socket.service";

// Media processing
import { getMediaProcessorService } from "../../../messaging/application/services/media-processor.service";

// Inicializar servicios
const webhookService = new WebhookService();
const messagingAdapter = new WhatsAppCloudAdapter();
const sendTextUseCase = new SendTextUseCase(messagingAdapter);

// Inicializar chatbot con repositorios
const customerRepository = new PrismaCustomerRepository(prisma);
const conversationRepository = new PrismaConversationRepository(prisma);
const autoResponseRepository = new PrismaAutoResponseRepository(prisma);
const messageRepository = new PrismaMessageRepository(prisma);
const autoResponseService = new AutoResponseService(autoResponseRepository);
const botService = new BotService(
  customerRepository,
  conversationRepository,
  autoResponseService,
  messageRepository,
  prisma
);

// Normaliza numeros argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone: string): string => {
  if (phone && phone.startsWith("549") && phone.length === 13) {
    return "54" + phone.slice(3);
  }
  return phone;
};

// Process message status updates from WhatsApp
async function processStatusUpdates(updates: MessageStatusUpdate[]): Promise<void> {
  for (const update of updates) {
    try {
      // Update message status in database
      const updatedMessage = await prisma.message.updateMany({
        where: { waMessageId: update.waMessageId },
        data: { status: update.status },
      });

      if (updatedMessage.count > 0) {
        log("MESSAGE_STATUS_UPDATED", {
          waMessageId: update.waMessageId,
          status: update.status,
        });

        // Emit status update via WebSocket
        const socketService = getSocketService();
        if (socketService) {
          // Find the message to get conversationId
          const message = await prisma.message.findFirst({
            where: { waMessageId: update.waMessageId },
            select: { id: true, conversationId: true },
          });

          if (message) {
            socketService.emitMessageStatusUpdate({
              conversationId: message.conversationId,
              messageId: message.id,
              waMessageId: update.waMessageId,
              status: update.status,
            });
          }
        }
      }
    } catch (err: any) {
      log("STATUS_UPDATE_ERROR", {
        waMessageId: update.waMessageId,
        error: err.message,
      });
    }
  }
}

export const verifyToken = (req: Request, res: Response) => {
  if (req.method !== "GET") return res.sendStatus(405);

  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (
    mode === "subscribe" &&
    token === envConfig.meta.verifyToken &&
    challenge
  ) {
    log("WEBHOOK_VERIFIED", { mode, token });
    return res.status(200).send(challenge);
  }

  log("WEBHOOK_VERIFY_FAIL", {
    mode,
    token,
    expected: envConfig.meta.verifyToken,
  });
  return res.sendStatus(403);
};

export const receiveMessage = async (req: Request, res: Response) => {
  res.status(200).send("EVENT_RECEIVED");

  try {
    // Process status updates first
    const statusUpdates = webhookService.processStatusUpdates(req.body);
    if (statusUpdates.length > 0) {
      await processStatusUpdates(statusUpdates);
    }

    const messages = await webhookService.processWebhook(req.body);

    for (const message of messages) {
      try {
        // Extraer interactiveReplyId de respuestas interactivas
        const interactive = message.content.interactive;
        const interactiveReplyId =
          interactive?.buttonReply?.id || interactive?.listReply?.id;
        const interactiveReplyTitle =
          interactive?.buttonReply?.title || interactive?.listReply?.title;

        // Preparar datos para el bot
        const messageData: IncomingMessageData = {
          waId: message.sender.from,
          waMessageId: message.id,
          senderName: message.sender.name,
          messageType: message.type,
          content: message.content.text,
          mediaId: message.content.media?.id,
          interactiveReplyId,
          interactiveReplyTitle,
          metadata: {
            location: message.content.location,
            contacts: message.content.contacts,
            interactive: message.content.interactive,
            interactiveType: interactive?.type,
          },
        };

        // Procesar mensaje con el bot
        const botResponse = await botService.processMessage(messageData);

        // Procesar media si existe (imagen, video, audio, documento)
        const mediaTypes = ["image", "video", "audio", "document", "sticker"];
        if (mediaTypes.includes(message.type) && message.content.media?.id) {
          try {
            const mediaProcessor = getMediaProcessorService();
            const processedMedia = await mediaProcessor.processWhatsAppMedia(
              message.content.media.id,
              message.type,
              botResponse.conversationId
            );

            // Actualizar el mensaje en la DB con la URL del media
            await prisma.message.updateMany({
              where: { waMessageId: message.id },
              data: {
                mediaUrl: processedMedia.publicUrl,
                metadata: {
                  ...messageData.metadata,
                  originalMediaId: processedMedia.originalMediaId,
                  mimeType: processedMedia.mimeType,
                  fileSize: processedMedia.fileSize,
                  storagePath: processedMedia.storagePath,
                },
              },
            });

            log("MEDIA_PROCESSED", {
              mediaId: message.content.media.id,
              type: message.type,
              url: processedMedia.publicUrl,
            });
          } catch (mediaErr: any) {
            log("MEDIA_PROCESSING_ERROR", {
              mediaId: message.content.media.id,
              error: mediaErr.message,
            });
          }
        }

        log("BOT_RESPONSE", {
          shouldRespond: botResponse.shouldRespond,
          transferToAgent: botResponse.transferToAgent,
          conversationId: botResponse.conversationId,
        });

        // Emitir mensaje por WebSocket a los agentes
        const socketService = getSocketService();
        if (socketService) {
          // Obtener storeId de la conversación para routing
          const conversation = await prisma.conversation.findUnique({
            where: { id: botResponse.conversationId },
            select: { storeId: true },
          });

          // For interactive messages, use the button/list reply title as content
          let messageContent = message.content.text;
          if (message.type === "interactive" && interactiveReplyTitle) {
            messageContent = interactiveReplyTitle;
          }

          socketService.emitNewCustomerMessage({
            conversationId: botResponse.conversationId,
            storeId: conversation?.storeId || undefined,
            message: {
              id: message.id,
              content: messageContent,
              type: message.type,
              direction: "INBOUND",
              createdAt: new Date(),
            },
            customer: {
              id: botResponse.customerId,
              name: message.sender.name,
              waId: message.sender.from,
            },
          });
        }

        // Si el bot debe responder, enviar mensaje
        if (botResponse.shouldRespond && message.phoneNumberId) {
          const normalizedTo = normalizePhoneNumber(message.sender.from);
          let sentContent: string | undefined;

          // Enviar mensaje interactivo o de texto
          if (botResponse.interactiveMessage) {
            // Clonar el mensaje con el destinatario normalizado y phoneNumberId
            const interactiveMsg = new Message(
              normalizedTo,
              botResponse.interactiveMessage.type,
              botResponse.interactiveMessage.content,
              message.phoneNumberId
            );
            await messagingAdapter.send(interactiveMsg);
            sentContent =
              botResponse.interactiveMessage.content.interactive?.body ||
              botResponse.interactiveMessage.content.text?.body;

            log("BOT_SENT_INTERACTIVE", {
              to: normalizedTo,
              type: botResponse.interactiveMessage.type,
            });
          } else if (botResponse.message) {
            await sendTextUseCase.execute({
              to: normalizedTo,
              body: botResponse.message,
              phoneNumberId: message.phoneNumberId,
            });
            sentContent = botResponse.message;

            log("BOT_SENT_MESSAGE", {
              to: normalizedTo,
              message: botResponse.message,
            });
          }

          // Guardar mensaje saliente
          if (sentContent) {
            await botService.saveOutgoingMessage(
              botResponse.conversationId,
              botResponse.customerId,
              sentContent
            );
          }

          // Si debe transferir a agente, notificar por WebSocket
          if (botResponse.transferToAgent) {
            log("TRANSFER_REQUESTED", {
              conversationId: botResponse.conversationId,
              customerId: botResponse.customerId,
            });

            // Emitir nueva conversación en espera
            const socketSvc = getSocketService();
            if (socketSvc) {
              const conv = await prisma.conversation.findUnique({
                where: { id: botResponse.conversationId },
                select: { storeId: true },
              });

              socketSvc.emitNewWaitingConversation({
                conversationId: botResponse.conversationId,
                storeId: conv?.storeId || undefined,
                customer: {
                  id: botResponse.customerId,
                  name: message.sender.name,
                  waId: message.sender.from,
                },
              });
            }
          }
        }
      } catch (msgErr: any) {
        log("MESSAGE_PROCESSING_ERROR", {
          messageId: message.id,
          error: msgErr.message,
        });
      }
    }
  } catch (err: any) {
    log("WEBHOOK_ERROR", {
      message: err.message,
      stack: err.stack,
      body: req.body,
    });
  }
};
