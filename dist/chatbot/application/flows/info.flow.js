"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoFlow = void 0;
const flow_entity_1 = require("../../domain/entities/flow.entity");
// Flujo de información - permite consultar horarios, ubicación, envíos, etc.
const steps = new Map();
// Step 1: Seleccionar tema de información
steps.set("select_topic", {
    id: "select_topic",
    prompt: {
        type: "list",
        body: "¿Sobre qué tema necesitas información?",
        header: "Información",
        buttonText: "Ver temas",
        sections: [
            {
                title: "Información General",
                rows: [
                    { id: "info_horarios", title: "Horarios", description: "Días y horarios de atención" },
                    { id: "info_ubicacion", title: "Ubicación", description: "Dirección y cómo llegar" },
                    { id: "info_contacto", title: "Contacto", description: "Teléfonos y redes sociales" },
                ],
            },
            {
                title: "Compras",
                rows: [
                    { id: "info_envios", title: "Envíos", description: "Zonas y costos de envío" },
                    { id: "info_pagos", title: "Formas de pago", description: "Medios de pago aceptados" },
                    { id: "info_garantia", title: "Garantía", description: "Políticas de garantía" },
                ],
            },
        ],
    },
    expectedInput: "list_reply",
    saveAs: "topic",
    nextStep: (input) => `show_${input.replace("info_", "")}`,
});
// Step: Mostrar horarios
steps.set("show_horarios", {
    id: "show_horarios",
    prompt: {
        type: "text",
        body: `🕐 *Horarios de atención*

📅 Lunes a Viernes: 8:00 a 18:00 hs
📅 Sábados: 8:00 a 13:00 hs
📅 Domingos y feriados: Cerrado

¡Te esperamos!`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Mostrar ubicación
steps.set("show_ubicacion", {
    id: "show_ubicacion",
    prompt: {
        type: "text",
        body: `📍 *Ubicación*

Dirección: Av. Ejemplo 1234, Ciudad
(A 2 cuadras de la estación de tren)

🚗 Estacionamiento disponible
🚌 Líneas de colectivo: 45, 67, 123

📌 Google Maps: [Link a ubicación]`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Mostrar contacto
steps.set("show_contacto", {
    id: "show_contacto",
    prompt: {
        type: "text",
        body: `📞 *Contacto*

📱 WhatsApp: +54 9 11 1234-5678
☎️ Teléfono: (011) 1234-5678
📧 Email: ventas@reinoceramicos.com

🌐 Redes sociales:
• Instagram: @reinoceramicos
• Facebook: /reinoceramicos`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Mostrar info de envíos
steps.set("show_envios", {
    id: "show_envios",
    prompt: {
        type: "text",
        body: `🚚 *Envíos*

✅ Envíos a todo el país
✅ Entregas en CABA y GBA en 24-48hs
✅ Interior: 3-5 días hábiles

💰 Costo de envío:
• CABA: Consultar
• GBA: Consultar según zona
• Interior: A cargo del comprador

📦 Retiro en local: Sin cargo`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Mostrar formas de pago
steps.set("show_pagos", {
    id: "show_pagos",
    prompt: {
        type: "text",
        body: `💳 *Formas de pago*

✅ Efectivo
✅ Transferencia bancaria
✅ Mercado Pago
✅ Tarjetas de débito
✅ Tarjetas de crédito (hasta 12 cuotas)

📌 Consultar promociones vigentes con tarjetas`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Mostrar garantía
steps.set("show_garantia", {
    id: "show_garantia",
    prompt: {
        type: "text",
        body: `🛡️ *Garantía*

✅ Garantía de fábrica en todos los productos
✅ 30 días para cambios por defectos
✅ Productos sellados y en perfecto estado

📋 Requisitos para cambios:
• Presentar ticket/factura
• Producto sin uso
• Embalaje original

❓ Consultas: ventas@reinoceramicos.com`,
    },
    expectedInput: "any",
    nextStep: "ask_more",
});
// Step: Preguntar si necesita más información
steps.set("ask_more", {
    id: "ask_more",
    prompt: {
        type: "button",
        body: "¿Necesitas información sobre otro tema?",
        buttons: [
            { id: "more_yes", title: "Sí, ver más" },
            { id: "more_no", title: "No, gracias" },
        ],
    },
    expectedInput: "button_reply",
    nextStep: (input) => {
        if (input === "more_yes") {
            return "select_topic";
        }
        return "END";
    },
});
exports.infoFlow = new flow_entity_1.Flow({
    name: "info",
    description: "Flujo para consultar información general",
    steps,
    initialStep: "select_topic",
    timeoutMinutes: 15,
});
