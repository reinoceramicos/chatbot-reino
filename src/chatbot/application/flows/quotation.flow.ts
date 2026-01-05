import { Flow, FlowStep } from "../../domain/entities/flow.entity";

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
