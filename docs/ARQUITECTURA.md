# Arquitectura del Proyecto - API WhatsApp

## Índice
1. [Introducción](#introducción)
2. [Arquitectura Utilizada](#arquitectura-utilizada)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Las 3 Capas Explicadas](#las-3-capas-explicadas)
5. [Flujo de un Mensaje](#flujo-de-un-mensaje)
6. [Cómo Agregar Nuevas Funcionalidades](#cómo-agregar-nuevas-funcionalidades)
7. [Convenciones de Código](#convenciones-de-código)

---

## Introducción

Este proyecto usa una combinación de **Screaming Architecture** y **Arquitectura Hexagonal** (también conocida como Ports & Adapters).

No te asustes con los nombres, es más simple de lo que suena.

---

## Arquitectura Utilizada

### Screaming Architecture (Arquitectura que Grita)

**Concepto:** La estructura de carpetas debe "gritar" qué hace el sistema, no qué framework usa.

**Ejemplo malo:**
```
src/
├── controllers/    # ¿Qué hace la app? No sé...
├── services/
├── models/
└── routes/
```

**Ejemplo bueno (lo que usamos):**
```
src/
├── messaging/     # ¡Ah! Esto envía mensajes
├── webhook/       # ¡Ah! Esto recibe webhooks
└── chatbot/       # ¡Ah! Esto es un chatbot
```

Al ver las carpetas, inmediatamente sabés qué hace la aplicación: **es un chatbot de WhatsApp**.

---

### Arquitectura Hexagonal (Ports & Adapters)

**Concepto:** Separar la lógica de negocio de los detalles técnicos (base de datos, APIs externas, etc).

**¿Por qué?** Imaginate que mañana Meta cambia su API, o querés agregar Telegram. Con esta arquitectura, solo cambiás UN archivo (el adapter), no tocás la lógica del negocio.

**Analogía simple:**

```
Tu negocio es una casa:
- DOMAIN (interior)     = Los muebles y cómo vivís
- APPLICATION (paredes) = Las reglas de la casa
- INFRASTRUCTURE (exterior) = Puertas, ventanas, conexiones

Si cambiás la puerta (WhatsApp → Telegram),
el interior de la casa sigue igual.
```

---

## Estructura de Carpetas

```
src/
├── messaging/                    # 📤 FEATURE: Enviar mensajes
│   ├── domain/                   # Lógica pura (sin dependencias externas)
│   │   ├── entities/             # Objetos del negocio
│   │   │   └── message.entity.ts
│   │   ├── ports/                # Interfaces (contratos)
│   │   │   └── messaging.port.ts
│   │   └── value-objects/        # Valores con validación
│   │       └── phone-number.vo.ts
│   │
│   ├── application/              # Casos de uso (qué puede hacer el sistema)
│   │   ├── use-cases/
│   │   │   ├── send-text.use-case.ts
│   │   │   ├── send-media.use-case.ts
│   │   │   └── ...
│   │   └── dtos/                 # Data Transfer Objects
│   │       └── send-message.dto.ts
│   │
│   └── infrastructure/           # Implementaciones concretas
│       ├── adapters/
│       │   └── whatsapp-cloud.adapter.ts  # Implementa messaging.port.ts
│       └── http/
│           └── whatsapp.client.ts         # Cliente HTTP para Meta API
│
├── webhook/                      # 📥 FEATURE: Recibir mensajes
│   ├── domain/
│   │   ├── entities/
│   │   │   └── incoming-message.entity.ts
│   │   └── ports/
│   │       └── message-handler.port.ts
│   │
│   ├── application/
│   │   ├── handlers/             # Un handler por tipo de mensaje
│   │   │   ├── text.handler.ts
│   │   │   ├── media.handler.ts
│   │   │   └── ...
│   │   └── services/
│   │       └── webhook.service.ts
│   │
│   └── infrastructure/
│       ├── controllers/
│       │   └── webhook.controller.ts
│       └── routes/
│           └── webhook.routes.ts
│
├── shared/                       # 🔧 Código compartido
│   ├── config/
│   │   └── env.config.ts
│   └── types/
│       └── common.types.ts
│
└── index.ts                      # Entry point
```

---

## Las 3 Capas Explicadas

### 1. DOMAIN (Dominio) - El Corazón

**¿Qué es?** La lógica de negocio PURA. No sabe nada de bases de datos, APIs, ni frameworks.

**¿Qué contiene?**

| Carpeta | Propósito | Ejemplo |
|---------|-----------|---------|
| `entities/` | Objetos principales del negocio | `Message`, `Conversation`, `Customer` |
| `ports/` | Interfaces/contratos que otros deben cumplir | `MessagingPort` define qué debe poder hacer cualquier servicio de mensajería |
| `value-objects/` | Valores con validación propia | `PhoneNumber` valida que el teléfono sea correcto |

**Ejemplo - messaging.port.ts:**
```typescript
// Este es un CONTRATO (interface)
// Dice QUÉ debe hacer, no CÓMO hacerlo
export interface MessagingPort {
  send(message: Message): Promise<SendMessageResult>;
}
```

**Regla de oro:** El dominio NUNCA importa nada de infrastructure.

---

### 2. APPLICATION (Aplicación) - Los Casos de Uso

**¿Qué es?** Orquesta la lógica de negocio. Define QUÉ puede hacer el sistema.

**¿Qué contiene?**

| Carpeta | Propósito | Ejemplo |
|---------|-----------|---------|
| `use-cases/` | Una acción específica que el sistema puede hacer | `SendTextUseCase` - enviar un mensaje de texto |
| `services/` | Lógica que coordina múltiples cosas | `WebhookService` - procesa el webhook completo |
| `dtos/` | Objetos para transferir datos entre capas | `SendTextDto` - datos necesarios para enviar texto |
| `handlers/` | Manejadores de eventos específicos | `TextHandler` - qué hacer cuando llega un texto |

**Ejemplo - send-text.use-case.ts:**
```typescript
export class SendTextUseCase {
  // Recibe el PORT (interface), no la implementación
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendTextDto): Promise<SendMessageResult> {
    // 1. Crea la entidad de dominio
    const message = Message.createText(dto.to, dto.body);

    // 2. Usa el adapter (sin saber cuál es)
    return this.messagingAdapter.send(message);
  }
}
```

---

### 3. INFRASTRUCTURE (Infraestructura) - El Mundo Exterior

**¿Qué es?** Todo lo que conecta con el mundo real: APIs, bases de datos, HTTP, etc.

**¿Qué contiene?**

| Carpeta | Propósito | Ejemplo |
|---------|-----------|---------|
| `adapters/` | Implementaciones de los ports | `WhatsAppCloudAdapter` implementa `MessagingPort` |
| `http/` | Clientes HTTP | `WhatsAppHttpClient` - llamadas a Meta API |
| `controllers/` | Reciben requests HTTP | `WebhookController` |
| `routes/` | Definen las rutas | `webhook.routes.ts` |
| `repositories/` | Acceso a base de datos | `PrismaConversationRepository` |

**Ejemplo - whatsapp-cloud.adapter.ts:**
```typescript
// IMPLEMENTA el contrato MessagingPort
export class WhatsAppCloudAdapter implements MessagingPort {

  async send(message: Message): Promise<SendMessageResult> {
    // Acá está la implementación CONCRETA
    // Sabe cómo hablar con la API de Meta/WhatsApp
    const payload = this.buildPayload(message);
    return this.httpClient.post(phoneNumberId, payload);
  }
}
```

---

## Flujo de un Mensaje

### Mensaje Entrante (Cliente → Bot)

```
1. META envía POST a /webhook
           ↓
2. webhook.routes.ts → receiveMessage()
           ↓
3. webhook.controller.ts
   - Parsea el body
   - Llama a WebhookService
           ↓
4. webhook.service.ts
   - Crea IncomingMessage (entity)
   - Busca el handler correcto
           ↓
5. text.handler.ts (o el que corresponda)
   - Procesa el mensaje
   - Decide qué responder
           ↓
6. send-text.use-case.ts
   - Crea Message entity
   - Llama al adapter
           ↓
7. whatsapp-cloud.adapter.ts
   - Construye el payload de Meta
   - Hace POST a Graph API
           ↓
8. Cliente recibe respuesta en WhatsApp
```

### Mensaje Saliente (Bot → Cliente)

```
1. Código llama a SendTextUseCase.execute()
           ↓
2. SendTextUseCase
   - Valida datos
   - Crea Message entity
   - Llama al adapter
           ↓
3. WhatsAppCloudAdapter
   - Implementa MessagingPort
   - Construye payload para Meta
           ↓
4. WhatsAppHttpClient
   - POST a https://graph.facebook.com/v18.0/{phone_id}/messages
           ↓
5. Meta entrega el mensaje al cliente
```

---

## Cómo Agregar Nuevas Funcionalidades

### Agregar un nuevo tipo de mensaje saliente

**Ejemplo:** Quiero enviar mensajes con botones interactivos.

1. **Crear el DTO** en `messaging/application/dtos/`:
```typescript
// send-message.dto.ts
export interface SendButtonsDto {
  to: string;
  body: string;
  buttons: Array<{ id: string; title: string }>;
  phoneNumberId?: string;
}
```

2. **Agregar factory method a la Entity** en `messaging/domain/entities/`:
```typescript
// message.entity.ts
static createButtons(to: string, body: string, buttons: Button[]): Message {
  return new Message(to, "interactive", { buttons: { body, buttons } });
}
```

3. **Crear el Use Case** en `messaging/application/use-cases/`:
```typescript
// send-buttons.use-case.ts
export class SendButtonsUseCase {
  constructor(private readonly messagingAdapter: MessagingPort) {}

  async execute(dto: SendButtonsDto): Promise<SendMessageResult> {
    const message = Message.createButtons(dto.to, dto.body, dto.buttons);
    return this.messagingAdapter.send(message);
  }
}
```

4. **Actualizar el Adapter** en `messaging/infrastructure/adapters/`:
```typescript
// whatsapp-cloud.adapter.ts - agregar case en buildPayload()
case "interactive":
  return this.buildInteractivePayload(base, message);
```

---

### Agregar un nuevo handler de mensaje entrante

**Ejemplo:** Quiero manejar mensajes de ubicación de forma especial.

1. **Crear el handler** en `webhook/application/handlers/`:
```typescript
// location.handler.ts
export class LocationMessageHandler extends BaseMessageHandler {
  async handle(message: IncomingMessage): Promise<void> {
    const location = message.content.location;

    // Tu lógica aquí
    // Ej: buscar sucursal más cercana
    this.log("LOCATION_RECEIVED", { lat: location.latitude, lng: location.longitude });
  }
}
```

2. **Registrar en WebhookService** en `webhook/application/services/`:
```typescript
// webhook.service.ts - en registerDefaultHandlers()
this.handlers.set("location", new LocationMessageHandler());
```

---

### Agregar una nueva feature completa

**Ejemplo:** Quiero agregar un módulo de "chatbot" con IA.

1. **Crear la estructura de carpetas:**
```
src/chatbot/
├── domain/
│   ├── entities/
│   │   └── conversation.entity.ts
│   └── ports/
│       └── ai-provider.port.ts      # Interface para IA
├── application/
│   ├── services/
│   │   └── bot.service.ts
│   └── use-cases/
│       └── process-message.use-case.ts
└── infrastructure/
    └── adapters/
        └── openai.adapter.ts        # Implementación con OpenAI
```

2. **Definir el Port (interface):**
```typescript
// ai-provider.port.ts
export interface AIProviderPort {
  generateResponse(context: string, message: string): Promise<string>;
}
```

3. **Crear el Adapter:**
```typescript
// openai.adapter.ts
export class OpenAIAdapter implements AIProviderPort {
  async generateResponse(context: string, message: string): Promise<string> {
    // Llamar a OpenAI API
  }
}
```

4. **Crear el index.ts para exportar:**
```typescript
// chatbot/index.ts
export * from "./domain";
export * from "./application";
export * from "./infrastructure";
```

---

## Convenciones de Código

### Nomenclatura de Archivos

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Entity | `nombre.entity.ts` | `message.entity.ts` |
| Port | `nombre.port.ts` | `messaging.port.ts` |
| Use Case | `accion-objeto.use-case.ts` | `send-text.use-case.ts` |
| DTO | `nombre.dto.ts` | `send-message.dto.ts` |
| Adapter | `nombre.adapter.ts` | `whatsapp-cloud.adapter.ts` |
| Handler | `nombre.handler.ts` | `text.handler.ts` |
| Service | `nombre.service.ts` | `webhook.service.ts` |
| Controller | `nombre.controller.ts` | `webhook.controller.ts` |
| Routes | `nombre.routes.ts` | `webhook.routes.ts` |
| Value Object | `nombre.vo.ts` | `phone-number.vo.ts` |

### Estructura de un Módulo

Todo módulo debe tener esta estructura mínima:

```
src/[feature]/
├── domain/
│   ├── entities/      # Al menos una entidad
│   ├── ports/         # Interfaces si hay dependencias externas
│   └── index.ts       # Exporta todo
├── application/
│   ├── use-cases/     # O services/
│   └── index.ts
├── infrastructure/
│   └── index.ts
└── index.ts           # Exporta todo el módulo
```

### Imports

```typescript
// ✅ Correcto - imports relativos dentro del módulo
import { Message } from "../domain/entities/message.entity";

// ✅ Correcto - imports desde shared
import { envConfig } from "../../../shared/config/env.config";

// ❌ Incorrecto - domain importando infrastructure
import { WhatsAppClient } from "../infrastructure/http/whatsapp.client";
```

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                        │
│  (Controllers, Routes, Adapters, HTTP Clients, Repositories) │
│                              ↓↑                              │
├─────────────────────────────────────────────────────────────┤
│                        APPLICATION                           │
│           (Use Cases, Services, Handlers, DTOs)              │
│                              ↓↑                              │
├─────────────────────────────────────────────────────────────┤
│                          DOMAIN                              │
│              (Entities, Ports, Value Objects)                │
│                     ❤️ Corazón del negocio                   │
└─────────────────────────────────────────────────────────────┘

Regla: Las flechas solo van hacia ABAJO
       Domain NO conoce a nadie de arriba
```

---

## Próximos Pasos

Con esta arquitectura, los siguientes módulos a agregar serán:

1. **`src/chatbot/`** - Lógica del bot y respuestas automáticas
2. **`src/agents/`** - Gestión de vendedores y transferencia
3. **`src/backoffice/`** - API para el panel de administración
