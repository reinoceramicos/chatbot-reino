import { Flow, FlowStep } from "../../domain/entities/flow.entity";

const steps = new Map<string, FlowStep>();

steps.set("welcome", {
  id: "welcome",
  prompt: {
    type: "button",
    body: "¡Hola! 👋 Bienvenido a *Reino Cerámicos*.\n\n¿En qué podemos ayudarte?",
    buttons: [
      { id: "menu_comprar", title: "Quiero comprar" },
      { id: "menu_consultas", title: "Tengo consultas" },
      { id: "menu_vendedor", title: "Hablar con vendedor" },
    ],
  },
  expectedInput: "button_reply",
  nextStep: (input: string) => {
    switch (input) {
      case "menu_comprar":
        return "FLOW:quotation";
      case "menu_consultas":
        return "FLOW:info";
      case "menu_vendedor":
        return "transfer_to_agent";
      default:
        return "welcome";
    }
  },
});

steps.set("transfer_to_agent", {
  id: "transfer_to_agent",
  prompt: {
    type: "text",
    body: "Perfecto, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
  },
  expectedInput: "none",
  transferToAgent: true,
  nextStep: "END",
});

steps.set("return_to_menu", {
  id: "return_to_menu",
  prompt: {
    type: "button",
    body: "¿Hay algo más en lo que pueda ayudarte?",
    buttons: [
      { id: "menu_comprar", title: "Quiero comprar" },
      { id: "menu_consultas", title: "Tengo consultas" },
      { id: "menu_finalizar", title: "No, gracias" },
    ],
  },
  expectedInput: "button_reply",
  nextStep: (input: string) => {
    switch (input) {
      case "menu_comprar":
        return "FLOW:quotation";
      case "menu_consultas":
        return "FLOW:info";
      case "menu_finalizar":
        return "farewell";
      default:
        return "return_to_menu";
    }
  },
});

steps.set("farewell", {
  id: "farewell",
  prompt: {
    type: "text",
    body: "¡Gracias por contactarnos! Si necesitas algo más, no dudes en escribirnos. ¡Hasta pronto! 👋",
  },
  expectedInput: "none",
  nextStep: "END",
});

export const mainMenuFlow = new Flow({
  name: "main_menu",
  description: "Menú principal del chatbot",
  steps,
  initialStep: "welcome",
  timeoutMinutes: 30,
});
