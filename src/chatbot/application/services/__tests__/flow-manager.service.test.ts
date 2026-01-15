import { FlowManagerService } from "../flow-manager.service";
import { Conversation } from "../../../domain/entities/conversation.entity";
import { Flow, FlowStep, FlowDefinition } from "../../../domain/entities/flow.entity";

// Create a simple test flow using the Flow class
const createTestFlow = (): Flow => {
  const steps = new Map<string, FlowStep>();

  steps.set("step1", {
    id: "step1",
    prompt: {
      type: "button",
      body: "Choose an option",
      buttons: [
        { id: "opt1", title: "Option 1" },
        { id: "opt2", title: "Option 2" },
      ],
    },
    expectedInput: "button_reply",
    saveAs: "choice",
    nextStep: (input: string) => (input === "opt1" ? "step2" : "step3"),
  });

  steps.set("step2", {
    id: "step2",
    prompt: {
      type: "text",
      body: "You chose option 1. Enter some text:",
    },
    expectedInput: "text",
    validation: (input: string) => input.length >= 3,
    errorMessage: "Text must be at least 3 characters",
    saveAs: "text1",
    nextStep: "final",
  });

  steps.set("step3", {
    id: "step3",
    prompt: {
      type: "text",
      body: "You chose option 2. Enter some text:",
    },
    expectedInput: "text",
    saveAs: "text2",
    nextStep: "final",
  });

  steps.set("final", {
    id: "final",
    prompt: {
      type: "text",
      body: "Thank you! Flow completed.",
    },
    expectedInput: "any",
    nextStep: "END",
  });

  return new Flow({
    name: "test",
    description: "Test flow",
    steps,
    initialStep: "step1",
    timeoutMinutes: 30,
  });
};

describe("FlowManagerService", () => {
  let flowManager: FlowManagerService;
  const testWaId = "5491155556666";
  const testFlowType = "quotation" as const; // Use a valid FlowType

  beforeEach(() => {
    flowManager = new FlowManagerService();
    // Register our test flow under the quotation flow type for testing
    flowManager.registerFlow(testFlowType, createTestFlow());
  });

  describe("registerFlow", () => {
    it("should register a flow", () => {
      const newSteps = new Map<string, FlowStep>();
      newSteps.set("start", {
        id: "start",
        prompt: { type: "text", body: "Start" },
        expectedInput: "any",
        nextStep: "END",
      });

      const newFlow = new Flow({
        name: "info",
        description: "Info flow",
        steps: newSteps,
        initialStep: "start",
        timeoutMinutes: 60,
      });

      flowManager.registerFlow("info", newFlow);
      const flow = flowManager.getFlow("info");

      expect(flow).toBeDefined();
      expect(flow?.name).toBe("info");
    });
  });

  describe("getFlow", () => {
    it("should return registered flow", () => {
      const flow = flowManager.getFlow(testFlowType);

      expect(flow).toBeDefined();
      expect(flow?.name).toBe("test");
    });

    it("should return undefined for unregistered flow", () => {
      const flow = flowManager.getFlow("nonexistent");

      expect(flow).toBeUndefined();
    });
  });

  describe("startFlow", () => {
    it("should start a registered flow", async () => {
      const result = await flowManager.startFlow(testFlowType, testWaId);

      expect(result).toBeDefined();
      expect(result?.newFlowStep).toBe("step1");
      expect(result?.message).toBeDefined();
    });

    it("should return null for unregistered flow", async () => {
      const result = await flowManager.startFlow(null, testWaId);

      expect(result).toBeNull();
    });

    it("should return interactive message for button step", async () => {
      const result = await flowManager.startFlow(testFlowType, testWaId);

      expect(result?.message?.type).toBe("interactive");
      expect(result?.message?.content.interactive?.type).toBe("button");
    });
  });

  describe("hasActiveFlow", () => {
    it("should return true when conversation has active flow", () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step1",
        flowStartedAt: new Date(),
      });

      const result = flowManager.hasActiveFlow(conversation);

      expect(result).toBe(true);
    });

    it("should return false when conversation has no flow", () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
      });

      const result = flowManager.hasActiveFlow(conversation);

      expect(result).toBe(false);
    });

    it("should return false when flow has timed out", () => {
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 60); // 60 minutes ago

      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step1",
        flowStartedAt: oldDate,
      });

      const result = flowManager.hasActiveFlow(conversation);

      expect(result).toBe(false);
    });

    it("should return true when flow is within timeout", () => {
      const recentDate = new Date();
      recentDate.setMinutes(recentDate.getMinutes() - 5); // 5 minutes ago

      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step1",
        flowStartedAt: recentDate,
      });

      const result = flowManager.hasActiveFlow(conversation);

      expect(result).toBe(true);
    });
  });

  describe("processFlowInput", () => {
    it("should process button reply and advance to next step", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step1",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "opt1",
        "button_reply",
        testWaId
      );

      expect(result).toBeDefined();
      expect(result?.newFlowStep).toBe("step2");
    });

    it("should process text input and advance to next step", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step2",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "valid text",
        "text",
        testWaId
      );

      expect(result).toBeDefined();
      expect(result?.newFlowStep).toBe("final");
    });

    it("should return validation error for invalid input", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step2",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "ab", // Too short, validation requires >= 3
        "text",
        testWaId
      );

      expect(result).toBeDefined();
      expect(result?.newFlowStep).toBe("step2"); // Stays on same step
      expect(result?.message?.content.text?.body).toContain("at least 3");
    });

    it("should mark flow as completed when reaching final step", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "final",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "anything",
        "text",
        testWaId
      );

      expect(result).toBeDefined();
      expect(result?.flowCompleted).toBe(true);
    });

    it("should return null for unregistered flow type", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: "info", // info flow is not registered in this test
        flowStep: "step1",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "test",
        "text",
        testWaId
      );

      expect(result).toBeNull();
    });

    it("should store input in flowData using saveAs", async () => {
      const conversation = new Conversation({
        id: "conv-1",
        customerId: "cust-1",
        status: "BOT",
        flowType: testFlowType,
        flowStep: "step1",
        flowStartedAt: new Date(),
      });

      const result = await flowManager.processFlowInput(
        conversation,
        "opt1",
        "button_reply",
        testWaId
      );

      expect(result?.newFlowData).toBeDefined();
      expect(result?.newFlowData?.choice).toBe("opt1");
    });
  });

  describe("isCancelCommand", () => {
    it("should detect cancel command", () => {
      expect(flowManager.isCancelCommand("cancelar")).toBe(true);
      expect(flowManager.isCancelCommand("salir")).toBe(true);
      expect(flowManager.isCancelCommand("volver")).toBe(true);
      expect(flowManager.isCancelCommand("atras")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(flowManager.isCancelCommand("CANCELAR")).toBe(true);
      expect(flowManager.isCancelCommand("Salir")).toBe(true);
    });

    it("should return false for non-cancel messages", () => {
      expect(flowManager.isCancelCommand("hola")).toBe(false);
      expect(flowManager.isCancelCommand("quiero comprar")).toBe(false);
    });
  });

  describe("cancelFlow", () => {
    it("should return cancel message", () => {
      const result = flowManager.cancelFlow(testWaId);

      expect(result).toBeDefined();
      expect(result.type).toBe("text");
      expect(result.content.text?.body).toContain("cancelado");
    });
  });
});
