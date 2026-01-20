import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Zonas geográficas
const zonesData = [
  { code: "CABA", name: "CABA" },
  { code: "ZONA_NORTE", name: "Zona Norte" },
  { code: "ZONA_NOROESTE", name: "Zona Noroeste" },
  { code: "ZONA_OESTE", name: "Zona Oeste" },
  { code: "ZONA_SUR", name: "Zona Sur" },
  { code: "ZONA_NORTE_LEJANO", name: "Zona Norte Lejano" },
];

// Mapeo de zona nombre a código
const zoneNameToCode: Record<string, string> = {
  CABA: "CABA",
  "Zona Norte": "ZONA_NORTE",
  "Zona Noroeste": "ZONA_NOROESTE",
  "Zona Oeste": "ZONA_OESTE",
  "Zona Sur": "ZONA_SUR",
  "Zona Norte Lejano": "ZONA_NORTE_LEJANO",
};

// Datos de los 23 Reinos (tiendas) - códigos 1200XX
const storesData = [
  {
    code: "120001",
    name: "Reino 1 - San Martín",
    address: "Av. Presidente Perón 4301, San Martín",
    zone: "Zona Norte",
    latitude: -34.5761,
    longitude: -58.5482,
    googleMapsUrl: "https://goo.gl/maps/MVGufv9cRgb9Bgr79",
  },
  {
    code: "120002",
    name: "Reino 2 - San Martín",
    address: "Av. Ricardo Balbin 3302, San Martín",
    zone: "Zona Norte",
    latitude: -34.5708,
    longitude: -58.5547,
    googleMapsUrl: "https://goo.gl/maps/GL1Tuqn2g5VsoNxD9",
  },
  {
    code: "120003",
    name: "Reino 3 - M. Coronado",
    address: "Av. Bernabé Marquez 1718, Martin Coronado",
    zone: "Zona Norte",
    latitude: -34.5786,
    longitude: -58.5992,
    googleMapsUrl: "https://goo.gl/maps/nZLM9wvi8ag9YokT7",
  },
  {
    code: "120004",
    name: "Reino 4 - José L. Suarez",
    address: "Av. Juan Manuel de Rosas 1711, José L. Suarez",
    zone: "Zona Norte",
    latitude: -34.5231,
    longitude: -58.5712,
    googleMapsUrl: "https://goo.gl/maps/9wGJedumYrPRcCXN6",
  },
  {
    code: "120005",
    name: "Reino 5 - San Miguel",
    address: "Av. Pte Arturo Illia 5265, San Miguel",
    zone: "Zona Noroeste",
    latitude: -34.5211,
    longitude: -58.7179,
    googleMapsUrl: "https://goo.gl/maps/vWuhNPZ1kbwozx3m8",
  },
  {
    code: "120006",
    name: "Reino 6 - José C. Paz",
    address: "Av. Hipolito Yrigoyen 348, Jose C. Paz",
    zone: "Zona Noroeste",
    latitude: -34.5117,
    longitude: -58.7356,
    googleMapsUrl: "https://goo.gl/maps/AKDxPJLkxiHwKK268",
  },
  {
    code: "120007",
    name: "Reino 7 - Ricardo Rojas",
    address: "Colectora Panamericana Este 421, Ricardo Rojas",
    zone: "Zona Norte",
    latitude: -34.4595,
    longitude: -58.6897,
    googleMapsUrl: "https://goo.gl/maps/DZmX3SMoLxK76tfi8",
  },
  {
    code: "120008",
    name: "Reino 8 - Pilar",
    address: "Av. Dardo Rocha 2107, Pilar",
    zone: "Zona Noroeste",
    latitude: -34.477,
    longitude: -58.9017,
    googleMapsUrl: "https://goo.gl/maps/fDGkeptABpCZkTFv7",
  },
  {
    code: "120009",
    name: "Reino 9 - Gral Rodriguez",
    address: "Ruta Provincial 24 N°1007, General Rodriguez",
    zone: "Zona Oeste",
    latitude: -34.6095,
    longitude: -58.9076,
    googleMapsUrl: "https://goo.gl/maps/uzjGzgD2D21ygGaa6",
  },
  {
    code: "120010",
    name: "Reino 10 - Cuartel V",
    address: "Ruta Provincial 24 N°5801, Cuartel V, Moreno",
    zone: "Zona Oeste",
    latitude: -34.5619,
    longitude: -58.8389,
    googleMapsUrl: "https://goo.gl/maps/vvdRNJ1w52nx6eqp7",
  },
  {
    code: "120011",
    name: "Reino 11 - F. Alvarez",
    address: "Avenida Gaona 12901, Francisco Alvarez",
    zone: "Zona Oeste",
    latitude: -34.6133,
    longitude: -58.8569,
    googleMapsUrl: "https://goo.gl/maps/7A41THN8WH3U3p2ZA",
  },
  {
    code: "120012",
    name: "Reino 12 - Nordelta",
    address: "Av. Agustin M. Garcia 1300, Benavidez (Nordelta)",
    zone: "Zona Norte",
    latitude: -34.4009,
    longitude: -58.6783,
    googleMapsUrl: "https://goo.gl/maps/19gynQEba7ZrWh8QA",
  },
  {
    code: "120014",
    name: "Reino 14 - Campana",
    address: "Av. Rivadavia 1574, Campana",
    zone: "Zona Norte Lejano",
    latitude: -34.1865,
    longitude: -58.9614,
    googleMapsUrl: "https://goo.gl/maps/Cx3nHrvr3fUg147X8",
  },
  {
    code: "120015",
    name: "Reino 15 - Pilar RN8",
    address: "Colectora y Vedia RN8, Pilar",
    zone: "Zona Noroeste",
    latitude: -34.451,
    longitude: -58.9461,
    googleMapsUrl: "https://maps.app.goo.gl/V9SDt7a2awsqKUCq5",
  },
  {
    code: "120016",
    name: "Reino 16 - Cañuelas",
    address: "RN3, C. el Salvador, 1814, Cañuelas",
    zone: "Zona Sur",
    latitude: -35.0238,
    longitude: -58.7473,
    googleMapsUrl: "https://goo.gl/maps/6jV7Mza6PZNj7o5y6",
  },
  {
    code: "120017",
    name: "Reino 17 - F. Alvarez II",
    address: "Av. Manuel Luis de Oliden 74, Francisco Alvarez",
    zone: "Zona Oeste",
    latitude: -34.6258,
    longitude: -58.8753,
    googleMapsUrl: "https://maps.app.goo.gl/rgWcevAdejpcAti7A",
  },
  {
    code: "120018",
    name: "Reino 18 - Capilla",
    address: "RN8 km 87, B2812 Diego Gaynor, Capilla del Señor",
    zone: "Zona Norte Lejano",
    latitude: -34.3514,
    longitude: -59.2164,
    googleMapsUrl: "https://maps.app.goo.gl/HsfDgwSstTJj2zxi7",
  },
  {
    code: "120019",
    name: "Reino 19 - Luján",
    address: "Ruta 5, Colectora Acceso Oeste, B6700, Luján",
    zone: "Zona Oeste",
    latitude: -34.5705,
    longitude: -59.0697,
    googleMapsUrl: "https://maps.app.goo.gl/PmXqKYbDtq34woXv6",
  },
  {
    code: "120020",
    name: "Reino 20 - Ing. Maschwitz",
    address: "Colectora Este Ramal Escobar 40969, Ingeniero Maschwitz",
    zone: "Zona Norte",
    latitude: -34.4025,
    longitude: -58.7339,
    googleMapsUrl: "https://maps.app.goo.gl/8K4RQeMJnyqjTKdUA",
  },
  {
    code: "120021",
    name: "Reino 21 - Moreno",
    address: "Av. del Libertador 2670, B1743, Moreno",
    zone: "Zona Oeste",
    latitude: -34.6223,
    longitude: -58.7756,
    googleMapsUrl: "https://maps.app.goo.gl/rXGgtUAQHcYRvLCU7",
  },
  {
    code: "120022",
    name: "Reino 22 - Bella Vista",
    address: "2155 Av. Pres. Arturo Umberto Illia, Bella Vista",
    zone: "Zona Noroeste",
    latitude: -34.5435,
    longitude: -58.6866,
    googleMapsUrl: "https://maps.app.goo.gl/XF6K4dkTwkiMbDnFA",
  },
  {
    code: "120023",
    name: "Reino 23 - Berazategui",
    address: "Camino Gral Belgrano 6447 y Vergara, Berazategui",
    zone: "Zona Sur",
    latitude: -34.8176,
    longitude: -58.1971,
    googleMapsUrl: "https://maps.app.goo.gl/NAfgoEjKWtajBV6p8",
  },
  {
    code: "120024",
    name: "Reino 24 - CABA Paternal",
    address: "Av. S. Martín 2999, C1416, CABA",
    zone: "CABA",
    latitude: -34.6021,
    longitude: -58.4671,
    googleMapsUrl: "https://maps.app.goo.gl/mjWX797rvgJHvpAt5",
  },
];

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
      response:
        "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 10,
    },
    {
      trigger: "abierto",
      triggerType: "keyword",
      response:
        "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 9,
    },
    {
      trigger: "atienden",
      triggerType: "keyword",
      response:
        "📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado",
      category: "horarios",
      priority: 8,
    },

    // Ubicación
    {
      trigger: "direccion",
      triggerType: "keyword",
      response:
        "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 10,
    },
    {
      trigger: "ubicacion",
      triggerType: "keyword",
      response:
        "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 9,
    },
    {
      trigger: "donde estan",
      triggerType: "keyword",
      response:
        "📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?",
      category: "ubicacion",
      priority: 8,
    },

    // Envíos
    {
      trigger: "envio",
      triggerType: "keyword",
      response:
        "🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 10,
    },
    {
      trigger: "delivery",
      triggerType: "keyword",
      response:
        "🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 9,
    },
    {
      trigger: "hacen envios",
      triggerType: "keyword",
      response:
        "🚚 Sí, realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?",
      category: "envios",
      priority: 8,
    },

    // Pagos
    {
      trigger: "pago",
      triggerType: "keyword",
      response:
        "💳 Formas de pago disponibles:\n\n✅ Efectivo\n✅ Transferencia bancaria\n✅ Tarjeta de débito\n✅ Tarjeta de crédito (hasta 12 cuotas)\n✅ Mercado Pago",
      category: "pagos",
      priority: 10,
    },
    {
      trigger: "tarjeta",
      triggerType: "keyword",
      response:
        "💳 Sí, aceptamos tarjetas!\n\n✅ Débito: todas las tarjetas\n✅ Crédito: hasta 12 cuotas sin interés\n✅ También Mercado Pago",
      category: "pagos",
      priority: 9,
    },
    {
      trigger: "transferencia",
      triggerType: "keyword",
      response:
        "🏦 Sí, aceptamos transferencias bancarias.\n\nTe pasamos los datos al momento de confirmar tu pedido.",
      category: "pagos",
      priority: 8,
    },
    {
      trigger: "cuotas",
      triggerType: "keyword",
      response:
        "💳 ¡Sí! Ofrecemos hasta 12 cuotas sin interés con tarjetas de crédito.\n\n¿Querés que un vendedor te asesore?",
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
      {
        key: "welcome_message",
        value:
          "¡Hola! 👋 Bienvenido a Reino Cerámicos. ¿En qué podemos ayudarte hoy?",
      },
      {
        key: "transfer_message",
        value:
          "Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌",
      },
      {
        key: "fallback_message",
        value:
          "Gracias por tu mensaje. Si necesitas hablar con un vendedor, escribí *vendedor* o *cotizar*.",
      },
      { key: "business_name", value: "Reino Cerámicos" },
    ],
  });

  console.log("Created bot config");

  // Crear zonas
  await prisma.zone.deleteMany();
  const zoneMap: Record<string, string> = {};
  for (const zone of zonesData) {
    const created = await prisma.zone.create({
      data: zone,
    });
    zoneMap[zone.code] = created.id;
  }
  console.log(`Created ${zonesData.length} zones`);

  // Crear tiendas (Reinos) con relación a zonas
  await prisma.store.deleteMany();
  const storeMap: Record<string, string> = {};
  for (const store of storesData) {
    const zoneCode = zoneNameToCode[store.zone];
    const created = await prisma.store.create({
      data: {
        code: store.code,
        name: store.name,
        address: store.address,
        zoneName: store.zone,
        zoneId: zoneCode ? zoneMap[zoneCode] : undefined,
        latitude: store.latitude,
        longitude: store.longitude,
        googleMapsUrl: store.googleMapsUrl,
      },
    });
    storeMap[store.code] = created.id;
  }
  console.log(`Created ${storesData.length} stores (Reinos)`);

  // Crear usuarios de ejemplo
  await prisma.agent.deleteMany();
  const hashedPassword = await bcrypt.hash("123456", 10);

  // Admin para desarrollo (contraseña: admin)
  const adminPassword = await bcrypt.hash("admin", 10);
  await prisma.agent.create({
    data: {
      name: "Admin",
      email: "admin@reino.com",
      password: adminPassword,
      role: "REGIONAL_MANAGER",
      status: "OFFLINE",
      maxConversations: 99,
      activeConversations: 0,
    },
  });

  // Gerente regional (ve todo)
  await prisma.agent.create({
    data: {
      name: "Carlos Gerente",
      email: "gerente@reino.com",
      password: hashedPassword,
      role: "REGIONAL_MANAGER",
      status: "OFFLINE",
      maxConversations: 10,
      activeConversations: 0,
    },
  });

  // Zonales (uno por zona)
  const zonalData = [
    {
      name: "María Zonal Norte",
      email: "zonal.norte@reino.com",
      zoneCode: "ZONA_NORTE",
    },
    {
      name: "Pedro Zonal Sur",
      email: "zonal.sur@reino.com",
      zoneCode: "ZONA_SUR",
    },
    {
      name: "Laura Zonal Oeste",
      email: "zonal.oeste@reino.com",
      zoneCode: "ZONA_OESTE",
    },
    {
      name: "Carlos Zonal Noroeste",
      email: "zonal.noroeste@reino.com",
      zoneCode: "ZONA_NOROESTE",
    },
  ];

  for (const zonal of zonalData) {
    await prisma.agent.create({
      data: {
        name: zonal.name,
        email: zonal.email,
        password: hashedPassword,
        role: "ZONE_SUPERVISOR",
        zoneId: zoneMap[zonal.zoneCode],
        status: "OFFLINE",
        maxConversations: 10,
        activeConversations: 0,
      },
    });
  }

  // Encargados (uno por cada reino de ejemplo)
  const managerData = [
    {
      name: "Juan Encargado R1",
      email: "encargado.r1@reino.com",
      storeCode: "120001",
    },
    {
      name: "Ana Encargado R2",
      email: "encargado.r2@reino.com",
      storeCode: "120002",
    },
    {
      name: "Luis Encargado R12",
      email: "encargado.r12@reino.com",
      storeCode: "120012",
    },
    {
      name: "Pablo Encargado R17",
      email: "encargado.r17@reino.com",
      storeCode: "120017",
    },
  ];

  for (const manager of managerData) {
    await prisma.agent.create({
      data: {
        name: manager.name,
        email: manager.email,
        password: hashedPassword,
        role: "MANAGER",
        storeId: storeMap[manager.storeCode],
        status: "OFFLINE",
        maxConversations: 8,
        activeConversations: 0,
      },
    });
  }

  // Vendedores (2 por cada reino de ejemplo)
  const sellerData = [
    {
      name: "Roberto Vendedor",
      email: "vendedor1.r1@reino.com",
      storeCode: "120001",
    },
    {
      name: "Sofía Vendedor",
      email: "vendedor2.r1@reino.com",
      storeCode: "120001",
    },
    {
      name: "Diego Vendedor",
      email: "vendedor1.r2@reino.com",
      storeCode: "120002",
    },
    {
      name: "Camila Vendedor",
      email: "vendedor2.r2@reino.com",
      storeCode: "120002",
    },
    {
      name: "Martín Vendedor",
      email: "vendedor1.r12@reino.com",
      storeCode: "120012",
    },
    {
      name: "Lucía Vendedor",
      email: "vendedor2.r12@reino.com",
      storeCode: "120012",
    },
    {
      name: "Fernando Vendedor",
      email: "vendedor1.r17@reino.com",
      storeCode: "120017",
    },
    {
      name: "Carolina Vendedor",
      email: "vendedor2.r17@reino.com",
      storeCode: "120017",
    },
  ];

  for (const seller of sellerData) {
    await prisma.agent.create({
      data: {
        name: seller.name,
        email: seller.email,
        password: hashedPassword,
        role: "SELLER",
        storeId: storeMap[seller.storeCode],
        status: "OFFLINE",
        maxConversations: 5,
        activeConversations: 0,
      },
    });
  }

  console.log(
    "Created sample agents (1 admin, 1 gerente, 3 zonales, 3 encargados, 6 vendedores)",
  );
  console.log("Admin: admin@reino.com / admin");
  console.log("All other passwords are: 123456");
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
