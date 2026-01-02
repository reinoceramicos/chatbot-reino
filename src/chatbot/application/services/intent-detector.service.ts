export type Intent =
  | "GREETING"
  | "SALE_INTEREST"
  | "QUESTION"
  | "FAREWELL"
  | "THANKS"
  | "UNKNOWN";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  keywords: string[];
}

// Palabras clave para cada intención
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  GREETING: [
    "hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches",
    "hey", "que tal", "como estas", "hi", "hello"
  ],
  SALE_INTEREST: [
    "comprar", "precio", "precios", "cotizacion", "cotizar", "presupuesto",
    "cuanto sale", "cuanto cuesta", "valor", "costo", "quiero", "necesito",
    "tienen", "hay stock", "disponible", "catalogo", "lista de precios"
  ],
  QUESTION: [
    "donde", "cuando", "como", "cual", "horario", "direccion", "ubicacion",
    "envio", "envios", "pago", "pagos", "abierto", "atienden", "trabajan"
  ],
  FAREWELL: [
    "chau", "adios", "hasta luego", "nos vemos", "bye", "gracias por todo"
  ],
  THANKS: [
    "gracias", "muchas gracias", "te agradezco", "agradezco", "thanks"
  ],
  UNKNOWN: [],
};

export class IntentDetectorService {
  detect(message: string): IntentResult {
    const normalizedMessage = message.toLowerCase().trim();
    const foundKeywords: string[] = [];
    let bestIntent: Intent = "UNKNOWN";
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === "UNKNOWN") continue;

      const matchedKeywords = keywords.filter((kw) =>
        normalizedMessage.includes(kw)
      );

      if (matchedKeywords.length > bestScore) {
        bestScore = matchedKeywords.length;
        bestIntent = intent as Intent;
        foundKeywords.push(...matchedKeywords);
      }
    }

    // Calcular confianza basada en cantidad de keywords encontradas
    const confidence = bestScore > 0 ? Math.min(bestScore * 0.3, 1) : 0;

    return {
      intent: bestIntent,
      confidence,
      keywords: foundKeywords,
    };
  }

  isSaleIntent(message: string): boolean {
    const result = this.detect(message);
    return result.intent === "SALE_INTEREST" && result.confidence >= 0.3;
  }

  isGreeting(message: string): boolean {
    const result = this.detect(message);
    return result.intent === "GREETING";
  }
}
