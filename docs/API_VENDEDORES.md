# API de Vendedores - Reino Ceramicos

## Base URL
```
http://localhost:3000/api/agents
```

## Autenticacion
Todos los endpoints (excepto login y register) requieren el header:
```
Authorization: Bearer <token>
```

---

## Sistema de Roles

| Rol | Codigo | Acceso a Conversaciones |
|-----|--------|-------------------------|
| Vendedor | `SELLER` | Solo sus propias conversaciones asignadas |
| Encargado | `MANAGER` | Todas las conversaciones de su Reino (tienda) |
| Zonal | `ZONE_SUPERVISOR` | Todas las conversaciones de los Reinos de su zona |
| Gerencia | `REGIONAL_MANAGER` | Todas las conversaciones de todos los Reinos |

---

## Endpoints

### Autenticacion

#### POST /auth/login
Iniciar sesion de vendedor.

**Request:**
```json
{
  "email": "vendedor@reino.com",
  "password": "123456"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "agent": {
    "id": "clx1234567890",
    "name": "Juan Perez",
    "email": "vendedor@reino.com",
    "role": "SELLER",
    "storeId": "clx0987654321",
    "zoneId": null,
    "status": "AVAILABLE"
  }
}
```

**Response 401:**
```json
{
  "error": "Credenciales incorrectas"
}
```

---

#### POST /auth/register
Registrar nuevo vendedor (endpoint temporal, en produccion se manejara desde admin).

**Request:**
```json
{
  "name": "Juan Perez",
  "email": "vendedor@reino.com",
  "password": "123456",
  "role": "SELLER",
  "storeId": "clx0987654321",
  "zoneId": null
}
```

**Roles disponibles:** `SELLER`, `MANAGER`, `ZONE_SUPERVISOR`, `REGIONAL_MANAGER`

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "agent": {
    "id": "clx1234567890",
    "name": "Juan Perez",
    "email": "vendedor@reino.com",
    "role": "SELLER",
    "storeId": "clx0987654321",
    "zoneId": null,
    "status": "OFFLINE"
  }
}
```

**Response 400:**
```json
{
  "error": "El email ya esta registrado"
}
```

---

#### POST /auth/logout
Cerrar sesion (cambia estado a OFFLINE).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true
}
```

---

### Perfil

#### GET /profile
Obtener perfil del vendedor autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "clx1234567890",
  "name": "Juan Perez",
  "email": "vendedor@reino.com",
  "role": "SELLER",
  "storeId": "clx0987654321",
  "zoneId": null,
  "status": "AVAILABLE",
  "maxConversations": 5,
  "activeConversations": 2
}
```

---

#### PUT /profile/status
Cambiar estado del vendedor.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "status": "AVAILABLE"
}
```

**Status disponibles:** `AVAILABLE`, `BUSY`, `OFFLINE`

**Response 200:**
```json
{
  "id": "clx1234567890",
  "status": "AVAILABLE"
}
```

---

### Conversaciones

#### GET /conversations/waiting
Obtener conversaciones en espera de asignacion.
- **SELLER/MANAGER:** Solo conversaciones de su tienda
- **ZONE_SUPERVISOR:** Conversaciones de todas las tiendas de su zona
- **REGIONAL_MANAGER:** Todas las conversaciones

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "customerId": "cust_456",
      "customerName": "Maria Garcia",
      "customerWaId": "5491155556666",
      "status": "WAITING",
      "storeId": "store_789",
      "storeName": "Reino 1 - Belgrano",
      "lastMessage": "Hola, quiero cotizar ceramicos",
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "startedAt": "2024-01-15T10:25:00.000Z",
      "unreadCount": 3
    }
  ]
}
```

---

#### GET /conversations/mine
Obtener conversaciones asignadas.
- **SELLER:** Solo sus conversaciones
- **MANAGER:** Todas las conversaciones asignadas de su tienda
- **ZONE_SUPERVISOR:** Todas las conversaciones asignadas de su zona
- **REGIONAL_MANAGER:** Todas las conversaciones asignadas

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "customerId": "cust_456",
      "customerName": "Maria Garcia",
      "customerWaId": "5491155556666",
      "status": "ASSIGNED",
      "storeId": "store_789",
      "storeName": "Reino 1 - Belgrano",
      "agentId": "agent_123",
      "agentName": "Juan Perez",
      "lastMessage": "Perfecto, gracias!",
      "lastMessageAt": "2024-01-15T10:45:00.000Z",
      "startedAt": "2024-01-15T10:25:00.000Z",
      "unreadCount": 0
    }
  ]
}
```

---

