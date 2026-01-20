import {
  FlowDefinition as DbFlowDefinition,
  FlowStep as DbFlowStep,
} from "../../../flows/domain/entities/flow.entity";
import { FlowRepositoryPort } from "../../../flows/domain/ports/flow.repository.port";
import {
  Flow,
  FlowStep,
  FlowStepPrompt,
  FlowDefinition,
  ExpectedInputType,
} from "../../domain/entities/flow.entity";
import { InteractiveButton, InteractiveListSection, InteractiveListRow } from "../../../messaging/domain/entities/message.entity";
import { StoreService } from "./store.service";

/**
 * Service that loads flow definitions from the database
 * and converts them to runtime Flow objects
 */
export class DynamicFlowLoaderService {
  constructor(
    private readonly flowRepository: FlowRepositoryPort,
    private readonly storeService: StoreService
  ) {}

  /**
   * Loads all active flows from the database and converts them to runtime format
   */
  async loadAllFlows(): Promise<Map<string, Flow>> {
    const dbFlows = await this.flowRepository.findAll();
    const flows = new Map<string, Flow>();

    for (const dbFlow of dbFlows) {
      if (dbFlow.isActive) {
        const flow = this.convertToRuntimeFlow(dbFlow);
        flows.set(dbFlow.code, flow);
      }
    }

    return flows;
  }

  /**
   * Loads a single flow by code
   */
  async loadFlow(code: string): Promise<Flow | null> {
    const dbFlow = await this.flowRepository.findByCode(code);
    if (!dbFlow || !dbFlow.isActive) {
      return null;
    }
    return this.convertToRuntimeFlow(dbFlow);
  }

  /**
   * Loads the default flow
   */
  async loadDefaultFlow(): Promise<Flow | null> {
    const dbFlow = await this.flowRepository.findDefault();
    if (!dbFlow) {
      return null;
    }
    return this.convertToRuntimeFlow(dbFlow);
  }

  /**
   * Converts a database FlowDefinition to a runtime Flow
   */
  private convertToRuntimeFlow(dbFlow: DbFlowDefinition): Flow {
    const steps = new Map<string, FlowStep>();

    for (const dbStep of dbFlow.steps) {
      const step = this.convertToRuntimeStep(dbStep);
      steps.set(dbStep.id!, step);
      // Also map by code for convenience
      steps.set(dbStep.code, step);
    }

    const definition: FlowDefinition = {
      name: dbFlow.name,
      description: dbFlow.description || "",
      steps,
      initialStep: dbFlow.initialStepId || this.getFirstStepId(dbFlow),
      timeoutMinutes: dbFlow.timeoutMinutes,
    };

    return new Flow(definition);
  }

  private getFirstStepId(dbFlow: DbFlowDefinition): string {
    const sortedSteps = [...dbFlow.steps].sort((a, b) => a.order - b.order);
    return sortedSteps[0]?.id || sortedSteps[0]?.code || "";
  }

  /**
   * Converts a database FlowStep to a runtime FlowStep
   */
  private convertToRuntimeStep(dbStep: DbFlowStep): FlowStep {
    const hasDynamicDataSource = !!dbStep.dynamicDataSource;

    const step: FlowStep = {
      id: dbStep.id!,
      expectedInput: this.mapExpectedInput(dbStep.expectedInput),
      saveAs: dbStep.saveResponseAs || undefined,
      errorMessage: dbStep.errorMessage || undefined,
      transferToAgent: dbStep.transferToAgent,
      nextStep: this.createNextStepResolver(dbStep),
    };

    // If the step has a dynamic data source, create a dynamic prompt
    if (hasDynamicDataSource) {
      step.dynamicPrompt = this.createDynamicPrompt(dbStep);
    } else {
      step.prompt = this.createStaticPrompt(dbStep);
    }

    // Add validation if regex is provided
    if (dbStep.validationRegex) {
      const regex = new RegExp(dbStep.validationRegex);
      step.validation = (input: string) => regex.test(input);
    }

    return step;
  }

