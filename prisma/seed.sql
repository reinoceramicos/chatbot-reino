-- Seed data for Reino Cerámicos Chatbot

-- Limpiar datos existentes
DELETE FROM auto_responses;
DELETE FROM bot_config;

-- Respuestas automáticas: Horarios
INSERT INTO auto_responses (id, trigger, trigger_type, response, category, priority, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'horario', 'keyword', E'📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado', 'horarios', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'abierto', 'keyword', E'📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado', 'horarios', 9, true, NOW(), NOW()),
  (gen_random_uuid(), 'atienden', 'keyword', E'📅 Nuestros horarios de atención son:\n\n🕐 Lunes a Viernes: 8:00 a 18:00\n🕐 Sábados: 8:00 a 13:00\n🚫 Domingos: Cerrado', 'horarios', 8, true, NOW(), NOW());

-- Respuestas automáticas: Ubicación
INSERT INTO auto_responses (id, trigger, trigger_type, response, category, priority, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'direccion', 'keyword', E'📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?', 'ubicacion', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'ubicacion', 'keyword', E'📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?', 'ubicacion', 9, true, NOW(), NOW()),
  (gen_random_uuid(), 'donde estan', 'keyword', E'📍 Nuestra dirección es:\n\n🏢 Av. Principal 1234, Ciudad\n\n¿Necesitas que te enviemos la ubicación en el mapa?', 'ubicacion', 8, true, NOW(), NOW());

-- Respuestas automáticas: Envíos
INSERT INTO auto_responses (id, trigger, trigger_type, response, category, priority, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'envio', 'keyword', E'🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?', 'envios', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'delivery', 'keyword', E'🚚 Realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?', 'envios', 9, true, NOW(), NOW()),
  (gen_random_uuid(), 'hacen envios', 'keyword', E'🚚 Sí, realizamos envíos a todo el país!\n\n📦 Envío gratis en compras mayores a $50.000\n🏠 También podés retirar en nuestro local\n\n¿Querés cotizar un envío?', 'envios', 8, true, NOW(), NOW());

-- Respuestas automáticas: Pagos
INSERT INTO auto_responses (id, trigger, trigger_type, response, category, priority, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'pago', 'keyword', E'💳 Formas de pago disponibles:\n\n✅ Efectivo\n✅ Transferencia bancaria\n✅ Tarjeta de débito\n✅ Tarjeta de crédito (hasta 12 cuotas)\n✅ Mercado Pago', 'pagos', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'tarjeta', 'keyword', E'💳 Sí, aceptamos tarjetas!\n\n✅ Débito: todas las tarjetas\n✅ Crédito: hasta 12 cuotas sin interés\n✅ También Mercado Pago', 'pagos', 9, true, NOW(), NOW()),
  (gen_random_uuid(), 'transferencia', 'keyword', E'🏦 Sí, aceptamos transferencias bancarias.\n\nTe pasamos los datos al momento de confirmar tu pedido.', 'pagos', 8, true, NOW(), NOW()),
  (gen_random_uuid(), 'cuotas', 'keyword', E'💳 ¡Sí! Ofrecemos hasta 12 cuotas sin interés con tarjetas de crédito.\n\n¿Querés que un vendedor te asesore?', 'pagos', 8, true, NOW(), NOW());

-- Configuración del bot
INSERT INTO bot_config (id, key, value, updated_at)
VALUES
  (gen_random_uuid(), 'welcome_message', '¡Hola! 👋 Bienvenido a Reino Cerámicos. ¿En qué podemos ayudarte hoy?', NOW()),
  (gen_random_uuid(), 'transfer_message', 'Entendido, te voy a comunicar con uno de nuestros vendedores. En breve te contactamos. 🙌', NOW()),
  (gen_random_uuid(), 'fallback_message', 'Gracias por tu mensaje. Si necesitas hablar con un vendedor, escribí *vendedor* o *cotizar*.', NOW()),
  (gen_random_uuid(), 'business_name', 'Reino Cerámicos', NOW());
