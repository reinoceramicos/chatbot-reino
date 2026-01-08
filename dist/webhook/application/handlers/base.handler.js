"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMessageHandler = exports.log = void 0;
const log = (label, payload) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    console.log(`[${ts}] ${label}`, payload);
};
exports.log = log;
class BaseMessageHandler {
    log(label, payload) {
        (0, exports.log)(label, payload);
    }
}
exports.BaseMessageHandler = BaseMessageHandler;
