import { AutoResponse, AutoResponseRepositoryPort } from "../../domain/ports/auto-response.repository.port";

export interface MatchResult {
  matched: boolean;
  response?: string;
  category?: string;
}

export class AutoResponseService {
  private responses: AutoResponse[] = [];
  private lastLoadTime = 0;
  private readonly cacheDuration = 60000; // 1 minuto de cache

  constructor(private readonly autoResponseRepository: AutoResponseRepositoryPort) {}

  async findMatch(message: string): Promise<MatchResult> {
    await this.loadResponsesIfNeeded();

    const normalizedMessage = message.toLowerCase().trim();

    for (const autoResponse of this.responses) {
      if (this.matches(normalizedMessage, autoResponse)) {
        return {
          matched: true,
          response: autoResponse.response,
          category: autoResponse.category,
        };
      }
    }

    return { matched: false };
  }

  private matches(message: string, autoResponse: AutoResponse): boolean {
    const trigger = autoResponse.trigger.toLowerCase();

    switch (autoResponse.triggerType) {
      case "keyword":
        // Busca la palabra clave en el mensaje
        return message.includes(trigger);

      case "exact":
        // Match exacto
        return message === trigger;

      case "regex":
        // Expresión regular
        try {
          const regex = new RegExp(trigger, "i");
          return regex.test(message);
        } catch {
          return false;
        }

      case "startswith":
        return message.startsWith(trigger);

      default:
        return message.includes(trigger);
    }
  }

  private async loadResponsesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastLoadTime > this.cacheDuration) {
      this.responses = await this.autoResponseRepository.findActive();
      this.lastLoadTime = now;
    }
  }

  // Forzar recarga del cache
  async reloadCache(): Promise<void> {
    this.responses = await this.autoResponseRepository.findActive();
    this.lastLoadTime = Date.now();
  }
}