  /**
   * Maps database expected input to runtime format
   */
  private mapExpectedInput(dbInput: string): ExpectedInputType {
    const mapping: Record<string, ExpectedInputType> = {
      TEXT: "text",
      BUTTON_REPLY: "button_reply",
      LIST_REPLY: "list_reply",
      LOCATION: "any", // Location comes as any type
      ANY: "any",
      NONE: "none",
    };
    return mapping[dbInput] || "text";
  }

  /**
   * Creates a static prompt from database step
   */
  private createStaticPrompt(dbStep: DbFlowStep): FlowStepPrompt {
    const type = this.mapStepType(dbStep.stepType);

    const prompt: FlowStepPrompt = {
      type,
      body: dbStep.messageBody,
      header: dbStep.messageHeader || undefined,
      footer: dbStep.messageFooter || undefined,
    };

    // Add buttons if step type is button
    if (type === "button" && dbStep.options.length > 0) {
      prompt.buttons = dbStep.options
        .sort((a, b) => a.order - b.order)
        .map((opt) => ({
          id: opt.optionId,
          title: opt.title,
        }));
    }

    // Add sections if step type is list
    if (type === "list" && dbStep.options.length > 0) {
      prompt.buttonText = dbStep.listButtonText || "Ver opciones";
      prompt.sections = this.createSections(dbStep.options);
    }

    return prompt;
  }

  /**
   * Creates a dynamic prompt function for steps with dynamic data sources
   */
  private createDynamicPrompt(
    dbStep: DbFlowStep
  ): (flowData: Record<string, any>) => Promise<FlowStepPrompt> {
    return async (flowData: Record<string, any>): Promise<FlowStepPrompt> => {
      const type = this.mapStepType(dbStep.stepType);

      // Interpolate variables in message body
      let body = this.interpolateVariables(dbStep.messageBody, flowData);

      const prompt: FlowStepPrompt = {
        type,
        body,
        header: dbStep.messageHeader ? this.interpolateVariables(dbStep.messageHeader, flowData) : undefined,
        footer: dbStep.messageFooter ? this.interpolateVariables(dbStep.messageFooter, flowData) : undefined,
      };

      // Handle dynamic data sources
      if (dbStep.dynamicDataSource) {
        const dynamicOptions = await this.resolveDynamicDataSource(
          dbStep.dynamicDataSource,
          flowData
        );

        if (type === "button") {
          prompt.buttons = dynamicOptions.slice(0, 3).map((opt) => ({
            id: opt.id,
            title: opt.title.slice(0, 20), // WhatsApp limit
          }));
        } else if (type === "list") {
          prompt.buttonText = dbStep.listButtonText || "Ver opciones";
          prompt.sections = [
            {
              title: "Opciones",
              rows: dynamicOptions.map((opt) => ({
                id: opt.id,
                title: opt.title,
                description: opt.description,
              })),
            },
          ];
        }
      }

      return prompt;
    };
  }

  /**
   * Resolves dynamic data sources to options
   */
  private async resolveDynamicDataSource(
    source: string,
    flowData: Record<string, any>
  ): Promise<Array<{ id: string; title: string; description?: string }>> {
    switch (source) {
      case "stores_by_zone":
        return this.getStoresByZone(flowData);
      case "all_stores":
        return this.getAllStores();
      case "all_zones":
        return this.getAllZones();
      default:
        return [];
    }
  }

