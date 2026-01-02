import { IntentDetectorService, Intent } from "../intent-detector.service";

describe("IntentDetectorService", () => {
  let service: IntentDetectorService;

  beforeEach(() => {
    service = new IntentDetectorService();
  });

  describe("detect", () => {
    describe("GREETING intent", () => {
      it.each([
        "hola",
        "Hola!",
        "HOLA",
        "buenas",
        "buen dia",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "hey",
        "que tal",
        "como estas",
        "hi",
        "hello",
      ])('should detect GREETING for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("GREETING");
        expect(result.keywords.length).toBeGreaterThan(0);
      });
    });

    describe("SALE_INTEREST intent", () => {
      it.each([
        "quiero comprar",
        "cuanto sale?",
        "precio",
        "precios",
        "cotizacion",
        "necesito cotizar",
        "presupuesto",
        "cuanto cuesta",
        "valor",
        "costo",
        "quiero ceramicos",
        "necesito porcelanato",
        "tienen stock?",
        "hay stock",
        "disponible",
        "catalogo",
        "lista de precios",
      ])('should detect SALE_INTEREST for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("SALE_INTEREST");
        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      });
    });

    describe("QUESTION intent", () => {
      it.each([
        "donde estan?",
        "cuando abren?",
        "como llego?",
        "cual es el horario?",
        "horario",
        "direccion",
        "ubicacion",
        "hacen envio?",
        "envios",
        "formas de pago",
        "pagos",
        "estan abierto?",
        "atienden hoy?",
        "trabajan sabados?",
      ])('should detect QUESTION for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("QUESTION");
      });
    });

    describe("FAREWELL intent", () => {
      it.each([
        "chau",
        "adios",
        "hasta luego",
        "nos vemos",
        "bye",
        "gracias por todo",
      ])('should detect FAREWELL for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("FAREWELL");
      });
    });

    describe("THANKS intent", () => {
      it.each([
        "gracias",
        "muchas gracias",
        "te agradezco",
        "agradezco la info",
        "thanks",
      ])('should detect THANKS for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("THANKS");
      });
    });

    describe("UNKNOWN intent", () => {
      it.each([
        "asdfghjkl",
        "xyz123",
        "...",
        "???",
        "",
      ])('should detect UNKNOWN for message "%s"', (message) => {
        const result = service.detect(message);
        expect(result.intent).toBe("UNKNOWN");
        expect(result.confidence).toBe(0);
      });
    });

    it("should normalize message to lowercase", () => {
      const result1 = service.detect("HOLA");
      const result2 = service.detect("hola");
      expect(result1.intent).toBe(result2.intent);
    });

    it("should trim whitespace", () => {
      const result = service.detect("  hola  ");
      expect(result.intent).toBe("GREETING");
    });
  });

  describe("isSaleIntent", () => {
    it("should return true for sale-related messages", () => {
      expect(service.isSaleIntent("quiero comprar ceramicos")).toBe(true);
      expect(service.isSaleIntent("cuanto sale el metro?")).toBe(true);
      expect(service.isSaleIntent("necesito cotizar")).toBe(true);
    });

    it("should return false for non-sale messages", () => {
      expect(service.isSaleIntent("hola")).toBe(false);
      expect(service.isSaleIntent("donde estan?")).toBe(false);
      expect(service.isSaleIntent("gracias")).toBe(false);
    });
  });

  describe("isGreeting", () => {
    it("should return true for greetings", () => {
      expect(service.isGreeting("hola")).toBe(true);
      expect(service.isGreeting("buenos dias")).toBe(true);
      expect(service.isGreeting("buenas tardes")).toBe(true);
    });

    it("should return false for non-greetings", () => {
      expect(service.isGreeting("quiero comprar")).toBe(false);
      expect(service.isGreeting("gracias")).toBe(false);
      expect(service.isGreeting("chau")).toBe(false);
    });
  });
});
