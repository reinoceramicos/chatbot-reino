import https from "https";
import { IncomingMessage } from "http";
import { envConfig } from "../../../shared/config/env.config";

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppHttpClient {
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly hostname = "graph.facebook.com";

  constructor() {
    this.accessToken = envConfig.meta.accessToken;
    this.apiVersion = envConfig.meta.apiVersion;

    if (!this.accessToken) {
      console.warn("META_ACCESS_TOKEN is not defined in environment variables");
    }
  }

  async post<T = WhatsAppApiResponse>(phoneNumberId: string, payload: object): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.accessToken) {
        return reject(new Error("META_ACCESS_TOKEN is not defined in .env"));
      }

      if (!phoneNumberId) {
        return reject(new Error("phoneNumberId is required"));
      }

      const data = JSON.stringify(payload);

      const req = https.request(
        {
          hostname: this.hostname,
          path: `/${this.apiVersion}/${phoneNumberId}/messages`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res: IncomingMessage) => {
          let body = "";

          res.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });

          res.on("end", () => {
            const isSuccess = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;

            if (!isSuccess) {
              return reject(new Error(`WhatsApp API error ${res.statusCode || "N/A"}: ${body}`));
            }

            try {
              resolve(body ? JSON.parse(body) : ({} as T));
            } catch {
              resolve(body as unknown as T);
            }
          });
        }
      );

      req.on("error", (err: Error) => reject(err));
      req.write(data);
      req.end();
    });
  }
}