#### GET /conversations/all
Obtener todas las conversaciones (waiting + assigned).
**Requiere rol MANAGER o superior.**

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "customerId": "cust_456",
      "customerName": "Maria Garcia",
      "customerWaId": "5491155556666",
      "status": "WAITING",
      "storeId": "store_789",
      "storeName": "Reino 1 - Belgrano",
      "agentId": null,
      "agentName": null,
      "lastMessage": "Hola, quiero cotizar",
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "startedAt": "2024-01-15T10:25:00.000Z",
      "unreadCount": 3
    },
    {
      "id": "conv_456",
      "customerId": "cust_789",
      "customerName": "Pedro Lopez",
      "customerWaId": "5491166667777",
      "status": "ASSIGNED",
      "storeId": "store_789",
      "storeName": "Reino 1 - Belgrano",
      "agentId": "agent_123",
      "agentName": "Juan Perez",
      "lastMessage": "Te envio la cotizacion",
      "lastMessageAt": "2024-01-15T11:00:00.000Z",
      "startedAt": "2024-01-15T10:45:00.000Z",
      "unreadCount": 0
    }
  ]
}
```

**Response 403:** (si el rol no es suficiente)
```json
{
  "error": "No tienes permisos para acceder a este recurso"
}
```

---

#### GET /conversations/:conversationId
Obtener detalle de una conversacion con todos los mensajes.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "conversation": {
    "id": "conv_123",
    "customerId": "cust_456",
    "customerName": "Maria Garcia",
    "customerWaId": "5491155556666",
    "status": "ASSIGNED",
    "storeId": "store_789",
    "storeName": "Reino 1 - Belgrano",
    "lastMessage": "Perfecto, gracias!",
    "lastMessageAt": "2024-01-15T10:45:00.000Z",
    "startedAt": "2024-01-15T10:25:00.000Z",
    "unreadCount": 0,
    "flowType": "quotation",
    "flowData": {
      "category": "cat_ceramico",
      "details": "Ceramico 40x40 beige",
      "quantity": "50 m2",
      "selectedZone": "zone_caba_norte"
    },
    "messages": [
      {
        "id": "msg_001",
        "content": "Hola, quiero cotizar ceramicos",
        "type": "TEXT",
        "direction": "INBOUND",
        "sentByBot": false,
        "createdAt": "2024-01-15T10:25:00.000Z"
      },
      {
        "id": "msg_002",
        "content": "Hola! Bienvenido a Reino Ceramicos...",
        "type": "TEXT",
        "direction": "OUTBOUND",
        "sentByBot": true,
        "createdAt": "2024-01-15T10:25:01.000Z"
      },
      {
        "id": "msg_003",
        "content": "Perfecto, un vendedor te contactara",
        "type": "TEXT",
        "direction": "OUTBOUND",
        "sentByBot": false,
        "sentByAgentId": "agent_123",
        "createdAt": "2024-01-15T10:45:00.000Z"
      }
    ]
  }
}
```

---

#### POST /conversations/:conversationId/assign
Asignar una conversacion al vendedor.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true
}
```

**Response 400:**
```json
{
  "error": "No se pudo asignar la conversacion"
}
```

---

#### POST /conversations/:conversationId/resolve
Marcar conversacion como resuelta.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true
}
```

---

#### POST /conversations/:conversationId/transfer-bot
Devolver conversacion al bot.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true
}
```

---

#### POST /conversations/:conversationId/messages
Enviar mensaje al cliente.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message": "Hola Maria! Te paso la cotizacion..."
}
```

**Response 200:**
```json
{
  "success": true,
  "messageId": "wamid.HBgLNTQ5..."
}
```

---

## Estados del Vendedor

| Estado | Descripcion |
|--------|-------------|
| `AVAILABLE` | Disponible para recibir conversaciones |
| `BUSY` | Ocupado (alcanzo el maximo de conversaciones) |
| `OFFLINE` | No disponible / Desconectado |

## Roles del Agente

| Rol | Codigo | Descripcion |
|-----|--------|-------------|
| Vendedor | `SELLER` | Solo ve sus propios chats |
| Encargado | `MANAGER` | Ve los chats de su Reino (tienda) |
| Zonal | `ZONE_SUPERVISOR` | Ve los chats de todos los Reinos de su zona |
| Gerencia | `REGIONAL_MANAGER` | Ve todos los chats de todos los Reinos |

## Estados de Conversacion

| Estado | Descripcion |
|--------|-------------|
| `BOT` | Atendida por el bot |
| `WAITING` | Esperando asignacion de vendedor |
| `ASSIGNED` | Asignada a un vendedor |
| `RESOLVED` | Resuelta/cerrada |

## Tipos de Mensaje

