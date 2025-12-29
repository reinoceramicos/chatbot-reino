"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const route_1 = __importDefault(require("./routes/route"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use("/webhook", route_1.default);
app.use((req, _res, next) => {
    if (req.path.startsWith("/webhook")) {
        console.log("IN", req.method, req.originalUrl, req.headers["user-agent"]);
    }
    next();
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
