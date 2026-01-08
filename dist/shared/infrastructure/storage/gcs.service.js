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
exports.GCSService = void 0;
exports.getGCSService = getGCSService;
const storage_1 = require("@google-cloud/storage");
const env_config_1 = require("../../config/env.config");
const path = __importStar(require("path"));
class GCSService {
    storage;
    publicBucket;
    privateBucket;
    constructor() {
        this.storage = new storage_1.Storage({
            keyFilename: env_config_1.envConfig.gcs.credentialsPath,
            projectId: env_config_1.envConfig.gcs.projectId,
        });
        this.publicBucket = env_config_1.envConfig.gcs.publicBucket;
        this.privateBucket = env_config_1.envConfig.gcs.privateBucket;
    }
    /**
     * Sube un archivo al bucket público
     * Los archivos en este bucket son accesibles sin autenticación
     */
    async uploadPublic(buffer, fileName, contentType, folder = "media") {
        const filePath = `${folder}/${fileName}`;
        const bucket = this.storage.bucket(this.publicBucket);
        const file = bucket.file(filePath);
        await file.save(buffer, {
            metadata: {
                contentType,
            },
        });
        // Hacer el archivo público
        await file.makePublic();
        const url = `https://storage.googleapis.com/${this.publicBucket}/${filePath}`;
        return {
            url,
            bucket: this.publicBucket,
            path: filePath,
        };
    }
    /**
     * Sube un archivo al bucket privado
     * Requiere signed URL para acceder
     */
    async uploadPrivate(buffer, fileName, contentType, folder = "media") {
        const filePath = `${folder}/${fileName}`;
        const bucket = this.storage.bucket(this.privateBucket);
        const file = bucket.file(filePath);
        await file.save(buffer, {
            metadata: {
                contentType,
            },
        });
        return {
            url: `gs://${this.privateBucket}/${filePath}`,
            bucket: this.privateBucket,
            path: filePath,
        };
    }
    /**
     * Genera una URL firmada para acceder a un archivo privado
     * @param filePath Ruta del archivo en el bucket
     * @param expiresInMinutes Tiempo de expiración en minutos (default: 60)
     */
    async getSignedUrl(filePath, expiresInMinutes = 60) {
        const bucket = this.storage.bucket(this.privateBucket);
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });
        return url;
    }
    /**
     * Elimina un archivo de un bucket
     */
    async deleteFile(bucketName, filePath) {
        const bucket = this.storage.bucket(bucketName);
        const file = bucket.file(filePath);
        await file.delete();
    }
    /**
     * Genera un nombre de archivo único basado en timestamp y tipo
     */
    static generateFileName(originalName, prefix = "") {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(originalName) || ".bin";
        const baseName = path.basename(originalName, ext).slice(0, 20);
        return `${prefix}${timestamp}_${random}_${baseName}${ext}`;
    }
    /**
     * Obtiene el content type basado en el tipo de mensaje de WhatsApp
     */
    static getContentTypeForWhatsAppMedia(mediaType) {
        const contentTypes = {
            image: "image/jpeg",
            video: "video/mp4",
            audio: "audio/ogg",
            document: "application/octet-stream",
            sticker: "image/webp",
        };
        return contentTypes[mediaType] || "application/octet-stream";
    }
}
exports.GCSService = GCSService;
// Singleton instance
let gcsServiceInstance = null;
function getGCSService() {
    if (!gcsServiceInstance) {
        gcsServiceInstance = new GCSService();
    }
    return gcsServiceInstance;
}