| Tipo | Descripcion |
|------|-------------|
| `TEXT` | Mensaje de texto |
| `IMAGE` | Imagen |
| `VIDEO` | Video |
| `AUDIO` | Audio/nota de voz |
| `DOCUMENT` | Documento |
| `LOCATION` | Ubicacion |
| `INTERACTIVE` | Mensaje interactivo (botones/lista) |

## Direccion del Mensaje

| Direccion | Descripcion |
|-----------|-------------|
| `INBOUND` | Cliente -> Bot/Vendedor |
| `OUTBOUND` | Bot/Vendedor -> Cliente |

---

## Codigos de Error

| Codigo | Descripcion |
|--------|-------------|
| 400 | Bad Request - Datos invalidos |
| 401 | Unauthorized - Token invalido o no proporcionado |
| 403 | Forbidden - No tienes permisos para este recurso |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error |

---

## Usuarios de Prueba

Despues de ejecutar `npx prisma db seed`, estaran disponibles estos usuarios:

### Gerencia
| Email | Password | Rol | Acceso |
|-------|----------|-----|--------|
| gerente@reino.com | 123456 | REGIONAL_MANAGER | Todos los chats |

### Zonales
| Email | Password | Rol | Zona |
|-------|----------|-----|------|
| zonal.norte@reino.com | 123456 | ZONE_SUPERVISOR | CABA Norte |
| zonal.sur@reino.com | 123456 | ZONE_SUPERVISOR | Zona Sur |
| zonal.oeste@reino.com | 123456 | ZONE_SUPERVISOR | Zona Oeste |

### Encargados
| Email | Password | Rol | Reino |
|-------|----------|-----|-------|
| encargado.r1@reino.com | 123456 | MANAGER | Reino 1 - Belgrano |
| encargado.r2@reino.com | 123456 | MANAGER | Reino 2 - Palermo |
| encargado.r10@reino.com | 123456 | MANAGER | Reino 10 - Quilmes |

### Vendedores
| Email | Password | Rol | Reino |
|-------|----------|-----|-------|
| vendedor1.r1@reino.com | 123456 | SELLER | Reino 1 - Belgrano |
| vendedor2.r1@reino.com | 123456 | SELLER | Reino 1 - Belgrano |
| vendedor1.r2@reino.com | 123456 | SELLER | Reino 2 - Palermo |
| vendedor2.r2@reino.com | 123456 | SELLER | Reino 2 - Palermo |
| vendedor1.r10@reino.com | 123456 | SELLER | Reino 10 - Quilmes |
| vendedor2.r10@reino.com | 123456 | SELLER | Reino 10 - Quilmes |

---

## Ejemplo de Flujo Completo

```javascript
// 1. Login
const login = await fetch('/api/agents/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'vendedor1.r1@reino.com', password: '123456' })
});
const { token, agent } = await login.json();
// agent.role = "SELLER", agent.storeId = "..."

// 2. Guardar token y usarlo en todas las requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// 3. Cambiar estado a disponible
await fetch('/api/agents/profile/status', {
  method: 'PUT',
  headers,
  body: JSON.stringify({ status: 'AVAILABLE' })
});

// 4. Obtener conversaciones en espera (filtradas segun rol)
const waiting = await fetch('/api/agents/conversations/waiting', { headers });
const { conversations } = await waiting.json();

// 5. Asignar una conversacion
await fetch(`/api/agents/conversations/${conversations[0].id}/assign`, {
  method: 'POST',
  headers
});

// 6. Ver detalle con mensajes
const detail = await fetch(`/api/agents/conversations/${conversations[0].id}`, { headers });
const { conversation } = await detail.json();

// 7. Enviar mensaje
await fetch(`/api/agents/conversations/${conversations[0].id}/messages`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ message: 'Hola! Te paso la cotizacion...' })
});

// 8. Resolver conversacion
await fetch(`/api/agents/conversations/${conversations[0].id}/resolve`, {
  method: 'POST',
  headers
});
```

---

## Ejemplo: Supervisor viendo todas las conversaciones

```javascript
// Login como encargado
const login = await fetch('/api/agents/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'encargado.r1@reino.com', password: '123456' })
});
const { token } = await login.json();

const headers = {
  'Authorization': `Bearer ${token}`
};

// Ver TODAS las conversaciones de su tienda (waiting + assigned)
const all = await fetch('/api/agents/conversations/all', { headers });
const { conversations } = await all.json();

// Puede ver quien esta atendiendo cada conversacion
conversations.forEach(c => {
  console.log(`${c.customerName}: ${c.status} - Atendido por: ${c.agentName || 'Sin asignar'}`);
});
```
