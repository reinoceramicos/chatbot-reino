import { Request, Response } from "express";
import { WebhookService } from "../../application/services/webhook.service";
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
  messageRepository
);

// Normaliza numeros argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone: string): string => {
  if (phone && phone.startsWith("549") && phone.length === 13) {
    return "54" + phone.slice(3);
  }
  return phone;
};

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
    const messages = await webhookService.processWebhook(req.body);

    for (const message of messages) {
      try {
        // Preparar datos para el bot
        const messageData: IncomingMessageData = {
          waId: message.sender.from,
          waMessageId: message.id,
          senderName: message.sender.name,
          messageType: message.type,
          content: message.content.text,
          mediaId: message.content.media?.id,
          metadata: {
            location: message.content.location,
            contacts: message.content.contacts,
            interactive: message.content.interactive,
          },
        };

        // Procesar mensaje con el bot
        const botResponse = await botService.processMessage(messageData);

        log("BOT_RESPONSE", {
          shouldRespond: botResponse.shouldRespond,
          transferToAgent: botResponse.transferToAgent,
          conversationId: botResponse.conversationId,
        });

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
            sentContent = botResponse.interactiveMessage.content.interactive?.body ||
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

          // Si debe transferir a agente, notificar
          if (botResponse.transferToAgent) {
            log("TRANSFER_REQUESTED", {
              conversationId: botResponse.conversationId,
              customerId: botResponse.customerId,
            });
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
