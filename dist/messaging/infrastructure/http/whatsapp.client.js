"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppHttpClient = void 0;
const https_1 = __importDefault(require("https"));
const env_config_1 = require("../../../shared/config/env.config");
class WhatsAppHttpClient {
    accessToken;
    apiVersion;
    hostname = "graph.facebook.com";
    constructor() {
        this.accessToken = env_config_1.envConfig.meta.accessToken;
        this.apiVersion = env_config_1.envConfig.meta.apiVersion;
        if (!this.accessToken) {
            console.warn("META_ACCESS_TOKEN is not defined in environment variables");
        }
    }
    async post(phoneNumberId, payload) {
        return new Promise((resolve, reject) => {
            if (!this.accessToken) {
                return reject(new Error("META_ACCESS_TOKEN is not defined in .env"));
            }
            if (!phoneNumberId) {
                return reject(new Error("phoneNumberId is required"));
            }
            const data = JSON.stringify(payload);
            const req = https_1.default.request({
                hostname: this.hostname,
                path: `/${this.apiVersion}/${phoneNumberId}/messages`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Length": Buffer.byteLength(data),
                },
            }, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk.toString();
                });
                res.on("end", () => {
                    const isSuccess = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
                    if (!isSuccess) {
                        return reject(new Error(`WhatsApp API error ${res.statusCode || "N/A"}: ${body}`));
                    }
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    }
                    catch {
                        resolve(body);
                    }
                });
            });
            req.on("error", (err) => reject(err));
            req.write(data);
            req.end();
        });
    }
}
exports.WhatsAppHttpClient = WhatsAppHttpClient;