  private async getStoresByZone(
    flowData: Record<string, any>
  ): Promise<Array<{ id: string; title: string; description?: string }>> {
    const selectedZone = flowData.selectedZone;
    if (!selectedZone) {
      return this.getAllStores();
    }

    // Map zone option IDs to zone codes
    const zoneMapping: Record<string, string> = {
      zone_caba_norte: "CABA_NORTE",
      zone_caba_centro: "CABA_CENTRO",
      zone_caba_oeste: "CABA_OESTE",
      zone_norte_gba: "ZONA_NORTE_GBA",
      zone_sur: "ZONA_SUR",
      zone_oeste: "ZONA_OESTE",
      zone_la_plata: "LA_PLATA",
    };

    const zoneCode = zoneMapping[selectedZone] || selectedZone;
    const stores = await this.storeService.getStoresByZone(zoneCode);

    return stores.map((store) => ({
      id: store.code,
      title: store.name.replace("Reino ", "").slice(0, 24),
      description: store.address?.slice(0, 72),
    }));
  }

  private async getAllStores(): Promise<
    Array<{ id: string; title: string; description?: string }>
  > {
    const stores = await this.storeService.getAllStores();
    return stores.map((store) => ({
      id: store.code,
      title: store.name.replace("Reino ", "").slice(0, 24),
      description: store.address?.slice(0, 72),
    }));
  }

  private async getAllZones(): Promise<
    Array<{ id: string; title: string; description?: string }>
  > {
    const zones = await this.storeService.getAllZones();
    return zones.map((zone) => ({
      id: zone.code,
      title: zone.name,
    }));
  }

  /**
   * Maps database step type to runtime format
   */
  private mapStepType(dbType: string): "text" | "button" | "list" {
    const mapping: Record<string, "text" | "button" | "list"> = {
      TEXT: "text",
      BUTTON: "button",
      LIST: "list",
      LOCATION_REQUEST: "text",
      DYNAMIC_LIST: "list",
    };
    return mapping[dbType] || "text";
  }

  /**
   * Creates sections from flat options list
   */
  private createSections(
    options: DbFlowStep["options"]
  ): InteractiveListSection[] {
    const sectionMap = new Map<string, InteractiveListRow[]>();

    const sortedOptions = [...options].sort((a, b) => a.order - b.order);

    for (const opt of sortedOptions) {
      const sectionName = opt.section || "Opciones";
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push({
        id: opt.optionId,
        title: opt.title,
        description: opt.description || undefined,
      });
    }

    return Array.from(sectionMap.entries()).map(([title, rows]) => ({
      title,
      rows,
    }));
  }

  /**
   * Creates the next step resolver function
   */
  private createNextStepResolver(
    dbStep: DbFlowStep
  ): string | ((input: string, flowData: Record<string, any>) => string) {
    // If step has switchToFlow, return FLOW: prefix
    if (dbStep.switchToFlow) {
      return `FLOW:${dbStep.switchToFlow}`;
    }

    // If step has transferToAgent, return TRANSFER
    if (dbStep.transferToAgent) {
      return "TRANSFER";
    }

    // If there are no transitions, use default next step or END
    if (dbStep.transitions.length === 0) {
      return dbStep.defaultNextStepId || "END";
    }

    // If there's only one transition with wildcard, use it
    if (dbStep.transitions.length === 1 && dbStep.transitions[0].condition === "*") {
      const t = dbStep.transitions[0];
      if (t.switchToFlow) {
        return `FLOW:${t.switchToFlow}`;
      }
      return t.nextStepId || dbStep.defaultNextStepId || "END";
    }

    // Otherwise, create a resolver function
    return (input: string, _flowData: Record<string, any>): string => {
      const sortedTransitions = [...dbStep.transitions].sort(
        (a, b) => a.order - b.order
      );

      for (const transition of sortedTransitions) {
        if (transition.condition === input || transition.condition === "*") {
          if (transition.switchToFlow) {
            return `FLOW:${transition.switchToFlow}`;
          }
          return transition.nextStepId || dbStep.defaultNextStepId || "END";
        }
      }

      // Default fallback
      return dbStep.defaultNextStepId || "END";
    };
  }

  /**
   * Interpolates variables in text like {storeName}
   */
  private interpolateVariables(
    text: string,
    flowData: Record<string, any>
  ): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return flowData[key] !== undefined ? String(flowData[key]) : match;
    });
  }
}
