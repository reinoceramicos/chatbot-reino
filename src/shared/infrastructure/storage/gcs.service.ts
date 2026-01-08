import { Storage } from "@google-cloud/storage";
import { envConfig } from "../../config/env.config";
import * as path from "path";

export interface UploadResult {
  url: string;
  bucket: string;
  path: string;
}

export class GCSService {
  private storage: Storage;
  private publicBucket: string;
  private privateBucket: string;

  constructor() {
    this.storage = new Storage({
      keyFilename: envConfig.gcs.credentialsPath,
      projectId: envConfig.gcs.projectId,
    });

    this.publicBucket = envConfig.gcs.publicBucket;
    this.privateBucket = envConfig.gcs.privateBucket;
  }

  /**
   * Sube un archivo al bucket público
   * El bucket debe tener allUsers con rol Storage Object Viewer
   */
  async uploadPublic(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = "media"
  ): Promise<UploadResult> {
    const filePath = `${folder}/${fileName}`;
    const bucket = this.storage.bucket(this.publicBucket);
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });

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
  async uploadPrivate(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = "media"
  ): Promise<UploadResult> {
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
  async getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
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
  async deleteFile(bucketName: string, filePath: string): Promise<void> {
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(filePath);
    await file.delete();
  }

  /**
   * Genera un nombre de archivo único basado en timestamp y tipo
   */
  static generateFileName(originalName: string, prefix: string = ""): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName) || ".bin";
    const baseName = path.basename(originalName, ext).slice(0, 20);

    return `${prefix}${timestamp}_${random}_${baseName}${ext}`;
  }

  /**
   * Obtiene el content type basado en el tipo de mensaje de WhatsApp
   */
  static getContentTypeForWhatsAppMedia(mediaType: string): string {
    const contentTypes: Record<string, string> = {
      image: "image/jpeg",
      video: "video/mp4",
      audio: "audio/ogg",
      document: "application/octet-stream",
      sticker: "image/webp",
    };

    return contentTypes[mediaType] || "application/octet-stream";
  }
}

// Singleton instance
let gcsServiceInstance: GCSService | null = null;

export function getGCSService(): GCSService {
  if (!gcsServiceInstance) {
    gcsServiceInstance = new GCSService();
  }
  return gcsServiceInstance;
}
