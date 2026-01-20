import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedFlows() {
  console.log("Seeding flows...");

  // Limpiar flows existentes
  await prisma.flowStepTransition.deleteMany();
  await prisma.flowStepOption.deleteMany();
  await prisma.flowStep.deleteMany();
  await prisma.flowDefinition.deleteMany();

  const mainMenu = await prisma.flowDefinition.create({
    data: {
      code: "main_menu",
      name: "Menú Principal",
      description: "Menú de bienvenida del chatbot",
      isActive: true,
      isDefault: true,
      timeoutMinutes: 30,
    },
  });

  // Step: Bienvenida
  const welcomeStep = await prisma.flowStep.create({
    data: {
      flowId: mainMenu.id,
      code: "welcome",
      name: "Bienvenida",
      order: 0,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "¡Hola! 👋 Bienvenido a *Reino Cerámicos*.\n\n¿En qué podemos ayudarte?",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: welcomeStep.id,
        optionId: "menu_cotizar",
        title: "Solicitar cotización",
        order: 0,
      },
      {
        stepId: welcomeStep.id,
        optionId: "menu_locales",
        title: "Nuestros locales",
        order: 1,
      },
      {
        stepId: welcomeStep.id,
        optionId: "menu_consultas",
        title: "Consultas frecuentes",
        order: 2,
      },
    ],
  });

  // Step: Seleccionar zona (para locales)
  const selectZoneStep = await prisma.flowStep.create({
    data: {
      flowId: mainMenu.id,
      code: "select_zone",
      name: "Seleccionar zona",
      order: 1,
      stepType: "LIST",
      expectedInput: "LIST_REPLY",
      messageBody: "Seleccioná la zona donde te encontrás:",
      listButtonText: "Ver zonas",
      saveResponseAs: "selectedZone",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: selectZoneStep.id,
        optionId: "zone_caba_norte",
        title: "CABA Norte",
        description: "Belgrano, Palermo, Núñez",
        section: "Capital Federal",
        order: 0,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_caba_centro",
        title: "CABA Centro",
        description: "Caballito, Almagro, Boedo",
        section: "Capital Federal",
        order: 1,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_caba_oeste",
        title: "CABA Oeste",
        description: "Flores, Liniers, Mataderos",
        section: "Capital Federal",
        order: 2,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_norte_gba",
        title: "Zona Norte GBA",
        description: "Vicente López, San Isidro, Tigre",
        section: "GBA",
        order: 3,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_sur",
        title: "Zona Sur",
        description: "Quilmes, Lanús, Avellaneda",
        section: "GBA",
        order: 4,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_oeste",
        title: "Zona Oeste",
        description: "Morón, San Justo, Ituzaingó",
        section: "GBA",
        order: 5,
      },
      {
        stepId: selectZoneStep.id,
        optionId: "zone_la_plata",
        title: "La Plata",
        description: "La Plata y alrededores",
        section: "Interior",
        order: 6,
      },
    ],
  });

  // Step: Mostrar tiendas (dinámico)
  const showStoresStep = await prisma.flowStep.create({
    data: {
      flowId: mainMenu.id,
      code: "show_stores",
      name: "Mostrar tiendas",
      order: 2,
      stepType: "DYNAMIC_LIST",
      expectedInput: "LIST_REPLY",
      messageBody: "Estos son los Reinos disponibles en tu zona:",
      listButtonText: "Ver Reinos",
      dynamicDataSource: "stores_by_zone",
      saveResponseAs: "selectedStoreCode",
    },
  });

  // Step: Info de tienda seleccionada
  const storeInfoStep = await prisma.flowStep.create({
    data: {
      flowId: mainMenu.id,
      code: "store_info",
      name: "Info de tienda",
      order: 3,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "📍 *{storeName}*\n\n{storeAddress}\n\n🕐 Lun-Vie: 8:00-18:00\n🕐 Sáb: 8:00-13:00\n\n¿Qué querés hacer?",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: storeInfoStep.id,
        optionId: "store_cotizar",
        title: "Pedir cotización",
        order: 0,
      },
      {
        stepId: storeInfoStep.id,
        optionId: "store_maps",
        title: "Ver en Maps",
        order: 1,
      },
      {
        stepId: storeInfoStep.id,
        optionId: "store_volver",
        title: "Volver al menú",
        order: 2,
      },
    ],
  });

  // Step: Despedida
  const farewellStep = await prisma.flowStep.create({
    data: {
      flowId: mainMenu.id,
      code: "farewell",
      name: "Despedida",
      order: 10,
      stepType: "TEXT",
      expectedInput: "NONE",
      messageBody:
        "¡Gracias por contactarnos! Si necesitas algo más, no dudes en escribirnos. ¡Hasta pronto! 👋",
    },
  });

  // Transiciones del menú principal
  await prisma.flowStepTransition.createMany({
    data: [
      {
        stepId: welcomeStep.id,
        condition: "menu_cotizar",
        switchToFlow: "quotation",
        order: 0,
      },
      {
        stepId: welcomeStep.id,
        condition: "menu_locales",
        nextStepId: selectZoneStep.id,
        order: 1,
      },
      {
        stepId: welcomeStep.id,
        condition: "menu_consultas",
        switchToFlow: "info",
        order: 2,
      },
      {
        stepId: selectZoneStep.id,
        condition: "*",
        nextStepId: showStoresStep.id,
        order: 0,
      },
      {
        stepId: showStoresStep.id,
        condition: "*",
        nextStepId: storeInfoStep.id,
        order: 0,
      },
      {
        stepId: storeInfoStep.id,
        condition: "store_cotizar",
        switchToFlow: "quotation",
        order: 0,
      },
      {
        stepId: storeInfoStep.id,
        condition: "store_volver",
        nextStepId: welcomeStep.id,
        order: 2,
      },
    ],
  });

  // Actualizar step inicial
  await prisma.flowDefinition.update({
    where: { id: mainMenu.id },
    data: { initialStepId: welcomeStep.id },
  });

  // =============================================
  // FLUJO: COTIZACIÓN
  // =============================================
  const quotation = await prisma.flowDefinition.create({
    data: {
      code: "quotation",
      name: "Cotización",
      description: "Flujo para solicitar cotización de productos",
      isActive: true,
      isDefault: false,
      timeoutMinutes: 30,
    },
  });

  // Step: Categoría
  const categoryStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "select_category",
      name: "Seleccionar categoría",
      order: 0,
      stepType: "LIST",
      expectedInput: "LIST_REPLY",
      messageBody:
        "¡Excelente! Para prepararte una cotización, ¿qué tipo de producto te interesa?",
      messageHeader: "Cotización",
      listButtonText: "Ver categorías",
      saveResponseAs: "category",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: categoryStep.id,
        optionId: "cat_ceramico",
        title: "Cerámicos",
        description: "Pisos cerámicos varios",
        section: "Pisos",
        order: 0,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_porcelanato",
        title: "Porcelanato",
        description: "Alta resistencia",
        section: "Pisos",
        order: 1,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_vinilico",
        title: "Vinílicos",
        description: "Fácil instalación",
        section: "Pisos",
        order: 2,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_azulejos",
        title: "Azulejos",
        description: "Para paredes",
        section: "Revestimientos",
        order: 3,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_mosaicos",
        title: "Mosaicos",
        description: "Decorativos",
        section: "Revestimientos",
        order: 4,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_pegamentos",
        title: "Pegamentos",
        description: "Adhesivos y pastinas",
        section: "Otros",
        order: 5,
      },
      {
        stepId: categoryStep.id,
        optionId: "cat_otro",
        title: "Otro producto",
        description: "Consultar disponibilidad",
        section: "Otros",
        order: 6,
      },
    ],
  });

  // Step: Detalles
  const detailsStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "ask_details",
      name: "Pedir detalles",
      order: 1,
      stepType: "TEXT",
      expectedInput: "TEXT",
      messageBody:
        "¿Podrías darme más detalles? Por ejemplo: medidas, color, modelo o cualquier característica que busques.",
      saveResponseAs: "details",
    },
  });

  // Step: Cantidad
  const quantityStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "ask_quantity",
      name: "Pedir cantidad",
      order: 2,
      stepType: "TEXT",
      expectedInput: "TEXT",
      messageBody:
        "¿Qué cantidad necesitas? (metros cuadrados, cajas, unidades)",
      messageFooter: "Ejemplo: 50 m2, 10 cajas",
      saveResponseAs: "quantity",
    },
  });

  // Step: Método de ubicación
  const locationMethodStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "ask_location_method",
      name: "Método de ubicación",
      order: 3,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "Para conectarte con el Reino más cercano, ¿cómo preferís indicar tu ubicación?",
      messageHeader: "Ubicación",
      messageFooter: "Tenemos 24 locales en Buenos Aires",
      saveResponseAs: "locationMethod",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: locationMethodStep.id,
        optionId: "location_gps",
        title: "Compartir ubicación",
        order: 0,
      },
      {
        stepId: locationMethodStep.id,
        optionId: "location_zone",
        title: "Elegir zona",
        order: 1,
      },
    ],
  });

  // Step: Esperando GPS
  const waitingLocationStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "waiting_location",
      name: "Esperando ubicación",
      order: 4,
      stepType: "TEXT",
      expectedInput: "ANY",
      messageBody:
        "Perfecto, enviame tu ubicación usando el botón de adjuntar 📎 > Ubicación en WhatsApp.\n\n_Si preferís elegir la zona manualmente, escribí *zona*_",
      saveResponseAs: "locationInput",
    },
  });

  // Step: Seleccionar zona (cotización)
  const quotationZoneStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "select_zone",
      name: "Seleccionar zona",
      order: 5,
      stepType: "LIST",
      expectedInput: "LIST_REPLY",
      messageBody: "Seleccioná la zona donde te encontrás:",
      listButtonText: "Ver zonas",
      saveResponseAs: "selectedZone",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_caba_norte",
        title: "CABA Norte",
        description: "Belgrano, Palermo, Núñez",
        section: "Capital Federal",
        order: 0,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_caba_centro",
        title: "CABA Centro",
        description: "Caballito, Almagro, Boedo",
        section: "Capital Federal",
        order: 1,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_caba_oeste",
        title: "CABA Oeste",
        description: "Flores, Liniers, Mataderos",
        section: "Capital Federal",
        order: 2,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_norte_gba",
        title: "Zona Norte GBA",
        description: "Vicente López, San Isidro, Tigre",
        section: "GBA",
        order: 3,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_sur",
        title: "Zona Sur",
        description: "Quilmes, Lanús, Avellaneda",
        section: "GBA",
        order: 4,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_oeste",
        title: "Zona Oeste",
        description: "Morón, San Justo, Ituzaingó",
        section: "GBA",
        order: 5,
      },
      {
        stepId: quotationZoneStep.id,
        optionId: "zone_la_plata",
        title: "La Plata",
        description: "La Plata y alrededores",
        section: "Interior",
        order: 6,
      },
    ],
  });

  // Step: Seleccionar tienda (cotización)
  const quotationStoreStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "select_store",
      name: "Seleccionar tienda",
      order: 6,
      stepType: "DYNAMIC_LIST",
      expectedInput: "LIST_REPLY",
      messageBody:
        "Estos son los Reinos disponibles en tu zona. ¿Cuál te queda más cómodo?",
      listButtonText: "Ver Reinos",
      dynamicDataSource: "stores_by_zone",
      saveResponseAs: "selectedStoreCode",
    },
  });

  // Step: Confirmar
  const confirmStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "confirm",
      name: "Confirmar",
      order: 7,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "¡Perfecto! Voy a pasar tu consulta a un vendedor que te preparará la cotización. ¿Confirmamos?",
      messageFooter: "Un vendedor te contactará a la brevedad",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: confirmStep.id,
        optionId: "confirm_yes",
        title: "Sí, confirmar",
        order: 0,
      },
      {
        stepId: confirmStep.id,
        optionId: "confirm_no",
        title: "No, cancelar",
        order: 1,
      },
    ],
  });

  // Step: Transferencia
  const transferStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "transfer",
      name: "Transferir a vendedor",
      order: 8,
      stepType: "TEXT",
      expectedInput: "NONE",
      messageBody:
        "Perfecto, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
      transferToAgent: true,
    },
  });

  // Step: Cancelado
  const cancelledStep = await prisma.flowStep.create({
    data: {
      flowId: quotation.id,
      code: "cancelled",
      name: "Cancelado",
      order: 9,
      stepType: "TEXT",
      expectedInput: "NONE",
      messageBody:
        "Entendido, he cancelado la cotización. Si necesitas algo más, ¡estoy para ayudarte!",
    },
  });

  // Transiciones de cotización
  await prisma.flowStepTransition.createMany({
    data: [
      {
        stepId: categoryStep.id,
        condition: "*",
        nextStepId: detailsStep.id,
        order: 0,
      },
      {
        stepId: detailsStep.id,
        condition: "*",
        nextStepId: quantityStep.id,
        order: 0,
      },
      {
        stepId: quantityStep.id,
        condition: "*",
        nextStepId: locationMethodStep.id,
        order: 0,
      },
      {
        stepId: locationMethodStep.id,
        condition: "location_gps",
        nextStepId: waitingLocationStep.id,
        order: 0,
      },
      {
        stepId: locationMethodStep.id,
        condition: "location_zone",
        nextStepId: quotationZoneStep.id,
        order: 1,
      },
      {
        stepId: waitingLocationStep.id,
        condition: "*",
        nextStepId: confirmStep.id,
        order: 0,
      },
      {
        stepId: quotationZoneStep.id,
        condition: "*",
        nextStepId: quotationStoreStep.id,
        order: 0,
      },
      {
        stepId: quotationStoreStep.id,
        condition: "*",
        nextStepId: confirmStep.id,
        order: 0,
      },
      {
        stepId: confirmStep.id,
        condition: "confirm_yes",
        nextStepId: transferStep.id,
        order: 0,
      },
      {
        stepId: confirmStep.id,
        condition: "confirm_no",
        nextStepId: cancelledStep.id,
        order: 1,
      },
    ],
  });

  await prisma.flowDefinition.update({
    where: { id: quotation.id },
    data: { initialStepId: categoryStep.id },
  });

  // =============================================
  // FLUJO: CONSULTAS FRECUENTES
  // =============================================
  const info = await prisma.flowDefinition.create({
    data: {
      code: "info",
      name: "Consultas Frecuentes",
      description: "Información general sobre horarios, pagos, envíos, etc.",
      isActive: true,
      isDefault: false,
      timeoutMinutes: 30,
    },
  });

  // Step: Menú de consultas
  const infoMenuStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "menu",
      name: "Menú de consultas",
      order: 0,
      stepType: "LIST",
      expectedInput: "LIST_REPLY",
      messageBody: "¿Sobre qué tema querés información?",
      listButtonText: "Ver temas",
    },
  });

  await prisma.flowStepOption.createMany({
    data: [
      {
        stepId: infoMenuStep.id,
        optionId: "info_horarios",
        title: "Horarios de atención",
        section: "General",
        order: 0,
      },
      {
        stepId: infoMenuStep.id,
        optionId: "info_ubicacion",
        title: "Ubicaciones",
        section: "General",
        order: 1,
      },
      {
        stepId: infoMenuStep.id,
        optionId: "info_pagos",
        title: "Formas de pago",
        section: "Compras",
        order: 2,
      },
      {
        stepId: infoMenuStep.id,
        optionId: "info_envios",
        title: "Envíos",
        section: "Compras",
        order: 3,
      },
      {
        stepId: infoMenuStep.id,
        optionId: "info_garantia",
        title: "Garantía y cambios",
        section: "Postventa",
        order: 4,
      },
    ],
  });

  // Step: Horarios
  const horariosStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "horarios",
      name: "Horarios",
      order: 1,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "🕐 *Horarios de atención*\n\n📅 Lunes a Viernes: 8:00 a 18:00 hs\n📅 Sábados: 8:00 a 13:00 hs\n📅 Domingos y feriados: Cerrado\n\n¡Te esperamos!",
    },
  });

  // Step: Ubicación
  const ubicacionStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "ubicacion",
      name: "Ubicación",
      order: 2,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "📍 *Ubicaciones*\n\nTenemos 24 locales en Buenos Aires.\n\n¿Querés ver cuál te queda más cerca?",
    },
  });

  // Step: Pagos
  const pagosStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "pagos",
      name: "Formas de pago",
      order: 3,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "💳 *Formas de pago*\n\n✅ Efectivo\n✅ Transferencia bancaria\n✅ Mercado Pago\n✅ Tarjetas de débito\n✅ Tarjetas de crédito (hasta 12 cuotas)\n\n📌 Consultar promociones vigentes",
    },
  });

  // Step: Envíos
  const enviosStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "envios",
      name: "Envíos",
      order: 4,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "🚚 *Envíos*\n\n✅ Envíos a todo el país\n✅ CABA y GBA: 24-48hs\n✅ Interior: 3-5 días hábiles\n\n📦 Retiro en local: Sin cargo",
    },
  });

  // Step: Garantía
  const garantiaStep = await prisma.flowStep.create({
    data: {
      flowId: info.id,
      code: "garantia",
      name: "Garantía",
      order: 5,
      stepType: "BUTTON",
      expectedInput: "BUTTON_REPLY",
      messageBody:
        "🛡️ *Garantía*\n\n✅ Garantía de fábrica\n✅ 30 días para cambios por defectos\n\n📋 Requisitos:\n• Ticket/factura\n• Producto sin uso\n• Embalaje original",
    },
  });

  // Opciones comunes para volver
  const infoSteps = [
    horariosStep,
    ubicacionStep,
    pagosStep,
    enviosStep,
    garantiaStep,
  ];
  for (const step of infoSteps) {
    await prisma.flowStepOption.createMany({
      data: [
        {
          stepId: step.id,
          optionId: "info_otra",
          title: "Otra consulta",
          order: 0,
        },
        {
          stepId: step.id,
          optionId: "info_menu",
          title: "Volver al menú",
          order: 1,
        },
      ],
    });
  }

  // Transiciones de info
  await prisma.flowStepTransition.createMany({
    data: [
      {
        stepId: infoMenuStep.id,
        condition: "info_horarios",
        nextStepId: horariosStep.id,
        order: 0,
      },
      {
        stepId: infoMenuStep.id,
        condition: "info_ubicacion",
        nextStepId: ubicacionStep.id,
        order: 1,
      },
      {
        stepId: infoMenuStep.id,
        condition: "info_pagos",
        nextStepId: pagosStep.id,
        order: 2,
      },
      {
        stepId: infoMenuStep.id,
        condition: "info_envios",
        nextStepId: enviosStep.id,
        order: 3,
      },
      {
        stepId: infoMenuStep.id,
        condition: "info_garantia",
        nextStepId: garantiaStep.id,
        order: 4,
      },
      // Volver a consultas
      ...infoSteps.map((s) => ({
        stepId: s.id,
        condition: "info_otra",
        nextStepId: infoMenuStep.id,
        order: 0,
      })),
      // Volver al menú principal (switch to flow)
      ...infoSteps.map((s) => ({
        stepId: s.id,
        condition: "info_menu",
        switchToFlow: "main_menu",
        order: 1,
      })),
    ],
  });

  await prisma.flowDefinition.update({
    where: { id: info.id },
    data: { initialStepId: infoMenuStep.id },
  });

  console.log("Flows seeded successfully!");
  console.log(`- main_menu: ${mainMenu.id}`);
  console.log(`- quotation: ${quotation.id}`);
  console.log(`- info: ${info.id}`);
}

seedFlows()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
