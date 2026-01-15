"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveMessage = exports.verifyToken = void 0;
const webhook_service_1 = require("../../application/services/webhook.service");
const base_handler_1 = require("../../application/handlers/base.handler");
const env_config_1 = require("../../../shared/config/env.config");
// Servicios de mensajeria
const send_text_use_case_1 = require("../../../messaging/application/use-cases/send-text.use-case");
const whatsapp_cloud_adapter_1 = require("../../../messaging/infrastructure/adapters/whatsapp-cloud.adapter");
const message_entity_1 = require("../../../messaging/domain/entities/message.entity");
// Chatbot
const bot_service_1 = require("../../../chatbot/application/services/bot.service");
const auto_response_service_1 = require("../../../chatbot/application/services/auto-response.service");
const prisma_customer_repository_1 = require("../../../chatbot/infrastructure/repositories/prisma-customer.repository");
const prisma_conversation_repository_1 = require("../../../chatbot/infrastructure/repositories/prisma-conversation.repository");
const prisma_auto_response_repository_1 = require("../../../chatbot/infrastructure/repositories/prisma-auto-response.repository");
const prisma_message_repository_1 = require("../../../chatbot/infrastructure/repositories/prisma-message.repository");
const prisma_service_1 = require("../../../shared/infrastructure/database/prisma.service");
// WebSocket
const socket_service_1 = require("../../../shared/infrastructure/websocket/socket.service");
// Media processing
const media_processor_service_1 = require("../../../messaging/application/services/media-processor.service");
// Inicializar servicios
const webhookService = new webhook_service_1.WebhookService();
const messagingAdapter = new whatsapp_cloud_adapter_1.WhatsAppCloudAdapter();
const sendTextUseCase = new send_text_use_case_1.SendTextUseCase(messagingAdapter);
// Inicializar chatbot con repositorios
const customerRepository = new prisma_customer_repository_1.PrismaCustomerRepository(prisma_service_1.prisma);
const conversationRepository = new prisma_conversation_repository_1.PrismaConversationRepository(prisma_service_1.prisma);
const autoResponseRepository = new prisma_auto_response_repository_1.PrismaAutoResponseRepository(prisma_service_1.prisma);
const messageRepository = new prisma_message_repository_1.PrismaMessageRepository(prisma_service_1.prisma);
const autoResponseService = new auto_response_service_1.AutoResponseService(autoResponseRepository);
const botService = new bot_service_1.BotService(customerRepository, conversationRepository, autoResponseService, messageRepository, prisma_service_1.prisma);
// Normaliza numeros argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone) => {
    if (phone && phone.startsWith("549") && phone.length === 13) {
        return "54" + phone.slice(3);
    }
    return phone;
};
const verifyToken = (req, res) => {
    if (req.method !== "GET")
        return res.sendStatus(405);
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" &&
        token === env_config_1.envConfig.meta.verifyToken &&
        challenge) {
        (0, base_handler_1.log)("WEBHOOK_VERIFIED", { mode, token });
        return res.status(200).send(challenge);
    }
    (0, base_handler_1.log)("WEBHOOK_VERIFY_FAIL", {
        mode,
        token,
        expected: env_config_1.envConfig.meta.verifyToken,
    });
    return res.sendStatus(403);
};
exports.verifyToken = verifyToken;
const receiveMessage = async (req, res) => {
    res.status(200).send("EVENT_RECEIVED");
    try {
        const messages = await webhookService.processWebhook(req.body);
        for (const message of messages) {
            try {
                // Extraer interactiveReplyId de respuestas interactivas
                const interactive = message.content.interactive;
                const interactiveReplyId = interactive?.buttonReply?.id || interactive?.listReply?.id;
                const interactiveReplyTitle = interactive?.buttonReply?.title || interactive?.listReply?.title;
                // Preparar datos para el bot
                const messageData = {
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
                        const mediaProcessor = (0, media_processor_service_1.getMediaProcessorService)();
                        const processedMedia = await mediaProcessor.processWhatsAppMedia(message.content.media.id, message.type, botResponse.conversationId);
                        // Actualizar el mensaje en la DB con la URL del media
                        await prisma_service_1.prisma.message.updateMany({
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
                        (0, base_handler_1.log)("MEDIA_PROCESSED", {
                            mediaId: message.content.media.id,
                            type: message.type,
                            url: processedMedia.publicUrl,
                        });
                    }
                    catch (mediaErr) {
                        (0, base_handler_1.log)("MEDIA_PROCESSING_ERROR", {
                            mediaId: message.content.media.id,
                            error: mediaErr.message,
                        });
                    }
                }
                (0, base_handler_1.log)("BOT_RESPONSE", {
                    shouldRespond: botResponse.shouldRespond,
                    transferToAgent: botResponse.transferToAgent,
                    conversationId: botResponse.conversationId,
                });
                // Emitir mensaje por WebSocket a los agentes
                const socketService = (0, socket_service_1.getSocketService)();
                if (socketService) {
                    // Obtener storeId de la conversación para routing
                    const conversation = await prisma_service_1.prisma.conversation.findUnique({
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
                    let sentContent;
                    // Enviar mensaje interactivo o de texto
                    if (botResponse.interactiveMessage) {
                        // Clonar el mensaje con el destinatario normalizado y phoneNumberId
                        const interactiveMsg = new message_entity_1.Message(normalizedTo, botResponse.interactiveMessage.type, botResponse.interactiveMessage.content, message.phoneNumberId);
                        await messagingAdapter.send(interactiveMsg);
                        sentContent =
                            botResponse.interactiveMessage.content.interactive?.body ||
                                botResponse.interactiveMessage.content.text?.body;
                        (0, base_handler_1.log)("BOT_SENT_INTERACTIVE", {
                            to: normalizedTo,
                            type: botResponse.interactiveMessage.type,
                        });
                    }
                    else if (botResponse.message) {
                        await sendTextUseCase.execute({
                            to: normalizedTo,
                            body: botResponse.message,
                            phoneNumberId: message.phoneNumberId,
                        });
                        sentContent = botResponse.message;
                        (0, base_handler_1.log)("BOT_SENT_MESSAGE", {
                            to: normalizedTo,
                            message: botResponse.message,
                        });
                    }
                    // Guardar mensaje saliente
                    if (sentContent) {
                        await botService.saveOutgoingMessage(botResponse.conversationId, botResponse.customerId, sentContent);
                    }
                    // Si debe transferir a agente, notificar por WebSocket
                    if (botResponse.transferToAgent) {
                        (0, base_handler_1.log)("TRANSFER_REQUESTED", {
                            conversationId: botResponse.conversationId,
                            customerId: botResponse.customerId,
                        });
                        // Emitir nueva conversación en espera
                        const socketSvc = (0, socket_service_1.getSocketService)();
                        if (socketSvc) {
                            const conv = await prisma_service_1.prisma.conversation.findUnique({
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
            }
            catch (msgErr) {
                (0, base_handler_1.log)("MESSAGE_PROCESSING_ERROR", {
                    messageId: message.id,
                    error: msgErr.message,
                });
            }
        }
    }
    catch (err) {
        (0, base_handler_1.log)("WEBHOOK_ERROR", {
            message: err.message,
            stack: err.stack,
            body: req.body,
        });
    }
};
exports.receiveMessage = receiveMessage;
