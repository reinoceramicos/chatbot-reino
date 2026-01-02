import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// @ts-expect-error Prisma 7 types
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Limpiar respuestas automáticas existentes
  await prisma.autoResponse.deleteMany();

  // Crear respuestas automáticas
  const autoResponses = [
    // Horarios
    {
      trigger: "horario",
      triggerType: "keyword",
      response: "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 10,
    },
    {
      trigger: "abierto",
      triggerType: "keyword",
      response: "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 9,
    },
    {
      trigger: "atienden",
      triggerType: "keyword",
      response: "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 8,
    },

    // Ubicación
    {
      trigger: "direccion",
      triggerType: "keyword",
      response: "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 10,
    },
    {
      trigger: "ubicacion",
      triggerType: "keyword",
      response: "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 9,
    },
    {
      trigger: "donde estan",
      triggerType: "keyword",
      response: "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 8,
    },

    // Envíos
    {
      trigger: "envio",
      triggerType: "keyword",
      response: "🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 10,
    },
    {
      trigger: "delivery",
      triggerType: "keyword",
      response: "🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 9,
    },
    {
      trigger: "hacen envios",
      triggerType: "keyword",
      response: "🚚 Sí, realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 8,
    },

    // Pagos
    {
      trigger: "pago",
      triggerType: "keyword",
      response: "💳 Formas de pago disponibles:\n\n✅ Efectivo\n✅ Transferencia bancaria\n✅ Tarjeta de débito\n✅ Tarjeta de crédito (hasta 12 cuotas)\n✅ Mercado Pago",
      category: "pagos",
      priority: 10,
    },
    {
      trigger: "tarjeta",
      triggerType: "keyword",
      response: "💳 Sí, aceptamos tarjetas!\n\n✅ Débito: todas las tarjetas\n✅ Crédito: hasta 12 cuotas sin interés\n✅ También Mercado Pago",
      category: "pagos",
      priority: 9,
    },
    {
      trigger: "transferencia",
      triggerType: "keyword",
      response: "🏦 Sí, aceptamos transferencias bancarias.\n\nTe pasamos los datos al momento de confirmar tu pedido.",
      category: "pagos",
      priority: 8,
    },
    {
      trigger: "cuotas",
      triggerType: "keyword",
      response: "💳 ¡Sí! Ofrecemos hasta 12 cuotas sin interés con tarjetas de crédito.\n\n¿Querés que un vendedor te asesore?",
      category: "pagos",
      priority: 8,
    },
  ];

  for (const response of autoResponses) {
    await prisma.autoResponse.create({
      data: response,
    });
  }

  console.log(`Created ${autoResponses.length} auto responses`);

  // Crear configuración del bot
  await prisma.botConfig.deleteMany();
  await prisma.botConfig.createMany({
    data: [
      { key: "welcome_message", value: "¡Hola! 👋 Bienvenido a Reino Cerámicos. ¿En qué podemos ayudarte hoy?" },
      { key: "transfer_message", value: "Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌" },
      { key: "fallback_message", value: "Gracias por tu mensaje. Si necesitas hablar con un vendedor, escribí *vendedor* o *cotizar*." },
      { key: "business_name", value: "Reino Cerámicos" },
    ],
  });

  console.log("Created bot config");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
