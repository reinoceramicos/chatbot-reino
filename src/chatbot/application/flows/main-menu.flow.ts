import { Flow, FlowStep, FlowStepPrompt } from "../../domain/entities/flow.entity";
import { getStoreService } from "../services/store.service";

const steps = new Map<string, FlowStep>();

steps.set("welcome", {
  id: "welcome",
  dynamicPrompt: async (flowData: Record<string, any>) => {
    const customerName = flowData.customerName;
    const greeting = customerName
      ? `¡Hola ${customerName}! 👋 Qué bueno verte de nuevo.\n\n¿En qué podemos ayudarte hoy?`
      : "¡Hola! 👋 Bienvenido a *Reino Cerámicos*.\n\n¿En qué podemos ayudarte?";

    return {
      type: "button",
      body: greeting,
      buttons: [
        { id: "menu_comprar", title: "Quiero comprar" },
        { id: "menu_consultas", title: "Tengo consultas" },
      ],
    };
  },
  expectedInput: "button_reply",
  nextStep: (input: string) => {
    switch (input) {
      case "menu_comprar":
        return "FLOW:quotation";
      case "menu_consultas":
        return "FLOW:info";
      default:
        return "welcome";
    }
  },
});

steps.set("ask_location_method", {
  id: "ask_location_method",
  prompt: {
    type: "button",
    body: "Para conectarte con el vendedor del Reino más cercano, ¿cómo preferís indicar tu ubicación?",
    header: "Ubicación",
    footer: "Tenemos 24 locales en Buenos Aires",
    buttons: [
      { id: "location_gps", title: "Compartir ubicación" },
      { id: "location_zone", title: "Elegir zona" },
    ],
  },
  expectedInput: "button_reply",
  saveAs: "locationMethod",
  nextStep: (input: string) => {
    if (input === "location_zone") {
      return "select_zone";
    }
    return "waiting_location";
  },
});

steps.set("waiting_location", {
  id: "waiting_location",
  prompt: {
    type: "text",
    body: "Perfecto, enviame tu ubicación usando el botón de adjuntar 📎 > Ubicación en WhatsApp.\n\n_Si preferís elegir la zona manualmente, escribí *zona*_",
  },
  expectedInput: "any",
  saveAs: "locationInput",
  nextStep: "transfer_to_agent",
});

steps.set("select_zone", {
  id: "select_zone",
  prompt: {
    type: "list",
    body: "Seleccioná la zona donde te encontrás:",
    buttonText: "Ver zonas",
    sections: [
      {
        title: "Capital Federal",
        rows: [{ id: "CABA", title: "CABA", description: "Paternal, Villa Crespo" }],
      },
      {
        title: "Zona Norte",
        rows: [
          {
            id: "ZONA_NORTE",
            title: "Zona Norte",
            description: "San Martín, Tigre, Nordelta, Maschwitz",
          },
        ],
      },
      {
        title: "Zona Noroeste",
        rows: [
          {
            id: "ZONA_NOROESTE",
            title: "Zona Noroeste",
            description: "Pilar, San Miguel, José C. Paz, Bella Vista",
          },
        ],
      },
      {
        title: "Zona Oeste",
        rows: [
          {
            id: "ZONA_OESTE",
            title: "Zona Oeste",
            description: "Moreno, Gral Rodriguez, Francisco Alvarez, Luján",
          },
        ],
      },
      {
        title: "Zona Sur",
        rows: [{ id: "ZONA_SUR", title: "Zona Sur", description: "Cañuelas, Berazategui" }],
      },
      {
        title: "Zona Norte Lejano",
        rows: [
          {
            id: "ZONA_NORTE_LEJANO",
            title: "Zona Norte Lejano",
            description: "Campana, Capilla del Señor",
          },
        ],
      },
    ],
  },
  expectedInput: "list_reply",
  saveAs: "selectedZone",
  nextStep: "select_store",
});

steps.set("select_store", {
  id: "select_store",
  dynamicPrompt: async (flowData: Record<string, any>): Promise<FlowStepPrompt> => {
    const storeService = getStoreService();
    const selectedZone = flowData.selectedZone as string;

    const stores = await storeService.getStoresByZoneId(selectedZone);

    const rows = stores.map((store) => ({
      id: store.code,
      title: store.name,
      description: store.address.length > 72 ? store.address.substring(0, 69) + "..." : store.address,
    }));

    const maxRows = Math.min(rows.length, 10);

    return {
      type: "list",
      body: stores.length > 0
        ? "Estos son los Reinos disponibles en tu zona. ¿Cuál te queda más cómodo?"
        : "Estos son nuestros Reinos disponibles. ¿Cuál te queda más cómodo?",
      buttonText: "Ver Reinos",
      sections: [
        {
          title: "Reinos disponibles",
          rows: rows.slice(0, maxRows),
        },
      ],
    };
  },
  expectedInput: "list_reply",
  saveAs: "selectedStoreCode",
  nextStep: "transfer_to_agent",
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
