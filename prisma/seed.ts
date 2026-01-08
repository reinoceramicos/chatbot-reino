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
  { code: "CABA_NORTE", name: "CABA Norte" },
  { code: "CABA_CENTRO", name: "CABA Centro" },
  { code: "CABA_OESTE", name: "CABA Oeste" },
  { code: "ZONA_NORTE_GBA", name: "Zona Norte GBA" },
  { code: "ZONA_SUR", name: "Zona Sur" },
  { code: "ZONA_OESTE", name: "Zona Oeste" },
  { code: "LA_PLATA", name: "La Plata" },
];

// Mapeo de zona nombre a código
const zoneNameToCode: Record<string, string> = {
  "CABA Norte": "CABA_NORTE",
  "CABA Centro": "CABA_CENTRO",
  "CABA Oeste": "CABA_OESTE",
  "Zona Norte GBA": "ZONA_NORTE_GBA",
  "Zona Sur": "ZONA_SUR",
  "Zona Oeste": "ZONA_OESTE",
  "La Plata": "LA_PLATA",
};

// Datos de los 25 Reinos (tiendas)
const storesData = [
  {
    code: "REINO_1",
    name: "Reino 1 - Belgrano",
    address: "Av. Cabildo 2040, Belgrano, CABA",
    zone: "CABA Norte",
    latitude: -34.5614,
    longitude: -58.4537,
    googleMapsUrl: "https://maps.app.goo.gl/reino1",
  },
  {
    code: "REINO_2",
    name: "Reino 2 - Palermo",
    address: "Av. Santa Fe 4850, Palermo, CABA",
    zone: "CABA Norte",
    latitude: -34.5789,
    longitude: -58.4321,
    googleMapsUrl: "https://maps.app.goo.gl/reino2",
  },
  {
    code: "REINO_3",
    name: "Reino 3 - Caballito",
    address: "Av. Rivadavia 5200, Caballito, CABA",
    zone: "CABA Centro",
    latitude: -34.6197,
    longitude: -58.4432,
    googleMapsUrl: "https://maps.app.goo.gl/reino3",
  },
  {
    code: "REINO_4",
    name: "Reino 4 - Flores",
    address: "Av. Rivadavia 7100, Flores, CABA",
    zone: "CABA Oeste",
    latitude: -34.6283,
    longitude: -58.4673,
    googleMapsUrl: "https://maps.app.goo.gl/reino4",
  },
  {
    code: "REINO_5",
    name: "Reino 5 - Villa Urquiza",
    address: "Av. Triunvirato 4700, Villa Urquiza, CABA",
    zone: "CABA Norte",
    latitude: -34.5731,
    longitude: -58.4891,
    googleMapsUrl: "https://maps.app.goo.gl/reino5",
  },
  {
    code: "REINO_6",
    name: "Reino 6 - Liniers",
    address: "Av. Rivadavia 10500, Liniers, CABA",
    zone: "CABA Oeste",
    latitude: -34.6423,
    longitude: -58.5234,
    googleMapsUrl: "https://maps.app.goo.gl/reino6",
  },
  {
    code: "REINO_7",
    name: "Reino 7 - San Justo",
    address: "Av. Brigadier Juan M. de Rosas 3200, San Justo, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6812,
    longitude: -58.5567,
    googleMapsUrl: "https://maps.app.goo.gl/reino7",
  },
  {
    code: "REINO_8",
    name: "Reino 8 - Ramos Mejía",
    address: "Av. de Mayo 1100, Ramos Mejía, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6456,
    longitude: -58.5612,
    googleMapsUrl: "https://maps.app.goo.gl/reino8",
  },
  {
    code: "REINO_9",
    name: "Reino 9 - Morón",
    address: "Av. Rivadavia 17800, Morón, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6534,
    longitude: -58.6198,
    googleMapsUrl: "https://maps.app.goo.gl/reino9",
  },
  {
    code: "REINO_10",
    name: "Reino 10 - Quilmes",
    address: "Av. Calchaquí 800, Quilmes, Buenos Aires",
    zone: "Zona Sur",
    latitude: -34.7234,
    longitude: -58.2567,
    googleMapsUrl: "https://maps.app.goo.gl/reino10",
  },
  {
    code: "REINO_11",
    name: "Reino 11 - Avellaneda",
    address: "Av. Mitre 2300, Avellaneda, Buenos Aires",
    zone: "Zona Sur",
    latitude: -34.6623,
    longitude: -58.3645,
    googleMapsUrl: "https://maps.app.goo.gl/reino11",
  },
  {
    code: "REINO_12",
    name: "Reino 12 - Lanús",
    address: "Av. H. Yrigoyen 4200, Lanús, Buenos Aires",
    zone: "Zona Sur",
    latitude: -34.7012,
    longitude: -58.3923,
    googleMapsUrl: "https://maps.app.goo.gl/reino12",
  },
  {
    code: "REINO_14",
    name: "Reino 14 - San Martín",
    address: "Av. San Martín 2500, San Martín, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.5734,
    longitude: -58.5367,
    googleMapsUrl: "https://maps.app.goo.gl/reino14",
  },
  {
    code: "REINO_15",
    name: "Reino 15 - Vicente López",
    address: "Av. Maipú 1800, Vicente López, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.5234,
    longitude: -58.4723,
    googleMapsUrl: "https://maps.app.goo.gl/reino15",
  },
  {
    code: "REINO_16",
    name: "Reino 16 - San Isidro",
    address: "Av. Centenario 900, San Isidro, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.4712,
    longitude: -58.5123,
    googleMapsUrl: "https://maps.app.goo.gl/reino16",
  },
  {
    code: "REINO_17",
    name: "Reino 17 - Tigre",
    address: "Av. Cazón 1200, Tigre, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.4267,
    longitude: -58.5789,
    googleMapsUrl: "https://maps.app.goo.gl/reino17",
  },
  {
    code: "REINO_18",
    name: "Reino 18 - Pilar",
    address: "Ruta 8 km 50, Pilar, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.4589,
    longitude: -58.9145,
    googleMapsUrl: "https://maps.app.goo.gl/reino18",
  },
  {
    code: "REINO_19",
    name: "Reino 19 - Escobar",
    address: "Ruta 9 km 48, Escobar, Buenos Aires",
    zone: "Zona Norte GBA",
    latitude: -34.3512,
    longitude: -58.7934,
    googleMapsUrl: "https://maps.app.goo.gl/reino19",
  },
  {
    code: "REINO_20",
    name: "Reino 20 - Lomas de Zamora",
    address: "Av. H. Yrigoyen 9200, Lomas de Zamora, Buenos Aires",
    zone: "Zona Sur",
    latitude: -34.7623,
    longitude: -58.4023,
    googleMapsUrl: "https://maps.app.goo.gl/reino20",
  },
  {
    code: "REINO_21",
    name: "Reino 21 - Ezeiza",
    address: "Ruta 205 km 32, Ezeiza, Buenos Aires",
    zone: "Zona Sur",
    latitude: -34.8534,
    longitude: -58.5234,
    googleMapsUrl: "https://maps.app.goo.gl/reino21",
  },
  {
    code: "REINO_22",
    name: "Reino 22 - La Plata",
    address: "Av. 7 N° 1200, La Plata, Buenos Aires",
    zone: "La Plata",
    latitude: -34.9212,
    longitude: -57.9545,
    googleMapsUrl: "https://maps.app.goo.gl/reino22",
  },
  {
    code: "REINO_23",
    name: "Reino 23 - Ituzaingó",
    address: "Av. Rivadavia 21500, Ituzaingó, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6589,
    longitude: -58.6734,
    googleMapsUrl: "https://maps.app.goo.gl/reino23",
  },
  {
    code: "REINO_24",
    name: "Reino 24 - Merlo",
    address: "Av. del Libertador 3400, Merlo, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6823,
    longitude: -58.7234,
    googleMapsUrl: "https://maps.app.goo.gl/reino24",
  },
  {
    code: "REINO_25",
    name: "Reino 25 - Moreno",
    address: "Ruta 7 km 42, Moreno, Buenos Aires",
    zone: "Zona Oeste",
    latitude: -34.6412,
    longitude: -58.7912,
    googleMapsUrl: "https://maps.app.goo.gl/reino25",
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
    { name: "María Zonal Norte", email: "zonal.norte@reino.com", zoneCode: "CABA_NORTE" },
    { name: "Pedro Zonal Sur", email: "zonal.sur@reino.com", zoneCode: "ZONA_SUR" },
    { name: "Laura Zonal Oeste", email: "zonal.oeste@reino.com", zoneCode: "ZONA_OESTE" },
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
    { name: "Juan Encargado R1", email: "encargado.r1@reino.com", storeCode: "REINO_1" },
    { name: "Ana Encargado R2", email: "encargado.r2@reino.com", storeCode: "REINO_2" },
    { name: "Luis Encargado R10", email: "encargado.r10@reino.com", storeCode: "REINO_10" },
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
    { name: "Roberto Vendedor", email: "vendedor1.r1@reino.com", storeCode: "REINO_1" },
    { name: "Sofía Vendedor", email: "vendedor2.r1@reino.com", storeCode: "REINO_1" },
    { name: "Diego Vendedor", email: "vendedor1.r2@reino.com", storeCode: "REINO_2" },
    { name: "Camila Vendedor", email: "vendedor2.r2@reino.com", storeCode: "REINO_2" },
    { name: "Martín Vendedor", email: "vendedor1.r10@reino.com", storeCode: "REINO_10" },
    { name: "Lucía Vendedor", email: "vendedor2.r10@reino.com", storeCode: "REINO_10" },
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

  console.log("Created sample agents (1 admin, 1 gerente, 3 zonales, 3 encargados, 6 vendedores)");
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
