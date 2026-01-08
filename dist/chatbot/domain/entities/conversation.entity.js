"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
class Conversation {
    id;
    customerId;
    agentId;
    storeId;
    status;
    context;
    startedAt;
    resolvedAt;
    updatedAt;
    // Campos de flujo
    flowType;
    flowStep;
    flowData;
    flowStartedAt;
    constructor(props) {
        this.id = props.id;
        this.customerId = props.customerId;
        this.agentId = props.agentId;
        this.storeId = props.storeId;
        this.status = props.status;
        this.context = props.context;
        this.startedAt = props.startedAt;
        this.resolvedAt = props.resolvedAt;
        this.updatedAt = props.updatedAt;
        // Campos de flujo
        this.flowType = props.flowType;
        this.flowStep = props.flowStep;
        this.flowData = props.flowData;
        this.flowStartedAt = props.flowStartedAt;
    }
    static createNew(customerId) {
        return new Conversation({
            customerId,
            status: "BOT",
        });
    }
    isHandledByBot() {
        return this.status === "BOT";
    }
    isHandledByAgent() {
        return this.status === "ASSIGNED";
    }
    isWaitingForAgent() {
        return this.status === "WAITING";
    }
    isResolved() {
        return this.status === "RESOLVED";
    }
    // Métodos de flujo
    hasActiveFlow() {
        return this.flowType !== null && this.flowType !== undefined && this.flowStep !== null;
    }
    isInFlow(flowType) {
        return this.flowType === flowType;
    }
    getFlowData() {
        return this.flowData;
    }
}
exports.Conversation = Conversation;
