"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveMessage = exports.verifyToken = void 0;
const receiveMessagesHandlers_1 = require("../helpers/receiveMessagesHandlers");
const whatsappServices_1 = require("../services/whatsappServices");
// Logger sencillo: todo a consola
const log = (label, payload) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    console.log(`[${ts}] ${label}`, payload);
};
// Normaliza números argentinos: 549XXXXXXXXXX -> 54XXXXXXXXXX
const normalizePhoneNumber = (phone) => {
    if (phone && phone.startsWith("549") && phone.length === 13) {
        return "54" + phone.slice(3); // Quita el 9 después del código de país
    }
    return phone;
};
const verifyToken = (req, res) => {
    if (req.method !== "GET")
        return res.sendStatus(405);
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        log("WEBHOOK_VERIFIED", { mode, token });
        return res.status(200).send(challenge);
    }
    log("WEBHOOK_VERIFY_FAIL", { mode, token, expected: VERIFY_TOKEN });
    return res.sendStatus(403);
};
exports.verifyToken = verifyToken;
const receiveMessage = async (req, res) => {
    res.status(200).send("EVENT_RECEIVED");
    try {
        const body = req.body;
        const entry = Array.isArray(body?.entry)
            ? body.entry[0]
            : null;
        const changes = entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
        const value = changes?.value;
        if (!value || !Array.isArray(value.messages)) {
            log("NO_MESSAGES", {
                field: changes?.field,
                hasStatuses: !!value?.statuses,
                hasContacts: !!value?.contacts,
            });
            return;
        }
        log("WEBHOOK_EVENT", {
            entryId: entry?.id,
            field: changes?.field,
            messagesCount: value.messages?.length,
        });
        const metadata = value.metadata || {};
        const contacts = value.contacts || [];
        const messages = value.messages || [];
        for (const msg of messages) {
            // Evitar procesar mensajes duplicados o ya procesados
            if (await (0, receiveMessagesHandlers_1.isDuplicate)(msg.id)) {
                log("DUPLICATE_MESSAGE", msg.id);
                continue;
            }
            const contact = contacts.find((c) => c.wa_id === msg.from);
            const senderInfo = {
                from: msg.from,
                name: contact?.profile?.name || "Unknown",
                timestamp: msg.timestamp,
            };
            log("RECEIVED_MESSAGE", {
                id: msg.id,
                type: msg.type,
                from: senderInfo,
            });
            try {
                switch (msg.type) {
                    case "text":
                        // eslint-disable-next-line
                        await (0, receiveMessagesHandlers_1.handleTextMessage)(msg, senderInfo);
                        break;
                    case "image":
                        await (0, receiveMessagesHandlers_1.handleMediaMessage)(msg, senderInfo, "image");
                        break;
                    case "audio":
                    case "voice":
                        await (0, receiveMessagesHandlers_1.handleMediaMessage)(msg, senderInfo, "audio");
                        break;
                    case "video":
                        await (0, receiveMessagesHandlers_1.handleMediaMessage)(msg, senderInfo, "video");
                        break;
                    case "document":
                        await (0, receiveMessagesHandlers_1.handleMediaMessage)(msg, senderInfo, "document");
                        break;
                    case "sticker":
                        await (0, receiveMessagesHandlers_1.handleMediaMessage)(msg, senderInfo, "sticker");
                        break;
                    case "location":
                        await (0, receiveMessagesHandlers_1.handleLocationMessage)(msg, senderInfo);
                        break;
                    case "contacts":
                        await (0, receiveMessagesHandlers_1.handleContactsMessage)(msg, senderInfo);
                        break;
                    case "interactive":
                        await (0, receiveMessagesHandlers_1.handleInteractiveMessage)(msg, senderInfo);
                        break;
                    case "button":
                        await (0, receiveMessagesHandlers_1.handleButtonReply)(msg, senderInfo);
                        break;
                    case "reaction":
                        await (0, receiveMessagesHandlers_1.handleReaction)(msg, senderInfo);
                        break;
                    case "order":
                        await (0, receiveMessagesHandlers_1.handleOrderMessage)(msg, senderInfo);
                        break;
                    case "system":
                        await (0, receiveMessagesHandlers_1.handleSystemMessage)(msg, senderInfo);
                        break;
                    case "unsupported":
                        log("UNSUPPORTED_MESSAGE", { id: msg.id, errors: msg.errors });
                        break;
                    default:
                        log("UNKNOWN_MESSAGE_TYPE", { type: msg.type, id: msg.id });
                }
            }
            catch (handlerErr) {
                log("HANDLER_ERROR", {
                    id: msg.id,
                    type: msg.type,
                    error: handlerErr.message,
                });
            }
            if (metadata.phone_number_id) {
                try {
                    await (0, receiveMessagesHandlers_1.markAsRead)(msg.id, metadata.phone_number_id);
                    log("MARK_AS_READ", {
                        id: msg.id,
                        phoneNumberId: metadata.phone_number_id,
                    });
                }
                catch (markErr) {
                    log("MARK_AS_READ_ERROR", { id: msg.id, error: markErr.message });
                }
            }
            else {
                log("MARK_AS_READ_SKIPPED", {
                    id: msg.id,
                    reason: "missing phone_number_id",
                });
            }
            // Reenviar el texto recibido al mismo usuario
            if (msg.type === "text" && msg.text?.body && metadata.phone_number_id) {
                try {
                    const normalizedTo = normalizePhoneNumber(msg.from);
                    await (0, whatsappServices_1.sendTextMessage)({
                        to: normalizedTo,
                        body: `El usuario envio: ${msg.text.body}`,
                        phoneNumberId: metadata.phone_number_id,
                    });
                    log("SEND_TEXT_OK", { to: normalizedTo });
                }
                catch (sendErr) {
                    log("SEND_TEXT_ERROR", {
                        to: msg.from,
                        error: sendErr.message,
                    });
                }
            }
        }
    }
    catch (err) {
        log("WEBHOOK_ERROR", {
            message: err.message,
            stack: err.stack,
            body: req.body,
        });
    }
};
exports.receiveMessage = receiveMessage;
