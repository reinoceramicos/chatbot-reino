export type AgentStatus = "AVAILABLE" | "BUSY" | "OFFLINE";
export type AgentRole = "SELLER" | "MANAGER" | "ZONE_SUPERVISOR" | "REGIONAL_MANAGER";

export interface AgentProps {
  id?: string;
  storeId?: string;
  zoneId?: string;
  role: AgentRole;
  name: string;
  waId?: string;
  email?: string;
  password?: string;
  status: AgentStatus;
  maxConversations: number;
  activeConversations: number;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Agent {
  readonly id?: string;
  readonly storeId?: string;
  readonly zoneId?: string;
  readonly role: AgentRole;
  readonly name: string;
  readonly waId?: string;
  readonly email?: string;
  readonly password?: string;
  readonly status: AgentStatus;
  readonly maxConversations: number;
  readonly activeConversations: number;
  readonly lastLoginAt?: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: AgentProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.zoneId = props.zoneId;
    this.role = props.role;
    this.name = props.name;
    this.waId = props.waId;
    this.email = props.email;
    this.password = props.password;
    this.status = props.status;
    this.maxConversations = props.maxConversations;
    this.activeConversations = props.activeConversations;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isAvailable(): boolean {
    return this.status === "AVAILABLE" && this.activeConversations < this.maxConversations;
  }

  isOnline(): boolean {
    return this.status !== "OFFLINE";
  }

  canAcceptConversation(): boolean {
    return this.isAvailable();
  }

  // Métodos de autorización por rol
  isSeller(): boolean {
    return this.role === "SELLER";
  }

  isManager(): boolean {
    return this.role === "MANAGER";
  }

  isZoneSupervisor(): boolean {
    return this.role === "ZONE_SUPERVISOR";
  }

  isRegionalManager(): boolean {
    return this.role === "REGIONAL_MANAGER";
  }

  /**
   * Verifica si el agente puede ver conversaciones de una tienda específica
   */
  canAccessStore(storeId: string, storeZoneId?: string): boolean {
    switch (this.role) {
      case "REGIONAL_MANAGER":
        // Gerencia ve todo
        return true;
      case "ZONE_SUPERVISOR":
        // Zonal ve todas las tiendas de su zona
        return this.zoneId === storeZoneId;
      case "MANAGER":
      case "SELLER":
        // Encargado y vendedor solo ven su tienda
        return this.storeId === storeId;
      default:
        return false;
    }
  }

  /**
   * Verifica si el agente puede ver una conversación específica
   */
  canAccessConversation(conversationStoreId: string, conversationAgentId?: string, storeZoneId?: string): boolean {
    switch (this.role) {
      case "REGIONAL_MANAGER":
        // Gerencia ve todo
        return true;
      case "ZONE_SUPERVISOR":
        // Zonal ve todas las conversaciones de su zona
        return this.zoneId === storeZoneId;
      case "MANAGER":
        // Encargado ve todas las conversaciones de su tienda
        return this.storeId === conversationStoreId;
      case "SELLER":
        // Vendedor solo ve sus propias conversaciones
        return this.id === conversationAgentId;
      default:
        return false;
    }
  }

  /**
   * Verifica si el agente puede supervisar a otro agente
   */
  canSupervise(targetAgent: Agent): boolean {
    switch (this.role) {
      case "REGIONAL_MANAGER":
        return true;
      case "ZONE_SUPERVISOR":
        return targetAgent.zoneId === this.zoneId || targetAgent.storeId !== undefined;
      case "MANAGER":
        return targetAgent.storeId === this.storeId && targetAgent.role === "SELLER";
      default:
        return false;
    }
  }
}
