import { AutoResponseService } from "../auto-response.service";
import {
  AutoResponse,
  AutoResponseRepositoryPort,
} from "../../../domain/ports/auto-response.repository.port";

// Mock del repositorio
const createMockRepository = (
  responses: AutoResponse[] = []
): AutoResponseRepositoryPort => ({
  findAll: jest.fn().mockResolvedValue(responses),
  findByCategory: jest.fn().mockResolvedValue(responses),
  findActive: jest.fn().mockResolvedValue(responses),
});

describe("AutoResponseService", () => {
  describe("findMatch", () => {
    describe("keyword trigger type", () => {
      it("should match when keyword is found in message", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "horario",
            triggerType: "keyword",
            response: "Nuestro horario es de 8 a 18hs",
            category: "horarios",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("cual es el horario?");

        expect(result.matched).toBe(true);
        expect(result.response).toBe("Nuestro horario es de 8 a 18hs");
        expect(result.category).toBe("horarios");
      });

      it("should match case-insensitively", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "horario",
            triggerType: "keyword",
            response: "Horario response",
            category: "horarios",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("HORARIO DE ATENCION");

        expect(result.matched).toBe(true);
      });

      it("should not match when keyword is not in message", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "horario",
            triggerType: "keyword",
            response: "Horario response",
            category: "horarios",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("hola como estas");

        expect(result.matched).toBe(false);
        expect(result.response).toBeUndefined();
      });
    });

    describe("exact trigger type", () => {
      it("should match when message is exactly the trigger", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "hola",
            triggerType: "exact",
            response: "Hola! Bienvenido",
            category: "saludos",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("hola");

        expect(result.matched).toBe(true);
        expect(result.response).toBe("Hola! Bienvenido");
      });

      it("should not match partial messages for exact type", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "hola",
            triggerType: "exact",
            response: "Hola! Bienvenido",
            category: "saludos",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("hola como estas");

        expect(result.matched).toBe(false);
      });
    });

    describe("regex trigger type", () => {
      it("should match using regex pattern", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "precio.*ceramico",
            triggerType: "regex",
            response: "Los precios varian segun el modelo",
            category: "precios",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("precio del ceramico");

        expect(result.matched).toBe(true);
      });

      it("should handle invalid regex gracefully", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "[invalid regex(",
            triggerType: "regex",
            response: "Test",
            category: "test",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("test message");

        expect(result.matched).toBe(false);
      });
    });

    describe("startswith trigger type", () => {
      it("should match when message starts with trigger", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "quiero",
            triggerType: "startswith",
            response: "Que necesitas?",
            category: "ventas",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("quiero comprar ceramicos");

        expect(result.matched).toBe(true);
      });

      it("should not match when trigger is in middle", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "quiero",
            triggerType: "startswith",
            response: "Test",
            category: "test",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("hola quiero comprar");

        expect(result.matched).toBe(false);
      });
    });

    describe("priority ordering", () => {
      it("should return first match (ordered by priority from repository)", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "envio",
            triggerType: "keyword",
            response: "Respuesta de envio",
            category: "envios",
            priority: 10,
            isActive: true,
          },
          {
            id: "2",
            trigger: "envio gratis",
            triggerType: "keyword",
            response: "Envio gratis mayor a $50000",
            category: "envios",
            priority: 5,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        const result = await service.findMatch("tienen envio gratis?");

        expect(result.matched).toBe(true);
        expect(result.response).toBe("Respuesta de envio");
      });
    });

    describe("caching", () => {
      it("should cache responses and not call repository multiple times", async () => {
        const mockResponses: AutoResponse[] = [
          {
            id: "1",
            trigger: "test",
            triggerType: "keyword",
            response: "Test response",
            category: "test",
            priority: 10,
            isActive: true,
          },
        ];

        const repository = createMockRepository(mockResponses);
        const service = new AutoResponseService(repository);

        await service.findMatch("test 1");
        await service.findMatch("test 2");
        await service.findMatch("test 3");

        expect(repository.findActive).toHaveBeenCalledTimes(1);
      });
    });

    describe("reloadCache", () => {
      it("should force reload from repository", async () => {
        const repository = createMockRepository([]);
        const service = new AutoResponseService(repository);

        await service.findMatch("test");
        await service.reloadCache();
        await service.findMatch("test2");

        expect(repository.findActive).toHaveBeenCalledTimes(3);
      });
    });
  });
});
