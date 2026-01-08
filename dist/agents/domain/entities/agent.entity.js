"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    id;
    storeId;
    zoneId;
    role;
    name;
    waId;
    email;
    password;
    status;
    maxConversations;
    activeConversations;
    lastLoginAt;
    createdAt;
    updatedAt;
    constructor(props) {
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
    isAvailable() {
        return this.status === "AVAILABLE" && this.activeConversations < this.maxConversations;
    }
    isOnline() {
        return this.status !== "OFFLINE";
    }
    canAcceptConversation() {
        return this.isAvailable();
    }
    // Métodos de autorización por rol
    isSeller() {
        return this.role === "SELLER";
    }
    isManager() {
        return this.role === "MANAGER";
    }
    isZoneSupervisor() {
        return this.role === "ZONE_SUPERVISOR";
    }
    isRegionalManager() {
        return this.role === "REGIONAL_MANAGER";
    }
    /**
     * Verifica si el agente puede ver conversaciones de una tienda específica
     */
    canAccessStore(storeId, storeZoneId) {
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
    canAccessConversation(conversationStoreId, conversationAgentId, storeZoneId) {
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
    canSupervise(targetAgent) {
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
exports.Agent = Agent;
