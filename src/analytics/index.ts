// Analytics Module - Public API

// DTOs
export * from "./application/dtos/analytics.dto";

// Ports
export * from "./domain/ports/analytics.repository.port";

// Services
export { AnalyticsService } from "./application/services/analytics.service";

// Infrastructure
export { PrismaAnalyticsRepository } from "./infrastructure/repositories/prisma-analytics.repository";
export { AnalyticsController } from "./infrastructure/controllers/analytics.controller";
export { analyticsRouter, analyticsService } from "./infrastructure/routes/analytics.routes";
