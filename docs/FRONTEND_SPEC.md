# Especificación Frontend - Panel de Vendedores Reino Cerámicos

## Contexto del Proyecto

Este frontend es el **Panel de Gestión de Conversaciones** para los vendedores de Reino Cerámicos, una cadena de 24 tiendas ("Reinos") distribuidas en Buenos Aires y GBA.

### Flujo General

1. Un cliente escribe por WhatsApp al número de Reino Cerámicos
2. Un chatbot automático atiende la consulta inicial
3. Cuando el cliente necesita atención humana (cotización, reclamo, etc.), la conversación pasa a estado "WAITING"
4. Los vendedores ven las conversaciones en espera y las toman para atenderlas
5. El vendedor responde desde este panel, y el mensaje llega al cliente por el mismo WhatsApp

---

## Sistema de Roles y Jerarquía

La empresa tiene una estructura jerárquica de 4 niveles. Cada nivel tiene acceso a los chats de sus subordinados.

```
                    ┌─────────────┐
                    │  GERENCIA   │  ← Acceso a TODOS los chats
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
    │  ZONAL 1  │    │  ZONAL 2  │    │  ZONAL 3  │  ← Acceso a chats de su zona
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
    │ENCARGADO 1│    │ENCARGADO 2│    │ENCARGADO 3│  ← Acceso a chats de su Reino
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
  ┌───┬───┴───┬───┐      ...             ...
  │V1 │ V2│ V3│ V4│                              ← Solo sus propios chats
  └───┴───┴───┴───┘
```

### Roles y Permisos

| Rol | Código | Acceso a Chats | Puede Supervisar |
|-----|--------|----------------|------------------|
| **Vendedor** | `SELLER` | Solo los asignados a él | No |
| **Encargado** | `MANAGER` | Todos los de su Reino (tienda) | Vendedores de su tienda |
| **Zonal** | `ZONE_SUPERVISOR` | Todos los Reinos de su zona | Encargados y vendedores de su zona |
| **Gerencia** | `REGIONAL_MANAGER` | Todos los chats de todos los Reinos | Todos |

### Zonas y Reinos

```
ZONAS:
├── CABA Norte (Reinos 1, 2, 3, 4)
├── CABA Centro (Reinos 5, 6, 7)
├── CABA Oeste (Reinos 8, 9, 10)
├── Zona Norte GBA (Reinos 11, 12, 14, 15)
├── Zona Sur (Reinos 16, 17, 18, 19)
├── Zona Oeste (Reinos 20, 21, 22)
└── La Plata (Reinos 23, 24)

Nota: No existe Reino 13 (superstición)
```

---

## MVP - Fase 1: Chat de Vendedores

### Funcionalidades Principales

1. **Login/Logout**
   - Autenticación con email y contraseña
   - JWT token para sesiones

2. **Dashboard de Conversaciones**
   - Lista de conversaciones en espera (WAITING)
   - Lista de mis conversaciones activas (ASSIGNED)
   - Indicador de mensajes no leídos

3. **Chat en Tiempo Real**
   - Ver historial de mensajes
   - Enviar mensajes de texto
   - Ver datos del flujo (qué producto busca, cantidad, zona)

4. **Acciones sobre Conversación**
   - Tomar conversación (assign)
   - Resolver conversación (resolve)
   - Devolver al bot (transfer-bot)

5. **Estado del Vendedor**
   - Cambiar estado: Disponible / Ocupado / Desconectado

---

## API Backend

### Base URL
```
http://localhost:3000/api/agents
```

### Autenticación
Todos los endpoints (excepto login/register) requieren:
```
Authorization: Bearer <token>
```

### Endpoints Principales

#### Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/register` | Registrar vendedor (temporal) |
| POST | `/auth/logout` | Cerrar sesión |

