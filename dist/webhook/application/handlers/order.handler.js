"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class OrderMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const order = message.content.order;
        this.log("ORDER_MESSAGE", {
            catalogId: order?.catalogId,
            productItems: order?.productItems,
            from: message.sender.from,
        });
    }
}
exports.OrderMessageHandler = OrderMessageHandler;
