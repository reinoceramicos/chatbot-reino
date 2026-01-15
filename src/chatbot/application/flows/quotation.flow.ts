import { Flow, FlowStep, FlowStepPrompt } from "../../domain/entities/flow.entity";
import { getStoreService } from "../services/store.service";

// Flujo de cotización - guía al cliente para solicitar un presupuesto

const steps = new Map<string, FlowStep>();

// Step 1: Seleccionar categoría de producto
steps.set("select_category", {
  id: "select_category",
  prompt: {
    type: "list",
    body: "¡Excelente! Para prepararte una cotización, ¿qué tipo de producto te interesa?",
    header: "Cotización",
    buttonText: "Ver categorías",
    sections: [
      {
        title: "Pisos",
        rows: [
          { id: "cat_ceramico", title: "Cerámicos", description: "Pisos cerámicos varios" },
          { id: "cat_porcelanato", title: "Porcelanato", description: "Alta resistencia" },
          { id: "cat_vinilico", title: "Vinílicos", description: "Fácil instalación" },
        ],
      },
      {
        title: "Revestimientos",
        rows: [
          { id: "cat_azulejos", title: "Azulejos", description: "Para paredes" },
          { id: "cat_mosaicos", title: "Mosaicos", description: "Decorativos" },
        ],
      },
      {
        title: "Otros",
        rows: [
          { id: "cat_pegamentos", title: "Pegamentos", description: "Adhesivos y pastinas" },
          { id: "cat_otro", title: "Otro producto", description: "Consultar disponibilidad" },
        ],
      },
    ],
  },
  expectedInput: "list_reply",
  saveAs: "category",
  nextStep: "ask_details",
});

// Step 2: Pedir detalles del producto
steps.set("ask_details", {
  id: "ask_details",
  prompt: {
    type: "text",
    body: "¿Podrías darme más detalles? Por ejemplo: medidas, color, modelo o cualquier característica que busques.",
  },
  expectedInput: "text",
  saveAs: "details",
  nextStep: "ask_quantity",
});

// Step 3: Preguntar cantidad
steps.set("ask_quantity", {
  id: "ask_quantity",
  prompt: {
    type: "text",
    body: "¿Qué cantidad necesitas? (metros cuadrados, cajas, unidades)",
    footer: "Ejemplo: 50 m2, 10 cajas",
  },
  expectedInput: "text",
  saveAs: "quantity",
  nextStep: "ask_location_method",
});

// Step 3b: Preguntar método de ubicación (híbrido)
steps.set("ask_location_method", {
  id: "ask_location_method",
  prompt: {
    type: "button",
    body: "Para conectarte con el Reino más cercano, ¿cómo preferís indicar tu ubicación?",
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
    // Si elige GPS, el bot esperará el mensaje de ubicación
    return "waiting_location";
  },
});

// Step 3c: Esperando ubicación GPS
steps.set("waiting_location", {
  id: "waiting_location",
  prompt: {
    type: "text",
    body: "Perfecto, enviame tu ubicación usando el botón de adjuntar 📎 > Ubicación en WhatsApp.\n\n_Si preferís elegir la zona manualmente, escribí *zona*_",
  },
  expectedInput: "any", // Puede ser location o text (si escribe "zona")
  saveAs: "locationInput",
  nextStep: "ask_contact", // El procesamiento de ubicación se hace en bot.service
});

// Step 3d: Seleccionar zona manualmente
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

// Step 3e: Seleccionar tienda de la zona (dinámico desde base de datos)
steps.set("select_store", {
  id: "select_store",
  dynamicPrompt: async (flowData: Record<string, any>): Promise<FlowStepPrompt> => {
    const storeService = getStoreService();
    const selectedZone = flowData.selectedZone as string;

    // Fetch stores based on selected zone
    const stores = await storeService.getStoresByZoneId(selectedZone);

    // Build list rows from stores
    const rows = stores.map((store) => ({
      id: store.code,
      title: store.name,
      description: store.address.length > 72 ? store.address.substring(0, 69) + "..." : store.address,
    }));

    // WhatsApp lists support max 10 rows per section
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
  nextStep: "ask_contact",
});

// Step 4: Forma de contacto preferida
steps.set("ask_contact", {
  id: "ask_contact",
  prompt: {
    type: "button",
    body: "¿Cómo preferís que te contactemos con la cotización?",
    buttons: [
      { id: "contact_whatsapp", title: "Por WhatsApp" },
      { id: "contact_email", title: "Por Email" },
      { id: "contact_call", title: "Llamada" },
    ],
  },
  expectedInput: "button_reply",
  saveAs: "contactPreference",
  nextStep: (input: string, flowData: Record<string, any>) => {
    if (input === "contact_email") {
      return "ask_email";
    }
    return "confirm";
  },
});

// Step 4b: Pedir email si eligió esa opción
steps.set("ask_email", {
  id: "ask_email",
  prompt: {
    type: "text",
    body: "Por favor, indicame tu email para enviarte la cotización:",
  },
  expectedInput: "text",
  validation: (input: string) => {
    // Validación básica de email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  },
  errorMessage: "El email no parece válido. Por favor, ingresá un email correcto.",
  saveAs: "email",
  nextStep: "confirm",
});

// Step 5: Confirmar y finalizar
steps.set("confirm", {
  id: "confirm",
  prompt: {
    type: "button",
    body: "¡Perfecto! Voy a pasar tu consulta a un vendedor que te preparará la cotización. ¿Confirmamos?",
    footer: "Un vendedor te contactará a la brevedad",
    buttons: [
      { id: "confirm_yes", title: "Sí, confirmar" },
      { id: "confirm_no", title: "No, cancelar" },
    ],
  },
  expectedInput: "button_reply",
  nextStep: (input: string) => {
    if (input === "confirm_yes") {
      return "TRANSFER"; // Transferir a agente
    }
    return "cancelled";
  },
});

// Step: Flujo cancelado
steps.set("cancelled", {
  id: "cancelled",
  prompt: {
    type: "text",
    body: "Entendido, he cancelado la cotización. Si necesitas algo más, ¡estoy para ayudarte!",
  },
  expectedInput: "any",
  nextStep: "END",
});

export const quotationFlow = new Flow({
  name: "quotation",
  description: "Flujo para solicitar cotización de productos",
  steps,
  initialStep: "select_category",
  timeoutMinutes: 30,
});
