import https from "https";
import { IncomingMessage } from "http";

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const DEFAULT_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Peticion POST a la API de WhatsApp Cloud
const postToWhatsApp = (phoneNumberId: string, payload: any): Promise<any> =>
  new Promise((resolve, reject) => {
    if (!META_ACCESS_TOKEN) {
      return reject(new Error("META_ACCESS_TOKEN no esta definido en .env"));
    }
    if (!phoneNumberId) {
      return reject(new Error("phoneNumberId es requerido"));
    }

    const data = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: "graph.facebook.com",
        path: `/v18.0/${phoneNumberId}/messages`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res: IncomingMessage) => {
        let body = "";
        res.on("data", (chunk: any) => {
          body += chunk;
        });
        res.on("end", () => {
          const ok =
            res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return reject(
              new Error(`WhatsApp API error ${res.statusCode || "NA"}: ${body}`)
            );
          }
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (err) {
            resolve(body);
          }
        });
      }
    );

    req.on("error", (err: Error) => reject(err));
    req.write(data);
    req.end();
  });

interface ISendTextParams {
  to: string;
  body: string;
  phoneNumberId?: string;
  previewUrl?: boolean;
}

// Envia un mensaje de texto simple
export const sendTextMessage = async ({
  to,
  body,
  phoneNumberId = DEFAULT_PHONE_NUMBER_ID,
  previewUrl = false,
}: ISendTextParams) => {
  if (!to) throw new Error("Parametro 'to' es requerido");
  if (!body) throw new Error("Parametro 'body' es requerido");

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body,
      preview_url: previewUrl,
    },
  };

  if (!phoneNumberId) {
    throw new Error(
      "phoneNumberId is required. Check .env or pass it as parameter"
    );
  }

  return postToWhatsApp(phoneNumberId, payload);
};
