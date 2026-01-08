"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationMessageHandler = void 0;
const base_handler_1 = require("./base.handler");
class LocationMessageHandler extends base_handler_1.BaseMessageHandler {
    async handle(message) {
        const location = message.content.location;
        this.log("LOCATION_MESSAGE", {
            latitude: location?.latitude,
            longitude: location?.longitude,
            name: location?.name,
            address: location?.address,
            from: message.sender.from,
        });
    }
}
exports.LocationMessageHandler = LocationMessageHandler;
