import { Flow, FlowStep, FlowStepPrompt } from "../../domain/entities/flow.entity";
import { getStoreService } from "../services/store.service";

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
        return "ask_location_method";
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
        rows: [
          { id: "zone_caba_norte", title: "CABA Norte", description: "Belgrano, Palermo, Núñez" },
          { id: "zone_caba_centro", title: "CABA Centro", description: "Caballito, Almagro, Boedo" },
          { id: "zone_caba_oeste", title: "CABA Oeste", description: "Flores, Liniers, Mataderos" },
        ],
      },
      {
        title: "Zona Norte GBA",
        rows: [
          { id: "zone_norte_gba", title: "Zona Norte GBA", description: "Vicente López, San Isidro, Tigre" },
        ],
      },
      {
        title: "Zona Sur GBA",
        rows: [
          { id: "zone_sur", title: "Zona Sur", description: "Quilmes, Lanús, Avellaneda, Lomas" },
        ],
      },
      {
        title: "Zona Oeste GBA",
        rows: [
          { id: "zone_oeste", title: "Zona Oeste", description: "Morón, San Justo, Ituzaingó, Merlo" },
        ],
      },
      {
        title: "La Plata",
        rows: [
          { id: "zone_la_plata", title: "La Plata", description: "La Plata y alrededores" },
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
