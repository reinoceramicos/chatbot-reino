import { Flow, FlowStep } from "../../domain/entities/flow.entity";

const steps = new Map<string, FlowStep>();

steps.set("ask_name", {
  id: "ask_name",
  prompt: {
    type: "text",
    body: "¡Hola! 👋 Bienvenido a *Reino Cerámicos*.\n\nPara poder ayudarte mejor, ¿cómo te llamas?",
  },
  expectedInput: "text",
  saveAs: "userName",
  nextStep: "confirm_name",
});

steps.set("confirm_name", {
  id: "confirm_name",
  dynamicPrompt: async (flowData: Record<string, any>) => {
    const userName = flowData.userName || "amigo";
    return {
      type: "button",
      body: `¡Mucho gusto, *${userName}*! 🙌\n\n¿En qué podemos ayudarte hoy?`,
      buttons: [
        { id: "menu_comprar", title: "Quiero comprar" },
        { id: "menu_consultas", title: "Tengo consultas" },
      ],
    };
  },
  expectedInput: "button_reply",
  confirmName: true, // Flag especial para confirmar el nombre
  nextStep: (input: string) => {
    switch (input) {
      case "menu_comprar":
        return "FLOW:quotation";
      case "menu_consultas":
        return "FLOW:info";
      default:
        return "confirm_name";
    }
  },
});

export const onboardingFlow = new Flow({
  name: "onboarding",
  description: "Flujo de bienvenida para usuarios nuevos",
  steps,
  initialStep: "ask_name",
  timeoutMinutes: 30,
});
