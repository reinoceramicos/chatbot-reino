import * as https from "https";
import { envConfig } from "../../../shared/config/env.config";

export interface MediaInfo {
  url: string;
  mimeType: string;
  sha256: string;
  fileSize: number;
}

export class MediaDownloadService {
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.accessToken = envConfig.meta.accessToken;
    this.apiVersion = envConfig.meta.apiVersion;
  }

  /**
   * Obtiene la información del media (URL de descarga) desde WhatsApp
   */
  async getMediaInfo(mediaId: string): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      const url = `https://graph.facebook.com/${this.apiVersion}/${mediaId}`;

      const req = https.request(
        url,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
        (res) => {
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
            } catch (e) {
              reject(new Error(`Failed to parse media info response: ${data}`));
            }
          });
        }
      );

      req.on("error", (e) => {
        reject(new Error(`Failed to get media info: ${e.message}`));
      });

      req.end();
    });
  }

  /**
   * Descarga el contenido del media desde WhatsApp
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        mediaUrl,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
        (res) => {
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

          const chunks: Buffer[] = [];

          res.on("data", (chunk) => {
            chunks.push(chunk);
          });

          res.on("end", () => {
            resolve(Buffer.concat(chunks));
          });
        }
      );

      req.on("error", (e) => {
        reject(new Error(`Failed to download media: ${e.message}`));
      });

      req.end();
    });
  }

  /**
   * Obtiene la extensión de archivo basada en el MIME type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
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

// Singleton
let mediaDownloadServiceInstance: MediaDownloadService | null = null;

export function getMediaDownloadService(): MediaDownloadService {
  if (!mediaDownloadServiceInstance) {
    mediaDownloadServiceInstance = new MediaDownloadService();
  }
  return mediaDownloadServiceInstance;
}
