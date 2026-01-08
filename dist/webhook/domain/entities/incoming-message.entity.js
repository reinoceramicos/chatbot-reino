"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomingMessage = void 0;
class IncomingMessage {
    id;
    type;
    sender;
    phoneNumberId;
    content;
    constructor(id, type, sender, phoneNumberId, content) {
        this.id = id;
        this.type = type;
        this.sender = sender;
        this.phoneNumberId = phoneNumberId;
        this.content = content;
    }
    isText() {
        return this.type === "text";
    }
    isMedia() {
        return ["image", "audio", "voice", "video", "document", "sticker"].includes(this.type);
    }
    isInteractive() {
        return this.type === "interactive";
    }
    isButtonReply() {
        return this.type === "interactive" && this.content.interactive?.type === "button_reply";
    }
    isListReply() {
        return this.type === "interactive" && this.content.interactive?.type === "list_reply";
    }
    getText() {
        return this.content.text || "";
    }
    getInteractiveReplyId() {
        if (this.content.interactive?.buttonReply) {
            return this.content.interactive.buttonReply.id;
        }
        if (this.content.interactive?.listReply) {
            return this.content.interactive.listReply.id;
        }
        return undefined;
    }
    getInteractiveReplyTitle() {
        if (this.content.interactive?.buttonReply) {
            return this.content.interactive.buttonReply.title;
        }
        if (this.content.interactive?.listReply) {
            return this.content.interactive.listReply.title;
        }
        return undefined;
    }
    getInteractiveReplyDescription() {
        return this.content.interactive?.listReply?.description;
    }
}
exports.IncomingMessage = IncomingMessage;
