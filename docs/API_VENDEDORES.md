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
    "storeId": "clx0987654321",
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
  "storeId": "clx0987654321"  // opcional
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "agent": {
    "id": "clx1234567890",
    "name": "Juan Perez",
    "email": "vendedor@reino.com",
    "storeId": "clx0987654321",
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
  "storeId": "clx0987654321",
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
  "status": "AVAILABLE"  // "AVAILABLE" | "BUSY" | "OFFLINE"
}
```

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
Solo muestra conversaciones de la tienda del vendedor (si tiene una asignada).

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
Obtener conversaciones asignadas al vendedor.

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
      "lastMessage": "Perfecto, gracias!",
      "lastMessageAt": "2024-01-15T10:45:00.000Z",
      "startedAt": "2024-01-15T10:25:00.000Z",
      "unreadCount": 0
    }
  ]
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
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error |

---

## Ejemplo de Flujo Completo

```javascript
// 1. Login
const login = await fetch('/api/agents/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'vendedor@reino.com', password: '123456' })
});
const { token, agent } = await login.json();

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

// 4. Obtener conversaciones en espera
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