#### Perfil
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/profile` | Obtener mi perfil |
| PUT | `/profile/status` | Cambiar estado (AVAILABLE/BUSY/OFFLINE) |

#### Conversaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/conversations/waiting` | Conversaciones en espera |
| GET | `/conversations/mine` | Mis conversaciones |
| GET | `/conversations/:id` | Detalle con mensajes |
| POST | `/conversations/:id/assign` | Tomar conversación |
| POST | `/conversations/:id/resolve` | Marcar como resuelta |
| POST | `/conversations/:id/transfer-bot` | Devolver al bot |
| POST | `/conversations/:id/messages` | Enviar mensaje |

---

## Estructura de Datos

### Usuario Autenticado
```typescript
interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SELLER' | 'MANAGER' | 'ZONE_SUPERVISOR' | 'REGIONAL_MANAGER';
  storeId?: string;      // Reino asignado (null para zonales/gerencia)
  zoneId?: string;       // Zona asignada (solo zonales)
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  maxConversations: number;
  activeConversations: number;
}
```

### Conversación
```typescript
interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerWaId: string;        // Número de WhatsApp
  status: 'BOT' | 'WAITING' | 'ASSIGNED' | 'RESOLVED';
  storeId: string;
  storeName: string;
  lastMessage: string;
  lastMessageAt: string;       // ISO date
  startedAt: string;
  unreadCount: number;
  // Datos del flujo (qué pidió el cliente)
  flowType?: 'quotation' | 'support' | 'info';
  flowData?: {
    category?: string;         // Categoría de producto
    details?: string;          // Detalles del pedido
    quantity?: string;         // Cantidad
    selectedZone?: string;     // Zona seleccionada
  };
}
```

### Mensaje
```typescript
interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LOCATION' | 'INTERACTIVE';
  direction: 'INBOUND' | 'OUTBOUND';
  sentByBot: boolean;
  sentByAgentId?: string;
  createdAt: string;
}
```

---

## Consideraciones Técnicas

### Stack Recomendado
- **Framework**: Next.js 14+ o React + Vite
- **State Management**: Zustand o React Query
- **UI**: Tailwind CSS + shadcn/ui
- **Real-time**: Socket.io (a implementar en backend) o polling

### Autenticación
- Guardar token en localStorage o httpOnly cookie
- Interceptor de Axios para agregar header Authorization
- Redirect a login si 401

### Responsive
- Mobile-first (vendedores usan desde el celular)
- Diseño tipo WhatsApp Web para desktop

---

## Fases Futuras

### Fase 2: Supervisión
- Dashboard para encargados con métricas
- Ver conversaciones de vendedores del Reino
- Reasignar conversaciones entre vendedores

### Fase 3: Gestión Zonal
- Vista de todos los Reinos de la zona
- Métricas comparativas entre Reinos
- Alertas de conversaciones sin atender

### Fase 4: Gerencia
- Dashboard ejecutivo
- Métricas globales
- Exportación de reportes

---

## Ejemplo de Flujo de Usuario

```
1. Vendedor abre la app
2. Login con email/password
3. Ve dashboard con:
   - 3 conversaciones en espera
   - 2 conversaciones activas suyas
4. Toca "Tomar" en una conversación en espera
5. Se abre el chat con historial de mensajes
6. Ve que el cliente quiere "Cerámico 40x40, 50m², zona Belgrano"
7. Escribe: "Hola María! Te paso la cotización..."
8. El mensaje llega al WhatsApp del cliente
9. Cuando termina, toca "Resolver"
10. La conversación pasa a RESOLVED
```

---

## Notas Importantes

1. **Un solo número de WhatsApp**: Todos los vendedores responden desde el mismo número de la empresa. El cliente no sabe quién lo atiende internamente.

2. **Arquitectura preparada para microservicios**: El auth actual es local pero está diseñado para migrar a un microservicio centralizado.

3. **Sin IA por ahora**: La detección de intenciones es por keywords. El flujo es determinístico.

4. **24 Reinos**: Las tiendas van del 1 al 24, pero NO existe el Reino 13.
