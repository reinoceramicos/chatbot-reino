"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaProcessorService = void 0;
exports.getMediaProcessorService = getMediaProcessorService;
const media_download_service_1 = require("../../infrastructure/services/media-download.service");
const gcs_service_1 = require("../../../shared/infrastructure/storage/gcs.service");
class MediaProcessorService {
    mediaDownloader;
    gcsService;
    constructor() {
        this.mediaDownloader = (0, media_download_service_1.getMediaDownloadService)();
        this.gcsService = (0, gcs_service_1.getGCSService)();
    }
    /**
     * Procesa un media de WhatsApp: lo descarga y lo sube a GCS
     * @param mediaId ID del media en WhatsApp
     * @param messageType Tipo de mensaje (image, video, audio, document, sticker)
     * @param conversationId ID de la conversación para organizar archivos
     */
    async processWhatsAppMedia(mediaId, messageType, conversationId) {
        // 1. Obtener info del media
        const mediaInfo = await this.mediaDownloader.getMediaInfo(mediaId);
        // 2. Descargar el media
        const mediaBuffer = await this.mediaDownloader.downloadMedia(mediaInfo.url);
        // 3. Generar nombre de archivo
        const extension = media_download_service_1.MediaDownloadService.getExtensionFromMimeType(mediaInfo.mimeType);
        const fileName = gcs_service_1.GCSService.generateFileName(`media${extension}`, `${messageType}_`);
        // 4. Organizar en carpetas por conversación
        const folder = `conversations/${conversationId}/${messageType}s`;
        // 5. Subir a GCS (bucket público para fácil acceso desde el frontend)
        const uploadResult = await this.gcsService.uploadPublic(mediaBuffer, fileName, mediaInfo.mimeType, folder);
        return {
            originalMediaId: mediaId,
            publicUrl: uploadResult.url,
            mimeType: mediaInfo.mimeType,
            fileSize: mediaInfo.fileSize,
            storagePath: uploadResult.path,
            bucket: uploadResult.bucket,
        };
    }
    /**
     * Procesa múltiples medias en paralelo
     */
    async processMultipleMedia(items) {
        return Promise.all(items.map((item) => this.processWhatsAppMedia(item.mediaId, item.messageType, item.conversationId)));
    }
}
exports.MediaProcessorService = MediaProcessorService;
// Singleton
let mediaProcessorInstance = null;
function getMediaProcessorService() {
    if (!mediaProcessorInstance) {
        mediaProcessorInstance = new MediaProcessorService();
    }
    return mediaProcessorInstance;
}
