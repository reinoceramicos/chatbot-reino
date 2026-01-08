"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaDownloadService = void 0;
exports.getMediaDownloadService = getMediaDownloadService;
const https = __importStar(require("https"));
const env_config_1 = require("../../../shared/config/env.config");
class MediaDownloadService {
    accessToken;
    apiVersion;
    constructor() {
        this.accessToken = env_config_1.envConfig.meta.accessToken;
        this.apiVersion = env_config_1.envConfig.meta.apiVersion;
    }
    /**
     * Obtiene la información del media (URL de descarga) desde WhatsApp
     */
    async getMediaInfo(mediaId) {
        return new Promise((resolve, reject) => {
            const url = `https://graph.facebook.com/${this.apiVersion}/${mediaId}`;
            const req = https.request(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            }, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            reject(new Error(`WhatsApp API error: ${parsed.error.message}`));
                            return;
                        }
                        resolve({
                            url: parsed.url,
                            mimeType: parsed.mime_type,
                            sha256: parsed.sha256,
                            fileSize: parsed.file_size,
                        });
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse media info response: ${data}`));
                    }
                });
            });
            req.on("error", (e) => {
                reject(new Error(`Failed to get media info: ${e.message}`));
            });
            req.end();
        });
    }
    /**
     * Descarga el contenido del media desde WhatsApp
     */
    async downloadMedia(mediaUrl) {
        return new Promise((resolve, reject) => {
            const req = https.request(mediaUrl, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            }, (res) => {
                // Seguir redirects si es necesario
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const redirectUrl = res.headers.location;
                    if (redirectUrl) {
                        this.downloadMedia(redirectUrl).then(resolve).catch(reject);
                        return;
                    }
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download media: HTTP ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            req.on("error", (e) => {
                reject(new Error(`Failed to download media: ${e.message}`));
            });
            req.end();
        });
    }
    /**
     * Obtiene la extensión de archivo basada en el MIME type
     */
    static getExtensionFromMimeType(mimeType) {
        const extensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "video/mp4": ".mp4",
            "video/3gpp": ".3gp",
            "audio/aac": ".aac",
            "audio/mp4": ".m4a",
            "audio/mpeg": ".mp3",
            "audio/amr": ".amr",
            "audio/ogg": ".ogg",
            "application/pdf": ".pdf",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.ms-powerpoint": ".ppt",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
            "text/plain": ".txt",
        };
        return extensions[mimeType] || ".bin";
    }
}
exports.MediaDownloadService = MediaDownloadService;
// Singleton
let mediaDownloadServiceInstance = null;
function getMediaDownloadService() {
    if (!mediaDownloadServiceInstance) {
        mediaDownloadServiceInstance = new MediaDownloadService();
    }
    return mediaDownloadServiceInstance;
}
