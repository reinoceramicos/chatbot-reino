import { getMediaDownloadService, MediaDownloadService } from "../../infrastructure/services/media-download.service";
import { getGCSService, GCSService } from "../../../shared/infrastructure/storage/gcs.service";

export interface ProcessedMedia {
  originalMediaId: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  bucket: string;
}

export class MediaProcessorService {
  private mediaDownloader: MediaDownloadService;
  private gcsService: GCSService;

  constructor() {
    this.mediaDownloader = getMediaDownloadService();
    this.gcsService = getGCSService();
  }

  /**
   * Procesa un media de WhatsApp: lo descarga y lo sube a GCS
   * @param mediaId ID del media en WhatsApp
   * @param messageType Tipo de mensaje (image, video, audio, document, sticker)
   * @param conversationId ID de la conversación para organizar archivos
   */
  async processWhatsAppMedia(
    mediaId: string,
    messageType: string,
    conversationId: string
  ): Promise<ProcessedMedia> {
    // 1. Obtener info del media
    const mediaInfo = await this.mediaDownloader.getMediaInfo(mediaId);

    // 2. Descargar el media
    const mediaBuffer = await this.mediaDownloader.downloadMedia(mediaInfo.url);

    // 3. Generar nombre de archivo
    const extension = MediaDownloadService.getExtensionFromMimeType(mediaInfo.mimeType);
    const fileName = GCSService.generateFileName(`media${extension}`, `${messageType}_`);

    // 4. Organizar en carpetas por conversación
    const folder = `conversations/${conversationId}/${messageType}s`;

    // 5. Subir a GCS (bucket público para fácil acceso desde el frontend)
    const uploadResult = await this.gcsService.uploadPublic(
      mediaBuffer,
      fileName,
      mediaInfo.mimeType,
      folder
    );

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
  async processMultipleMedia(
    items: Array<{ mediaId: string; messageType: string; conversationId: string }>
  ): Promise<ProcessedMedia[]> {
    return Promise.all(
      items.map((item) =>
        this.processWhatsAppMedia(item.mediaId, item.messageType, item.conversationId)
      )
    );
  }
}

// Singleton
let mediaProcessorInstance: MediaProcessorService | null = null;

export function getMediaProcessorService(): MediaProcessorService {
  if (!mediaProcessorInstance) {
    mediaProcessorInstance = new MediaProcessorService();
  }
  return mediaProcessorInstance;
}
