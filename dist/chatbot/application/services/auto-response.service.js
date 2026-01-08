"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoResponseService = void 0;
class AutoResponseService {
    autoResponseRepository;
    responses = [];
    lastLoadTime = 0;
    cacheDuration = 60000; // 1 minuto de cache
    constructor(autoResponseRepository) {
        this.autoResponseRepository = autoResponseRepository;
    }
    async findMatch(message) {
        await this.loadResponsesIfNeeded();
        const normalizedMessage = message.toLowerCase().trim();
        for (const autoResponse of this.responses) {
            if (this.matches(normalizedMessage, autoResponse)) {
                return {
                    matched: true,
                    response: autoResponse.response,
                    category: autoResponse.category,
                };
            }
        }
        return { matched: false };
    }
    matches(message, autoResponse) {
        const trigger = autoResponse.trigger.toLowerCase();
        switch (autoResponse.triggerType) {
            case "keyword":
                // Busca la palabra clave en el mensaje
                return message.includes(trigger);
            case "exact":
                // Match exacto
                return message === trigger;
            case "regex":
                // Expresión regular
                try {
                    const regex = new RegExp(trigger, "i");
                    return regex.test(message);
                }
                catch {
                    return false;
                }
            case "startswith":
                return message.startsWith(trigger);
            default:
                return message.includes(trigger);
        }
    }
    async loadResponsesIfNeeded() {
        const now = Date.now();
        if (now - this.lastLoadTime > this.cacheDuration) {
            this.responses = await this.autoResponseRepository.findActive();
            this.lastLoadTime = now;
        }
    }
    // Forzar recarga del cache
    async reloadCache() {
        this.responses = await this.autoResponseRepository.findActive();
        this.lastLoadTime = Date.now();
    }
}
exports.AutoResponseService = AutoResponseService;
