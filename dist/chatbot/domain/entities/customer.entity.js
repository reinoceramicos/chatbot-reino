"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Customer = void 0;
class Customer {
    id;
    waId;
    name;
    phone;
    email;
    createdAt;
    updatedAt;
    constructor(props) {
        this.id = props.id;
        this.waId = props.waId;
        this.name = props.name;
        this.phone = props.phone;
        this.email = props.email;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(waId, name) {
        return new Customer({ waId, name });
    }
}
exports.Customer = Customer;
