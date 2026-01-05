import { quotationFlow } from "../quotation.flow";
import { FlowStep } from "../../../domain/entities/flow.entity";

describe("Quotation Flow", () => {
  describe("flow definition", () => {
    it("should have correct name", () => {
      expect(quotationFlow.name).toBe("quotation");
    });

    it("should have a description", () => {
      expect(quotationFlow.description).toBeDefined();
      expect(quotationFlow.description.length).toBeGreaterThan(0);
    });

    it("should have timeout configured", () => {
      expect(quotationFlow.timeoutMinutes).toBeGreaterThan(0);
    });

    it("should have steps defined", () => {
      expect(quotationFlow.steps).toBeDefined();
      expect(quotationFlow.steps.size).toBeGreaterThan(0);
    });

    it("should have initial step defined", () => {
      expect(quotationFlow.initialStep).toBeDefined();
      expect(quotationFlow.hasStep(quotationFlow.initialStep)).toBe(true);
    });
  });

  describe("steps", () => {
    it("should start with select_category step", () => {
      expect(quotationFlow.initialStep).toBe("select_category");
    });

    it("should have all required steps", () => {
      expect(quotationFlow.hasStep("select_category")).toBe(true);
      expect(quotationFlow.hasStep("ask_details")).toBe(true);
      expect(quotationFlow.hasStep("ask_quantity")).toBe(true);
      expect(quotationFlow.hasStep("ask_contact")).toBe(true);
      expect(quotationFlow.hasStep("confirm")).toBe(true);
    });

    describe("select_category step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("select_category")!;
      });

      it("should be a list type", () => {
        expect(step.prompt.type).toBe("list");
      });

      it("should have a prompt with sections", () => {
        expect(step.prompt.body).toBeDefined();
        expect(step.prompt.sections).toBeDefined();
        expect(step.prompt.sections!.length).toBeGreaterThan(0);
      });

      it("should have product categories in sections", () => {
        const section = step.prompt.sections![0];
        expect(section.rows).toBeDefined();
        expect(section.rows!.length).toBeGreaterThan(0);
      });

      it("should navigate to ask_details", () => {
        expect(step.nextStep).toBe("ask_details");
      });

      it("should expect list_reply input", () => {
        expect(step.expectedInput).toBe("list_reply");
      });

      it("should have buttonText for the list", () => {
        expect(step.prompt.buttonText).toBeDefined();
      });
    });

    describe("ask_details step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("ask_details")!;
      });

      it("should be a text type", () => {
        expect(step.prompt.type).toBe("text");
      });

      it("should expect text input", () => {
        expect(step.expectedInput).toBe("text");
      });

      it("should navigate to ask_quantity", () => {
        expect(step.nextStep).toBe("ask_quantity");
      });
    });

    describe("ask_quantity step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("ask_quantity")!;
      });

      it("should be a text type", () => {
        expect(step.prompt.type).toBe("text");
      });

      it("should navigate to ask_contact", () => {
        expect(step.nextStep).toBe("ask_contact");
      });
    });

    describe("ask_contact step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("ask_contact")!;
      });

      it("should be a button type", () => {
        expect(step.prompt.type).toBe("button");
      });

      it("should have contact preference buttons", () => {
        expect(step.prompt.buttons).toBeDefined();
        expect(step.prompt.buttons!.length).toBeGreaterThanOrEqual(2);
      });

      it("should have WhatsApp option", () => {
        const hasWhatsApp = step.prompt.buttons!.some(
          (b) => b.id.includes("whatsapp") || b.title.toLowerCase().includes("whatsapp")
        );
        expect(hasWhatsApp).toBe(true);
      });

      it("should have email option", () => {
        const hasEmail = step.prompt.buttons!.some(
          (b) => b.id.includes("email") || b.title.toLowerCase().includes("email")
        );
        expect(hasEmail).toBe(true);
      });

      it("should have dynamic nextStep function", () => {
        expect(typeof step.nextStep).toBe("function");
      });

      it("should navigate to ask_email for email selection", () => {
        const nextStepFn = step.nextStep as (input: string, data: Record<string, any>) => string;
        expect(nextStepFn("contact_email", {})).toBe("ask_email");
      });

      it("should navigate to confirm for whatsapp selection", () => {
        const nextStepFn = step.nextStep as (input: string, data: Record<string, any>) => string;
        expect(nextStepFn("contact_whatsapp", {})).toBe("confirm");
      });
    });

    describe("ask_email step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("ask_email")!;
      });

      it("should be a text type", () => {
        expect(step.prompt.type).toBe("text");
      });

      it("should have email validation", () => {
        expect(step.validation).toBeDefined();
      });

      it("should accept valid email", () => {
        expect(step.validation!("test@example.com")).toBe(true);
        expect(step.validation!("user.name@domain.co")).toBe(true);
      });

      it("should reject invalid email", () => {
        expect(step.validation!("invalid")).toBe(false);
        expect(step.validation!("no@")).toBe(false);
        expect(step.validation!("@domain.com")).toBe(false);
      });

      it("should navigate to confirm", () => {
        expect(step.nextStep).toBe("confirm");
      });
    });

    describe("confirm step", () => {
      let step: FlowStep;

      beforeAll(() => {
        step = quotationFlow.getStep("confirm")!;
      });

      it("should be a button type", () => {
        expect(step.prompt.type).toBe("button");
      });

      it("should have confirm/cancel buttons", () => {
        expect(step.prompt.buttons).toBeDefined();
        expect(step.prompt.buttons!.length).toBeGreaterThanOrEqual(2);
      });

      it("should have dynamic nextStep function", () => {
        expect(typeof step.nextStep).toBe("function");
      });

      it("should transfer to agent when confirmed", () => {
        const nextStepFn = step.nextStep as (input: string) => string;
        expect(nextStepFn("confirm_yes")).toBe("TRANSFER");
      });

      it("should cancel when user declines", () => {
        const nextStepFn = step.nextStep as (input: string) => string;
        expect(nextStepFn("confirm_no")).toBe("cancelled");
      });
    });
  });

  describe("getInitialStep", () => {
    it("should return the initial step", () => {
      const initialStep = quotationFlow.getInitialStep();
      expect(initialStep).toBeDefined();
      expect(initialStep!.id).toBe("select_category");
    });
  });

  describe("createMessageForStep", () => {
    const testWaId = "5491155556666";

    it("should create list message for select_category", () => {
      const step = quotationFlow.getStep("select_category")!;
      const message = quotationFlow.createMessageForStep(step, testWaId);

      expect(message.type).toBe("interactive");
      expect(message.to).toBe(testWaId);
      expect(message.content.interactive?.type).toBe("list");
    });

    it("should create text message for ask_details", () => {
      const step = quotationFlow.getStep("ask_details")!;
      const message = quotationFlow.createMessageForStep(step, testWaId);

      expect(message.type).toBe("text");
      expect(message.to).toBe(testWaId);
    });

    it("should create button message for ask_contact", () => {
      const step = quotationFlow.getStep("ask_contact")!;
      const message = quotationFlow.createMessageForStep(step, testWaId);

      expect(message.type).toBe("interactive");
      expect(message.content.interactive?.type).toBe("button");
    });
  });
});
