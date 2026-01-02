import { Request, Response } from "express";
import { WebhookService } from "../../application/services/webhook.service";
import { log } from "../../application/handlers/base.handler";
import { envConfig } from "../../../shared/config/env.config";

// Servicios de mensajeria
import { SendTextUseCase } from "../../../messaging/application/use-cases/send-text.use-case";
import { WhatsAppCloudAdapter } from "../../../messaging/infrastructure/adapters/whatsapp-cloud.adapter";

const webhookService = new WebhookService();
const messagingAdapter = new WhatsAppCloudAdapter();
const sendTextUseCase = new SendTextUseCase(messagingAdapter);

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

  if (mode === "subscribe" && token === envConfig.meta.verifyToken && challenge) {
    log("WEBHOOK_VERIFIED", { mode, token });
    return res.status(200).send(challenge);
  }

  log("WEBHOOK_VERIFY_FAIL", { mode, token, expected: envConfig.meta.verifyToken });
  return res.sendStatus(403);
};

export const receiveMessage = async (req: Request, res: Response) => {
  res.status(200).send("EVENT_RECEIVED");

  try {
    const messages = await webhookService.processWebhook(req.body);

    // Ejemplo: responder a mensajes de texto
    for (const message of messages) {
      if (message.isText() && message.phoneNumberId) {
        try {
          const normalizedTo = normalizePhoneNumber(message.sender.from);
          await sendTextUseCase.execute({
            to: normalizedTo,
            body: `El usuario envio: ${message.getText()}`,
            phoneNumberId: message.phoneNumberId,
          });
          log("SEND_TEXT_OK", { to: normalizedTo });
        } catch (sendErr: any) {
          log("SEND_TEXT_ERROR", {
            to: message.sender.from,
            error: sendErr.message,
          });
        }
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
