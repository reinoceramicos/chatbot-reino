import { TextNormalizerService } from "./text-normalizer.service";

export type Intent =
  | "GREETING"
  | "SALE_INTEREST"
  | "QUESTION"
  | "FAREWELL"
  | "THANKS"
  | "COMPLAINT"
  | "UNKNOWN";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  keywords: string[];
  isNegated?: boolean;
}

// Palabras clave para cada intención (expandidas con sinónimos argentinos)
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  GREETING: [
    "hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches",
    "hey", "que tal", "como estas", "hi", "hello",
    // Nuevas
    "como andas", "todo bien", "que onda", "wenas", "bnas", "che"
  ],
  SALE_INTEREST: [
    "comprar", "precio", "precios", "cotizacion", "cotizar", "presupuesto",
    "cuanto sale", "cuanto cuesta", "valor", "costo", "quiero", "necesito",
    "tienen", "hay stock", "disponible", "catalogo", "lista de precios",
    // Nuevas - argentinismos
    "plata", "guita", "mango", "cuanto esta", "a cuanto",
    "me interesa", "me gustaria", "busco", "conseguir", "averiguar"
  ],
  QUESTION: [
    "donde", "cuando", "como", "cual", "horario", "direccion", "ubicacion",
    "envio", "envios", "pago", "pagos", "abierto", "atienden", "trabajan",
    // Nuevas
    "hacen", "tienen", "hay", "aceptan", "tarjeta", "efectivo",
    "cuotas", "transferencia", "mercadopago", "debito", "credito"
  ],
  FAREWELL: [
    "chau", "adios", "hasta luego", "nos vemos", "bye", "gracias por todo",
    // Nuevas
    "hasta pronto", "nos hablamos", "hablamos", "saludos", "besos"
  ],
  THANKS: [
    "gracias", "muchas gracias", "te agradezco", "agradezco", "thanks",
    // Nuevas
    "mil gracias", "genial gracias", "grax", "grs", "ty", "thx"
  ],
  COMPLAINT: [
    "problema", "queja", "reclamo", "mal", "horrible", "pesimo", "no funciona",
    "roto", "fallado", "defectuoso", "no anda", "no sirve", "malisimo",
    "decepcionado", "decepcion", "enojado", "bronca", "desastre"
  ],
  UNKNOWN: [],
};

// Pesos por intención para calcular confianza
const INTENT_WEIGHTS: Partial<Record<Intent, number>> = {
  SALE_INTEREST: 0.4, // Más peso a ventas
  COMPLAINT: 0.35, // Quejas son importantes
  GREETING: 0.3,
  QUESTION: 0.25,
  FAREWELL: 0.3,
  THANKS: 0.3,
};

export class IntentDetectorService {
  private readonly normalizer: TextNormalizerService;

  constructor(normalizer?: TextNormalizerService) {
    this.normalizer = normalizer || new TextNormalizerService();
  }

  detect(message: string): IntentResult {
    const normalizedMessage = message.toLowerCase().trim();
    const enhancedMessage = this.normalizer.normalize(message);

    const foundKeywords: string[] = [];
    let bestIntent: Intent = "UNKNOWN";
    let bestScore = 0;

    // Detectar si hay negación general
    const isNegated = this.normalizer.isNegation(message);

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (intent === "UNKNOWN") continue;

      // Buscar en mensaje original normalizado Y en mensaje con sinónimos
      const matchedKeywords = keywords.filter(
        (kw) => normalizedMessage.includes(kw) || enhancedMessage.includes(kw)
      );

      // Calcular score con peso de la intención
      const weight = INTENT_WEIGHTS[intent as Intent] || 0.3;
      const score = matchedKeywords.length * weight;

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as Intent;
        foundKeywords.length = 0;
        foundKeywords.push(...matchedKeywords);
      }
    }

    // Si detectamos SALE_INTEREST pero hay negación, revisar
    if (bestIntent === "SALE_INTEREST" && isNegated) {
      // Verificar si es una negación real de compra
      const saleKeywords = ["comprar", "precio", "cotizar", "presupuesto", "quiero", "necesito"];
      const hasNegatedSale = saleKeywords.some((kw) =>
        this.normalizer.hasNegationBefore(message, kw)
      );

      if (hasNegatedSale) {
        // Reducir confianza significativamente
        bestScore = bestScore * 0.3;
      }
    }

    // Calcular confianza normalizada (0-1)
    const confidence = bestScore > 0 ? Math.min(bestScore, 1) : 0;

    return {
      intent: bestIntent,
      confidence,
      keywords: foundKeywords,
      isNegated,
    };
  }

  /**
   * Detecta intención considerando contexto de mensajes previos
   */
  detectWithContext(message: string, previousMessages: string[] = []): IntentResult {
    const currentResult = this.detect(message);

    // Si la intención es UNKNOWN y hay mensajes previos, usar contexto
    if (currentResult.intent === "UNKNOWN" && previousMessages.length > 0) {
      // Buscar intención dominante en mensajes previos
      const previousIntents = previousMessages.map((m) => this.detect(m));
      const intentCounts = new Map<Intent, number>();

      for (const result of previousIntents) {
        if (result.intent !== "UNKNOWN") {
          intentCounts.set(result.intent, (intentCounts.get(result.intent) || 0) + 1);
        }
      }

      // Si hay una intención dominante en contexto, considerar continuar
      if (intentCounts.size > 0) {
        const [dominantIntent] = [...intentCounts.entries()].sort((a, b) => b[1] - a[1])[0];

        // Respuestas cortas como "sí", "dale", "ok" continúan el contexto
        const continuationPhrases = ["si", "dale", "ok", "bueno", "perfecto", "listo", "va"];
        const normalizedMsg = this.normalizer.normalize(message);

        if (continuationPhrases.some((p) => normalizedMsg === p || normalizedMsg.startsWith(p + " "))) {
          return {
            ...currentResult,
            intent: dominantIntent,
            confidence: 0.5, // Confianza media por ser inferida
          };
        }
      }
    }

    return currentResult;
  }

  isSaleIntent(message: string): boolean {
    const result = this.detect(message);
    return result.intent === "SALE_INTEREST" && result.confidence >= 0.3;
  }

  isGreeting(message: string): boolean {
    const result = this.detect(message);
    return result.intent === "GREETING";
  }

  isComplaint(message: string): boolean {
    const result = this.detect(message);
    return result.intent === "COMPLAINT";
  }
}
